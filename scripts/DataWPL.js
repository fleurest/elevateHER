require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Cluster } = require('puppeteer-cluster');
const axios = require('axios');

const BASE = 'https://www.wplt20.com';
const API_BASE = 'http://localhost:3000/api';

(async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 3,
        puppeteerOptions: { headless: true }
    });

    const linkedTeams = new Set();

    await cluster.task(async ({ page, data: { url, type, meta } }) => {
        console.log('Task type:', type);

        if (type === 'main') {
            console.log(`Visiting main page: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });

            await page.waitForSelector('div.card-item', { timeout: 15000 });

            const teams = await page.evaluate(() =>
                Array.from(document.querySelectorAll('div.card-item')).map(card => {
                    const fname = card.querySelector('.card-name .fname')?.textContent.trim() || '';
                    const lname = card.querySelector('.card-name .lname')?.textContent.trim() || '';
                    const name = `${fname} ${lname}`.trim();
                    const squadLink = card.querySelector('div.card-footer a.view-more')?.getAttribute('href')?.trim();
                    return squadLink ? { name, url: squadLink } : null;
                }).filter(Boolean)
            );

            console.log(`Found ${teams.length} teams.`);

            for (const { name, url: relativeUrl } of teams) {
                const teamUrl = `${BASE}${relativeUrl}`;
                console.log(`Queueing team: ${name} -> ${teamUrl}`);
                await cluster.queue({
                    url: teamUrl,
                    type: 'team',
                    meta: { teamName: name }
                });
            }

        } else if (type === 'team') {
            console.log(`Visiting team squad page: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });

            await page.waitForSelector('div.card-action a.view-more', { timeout: 15000 });

            const playerLinks = await page.evaluate(() =>
                Array.from(document.querySelectorAll('div.card-action a.view-more')).map(link => ({
                    name: link.getAttribute('data-name')?.trim(),
                    url: link.getAttribute('href')?.trim()
                }))
            );

            console.log(`Found ${playerLinks.length} players for ${meta.teamName}`);

            for (const { name, url: playerUrl } of playerLinks) {
                if (!playerUrl) continue;
                const fullPlayerUrl = `${BASE}${playerUrl}`;
                await cluster.queue({ url: fullPlayerUrl, type: 'player', meta: { ...meta, playerName: name } });
            }

        } else if (type === 'player') {
            console.log(`Scraping player: ${url}`);
            
            let existingPlayer = null;
        
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded' });
                await page.waitForSelector('#playerMore', { timeout: 15000 });
        
                const player = await page.evaluate(() => {
                    const firstName = document.querySelector('#playerMore .first-name')?.textContent.trim() || '';
                    const lastName = document.querySelector('#playerMore .last-name')?.textContent.trim() || '';
                    const name = `${firstName} ${lastName}`.trim();
                    const position = document.querySelector('#playerMore .player-role .role')?.textContent.trim() || '';
                    const nationality = document.querySelector('#playerMore .player-country .country-name')?.textContent.trim() || '';
                    const dobText = document.querySelector('#playerMore .player-meta-item.born .player-meta-value')?.textContent.trim() || null;
                    const birthDate = dobText ? new Date(dobText).toISOString().split('T')[0] : null;
                    const profileImage = document.querySelector('#playerMore .player-thumbnail img')?.src || null;
                    return { name, birthDate, nationality, position, profileImage };
                });
        
                if (!player.name) {
                    console.log(`Skipping player with no name: ${url}`);
                    return;
                }
        
                const payload = {
                    name: player.name,
                    sport: 'Cricket',
                    nationality: player.nationality || '',
                    gender: 'Female',
                    roles: ['athlete'],
                    primaryRole: 'athlete',
                    birthDate: player.birthDate,
                    profileImage: player.profileImage,
                    position: player.position
                };
        
                console.log('Uploading:', payload);
        
                await new Promise(resolve => setTimeout(resolve, 500));
        
                try {
                    const res = await axios.get(`${API_BASE}/search`, {
                        params: { query: player.name, sport: 'Cricket' },
                        withCredentials: true,
                        timeout: 5000
                    });
                    existingPlayer = res.data?.players?.find(p => p.name.toLowerCase() === player.name.toLowerCase());
                } catch (searchErr) {
                    console.error(`Search failed for ${player.name}:`, searchErr.response?.status, searchErr.response?.data || searchErr.message);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
        
                await axios.post(`${API_BASE}/athlete/create`, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });
        
                if (!existingPlayer) {
                    console.log(`Created athlete: ${player.name}`);
                } else {
                    console.log(`Updated athlete if necessary: ${player.name}`);
                }
        
                await axios.post(`${API_BASE}/team/link-athlete`, {
                    athleteName: player.name,
                    teamName: meta.teamName
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });
    
                console.log(`Linked ${player.name} -> ${meta.teamName}`);
        
                await axios.post(`${API_BASE}/link-to-sport`, {
                    name: player.name,
                    type: 'athlete',
                    sportName: 'Cricket'
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });
        
                console.log(`Linked athlete ${player.name} -> Cricket`);
        
                if (!linkedTeams.has(meta.teamName)) {
                    await axios.post(`${API_BASE}/team/link-league`, {
                        teamName: meta.teamName,
                        leagueName: "Women's Premier League (Cricket)"
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        withCredentials: true
                    });
        
                    console.log(`Linked ${meta.teamName} -> Women's Premier League (Cricket)`);
        
                    await axios.post(`${API_BASE}/link-to-sport`, {
                        name: meta.teamName,
                        type: 'team',
                        sportName: 'Cricket'
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        withCredentials: true
                    });
        
                    console.log(`Linked ${meta.teamName} (team) -> Cricket`);
                    linkedTeams.add(meta.teamName);
                }
        
            } catch (err) {
                console.error(`❌ Error processing player ${meta.playerName}:`, err.response?.status, err.response?.data || err.message);
            }
        }
        
    });

    await cluster.queue({
        url: `${BASE}/teams`,
        type: 'main',
        meta: {}
    });

    await cluster.idle();
    await cluster.close();

    console.log('🎉 Finished scraping WPL teams and players');
})();