require('dotenv').config();
const { Cluster } = require('puppeteer-cluster');
const axios = require('axios');

const BASE_URL = 'https://www.wnba.com';
const PLAYERS_URL = `${BASE_URL}/players?team=all&position=all&show-historic-players=false`;
const STATS_API = 'https://stats.wnba.com/stats';
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

const STATS_HEADERS = {
    'Connection': 'keep-alive',
    'Accept': 'application/json, text/plain, */*',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://www.wnba.com',
    'Origin': 'https://www.wnba.com',
};

(async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 3,
        puppeteerOptions: { headless: true }
    });

    const linkedTeams = new Set();

    await cluster.task(async ({ page, data }) => {
        if (data.type === 'getPlayers') {
            console.log('➡️  Visiting directory:', PLAYERS_URL);
            await page.goto(PLAYERS_URL, { waitUntil: 'networkidle2' });
            await page.waitForSelector('div._PlayerTile_1ixf3_5', { timeout: 15000 });

            const players = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('div._PlayerTile_1ixf3_5')).map(tile => {
                    const linkEl = tile.querySelector('a._PlayerTile__playerLink_1ixf3_60');
                    const href = linkEl.getAttribute('href');
                    const url = new URL(href, location.origin).href;
                    const personId = href.split('/').pop();
                    const name = linkEl.querySelector('p')?.textContent.trim() || '';
                    const spanText = tile.querySelector('._PlayerTile__info_1ixf3_39 span')
                        ?.textContent
                        .trim() || '';
                    const parts = spanText.split('•').map(s => s.replace('#', '').trim());
                    const position = parts[1] || '';

                    const organisationName = tile.querySelector('._PlayerTile__organisationName_1ixf3_71 ._organisationName__name_1k5qz_11')
                        ?.textContent
                        .trim() || '';
                    const country = tile.querySelector('._PlayerTile__country_1ixf3_139 dd')
                        ?.textContent
                        .trim() || '';
                    const photoEl = tile.querySelector('img[alt$="headshot"]') || tile.querySelector('img[src*="cdn.wnba.com/headshots"]');
                    const profileImage = photoEl?.src?.trim() || null;
                    return { personId, name, url, organisationName, position, country, image };
                });
            });

            console.log(`✔️  Found ${players.length} players`);
            for (const p of players) {
                await cluster.queue({ type: 'processPlayer', player: p });
            }

        } else if (data.type === 'processPlayer') {
            const { personId, name, url, organisationName, position, country } = data.player;
            console.log(`Processing ${name} (${personId})`);

            let birthDate = null, nationality = country;
            try {
                const infoRes = await axios.get(
                    `${STATS_API}/commonplayerinfo?LeagueID=10&PlayerID=${personId}`,
                    { headers: STATS_HEADERS }
                );
                const infoSet = infoRes.data.resultSets.find(rs => rs.name === 'CommonPlayerInfo');
                if (infoSet?.rowSet?.length) {
                    const info = {};
                    infoSet.headers.forEach((h, i) => info[h] = infoSet.rowSet[0][i]);
                    if (info.BIRTHDATE) {
                        birthDate = new Date(info.BIRTHDATE).toISOString().split('T')[0];
                    }
                    if (info.COUNTRY) {
                        nationality = info.COUNTRY.trim();
                    }
                }
            } catch (err) {
                console.warn(`Failed stats API for ${name}:`, err.message);
            }

            const payload = {
                name,
                sport: 'Basketball',
                nationality,
                gender: 'Female',
                roles: ['athlete'],
                primaryRole: 'athlete',
                birthDate,
                position,
                profileImage
            };

            console.log('Uploading athlete:', payload);
            let exists = false;
            try {
                const search = await axios.get(`${API_BASE}/search`, {
                    params: { query: name, sport: 'Basketball' }
                });
                exists = search.data.players.some(p => p.name.toLowerCase() === name.toLowerCase());
            } catch (_) { }
            await axios.post(`${API_BASE}/athlete/create`, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            await axios.post(`${API_BASE}/team/link-athlete`, {
                athleteName: name,
                organisationName
            }, { headers: { 'Content-Type': 'application/json' } });
            console.log(`🔗  Linked ${name} → ${organisationName}`);

            if (!linkedTeams.has(organisationName)) {
                await axios.post(`${API_BASE}/team/link-league`, {
                    organisationName,
                    leagueName: 'WNBA'
                });
                await axios.post(`${API_BASE}/sport`, {
                    name: organisationName,
                    type: 'team',
                    sportName: 'Basketball'
                });
                linkedTeams.add(organisationName);
                console.log(`Linked ${organisationName} → WNBA & Basketball`);
            }
        }
    });

    await cluster.queue({ type: 'getPlayers' });
    await cluster.idle();
    await cluster.close();
    console.log('All done!');
})();
