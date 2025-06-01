require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const axios = require('axios');

const BASE = 'https://www.afl.com.au';
const API_BASE = process.env.API_BASE_URL;

const loginAndGetCookies = async (page) => {
    await page.goto(`${process.env.API_BASE}/login`, { waitUntil: 'networkidle2' });
    const username = process.env.API_USERNAME;
    const password = process.env.API_PASSWORD;
    if (!username || !password) throw new Error("Missing credentials");
    await page.type('input[name=username]', username);
    await page.type('input[name=password]', password);
    await page.click('button[type=submit]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const cookies = await page.cookies();
    return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
};

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        const cookieHeader = await loginAndGetCookies(page);
        axios.defaults.headers.Cookie = cookieHeader;

        await page.goto(`${BASE}/aflw/teams`, { waitUntil: 'networkidle2' });
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await new Promise(resolve => setTimeout(resolve, 2000));

        const teamEntries = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a.promo-grid__link')).map(el => {
                const name = el.querySelector('h3.promo-grid__promo-title')?.textContent.trim();
                const image = el.querySelector('img')?.src || null;
                const url = el.href;
                return { name, image, url };
            }).filter(t => t.name && t.image && t.url);
        });

        console.log(`Found ${teamEntries.length} AFLW teams`);

        for (const { url: teamUrl, name, image } of teamEntries) {
            console.log(`Visiting team: ${teamUrl}`);
            await page.goto(teamUrl, { waitUntil: 'networkidle2' });
            
            const teamMeta = {
                name,
                alternateName: null,
                sport: "Football",
                foundingDate: null,
                location: null,
                description: `AFLW team page`,
                roles: ["team"],
                sameAs: teamUrl,
                image,
                imageLicense: "© AFL.",
                imageCopyright: "Australian Football League (AFL)"
            };

            try {
                await axios.post(`${API_BASE}/api/organisation/`, teamMeta, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });
                console.log(`✅ Uploaded team: ${teamMeta.name}`);
            } catch (err) {
                console.error(`❌ Failed to upload team: ${teamMeta.name}`, err.response?.data || err.message);
            }

            try {
                await axios.post(`${API_BASE}/api/athlete/link`, {
                    athleteName: teamMeta.name,
                    organisationName: teamMeta.name,
                    sport: "Australian Rules Football",
                    sportLabel: "Sport"
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });
                console.log(`🔗 Linked team '${teamMeta.name}' to Australian Rules Football`);
            } catch (err) {
                console.error(`❌ Failed to link team '${teamMeta.name}' to sport hierarchy`, err.response?.data || err.message);
            }
            
            console.log(`Locating players on: ${teamUrl}`); 
            await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
            await new Promise(resolve => setTimeout(resolve, 3000));

            await page.waitForSelector('.player-grid__player-card', { timeout: 20000 });

            const playerUrls = await page.evaluate(() => {
              return Array.from(document.querySelectorAll('.player-grid__player-card')).map(link => link.href);
            });

            console.log(`Found ${playerUrls.length} players for ${teamMeta.name}`);



            for (const playerUrl of playerUrls) {
                console.log(`Scraping player: ${playerUrl}`);
                await page.goto(playerUrl, { waitUntil: 'networkidle2' });

                const athlete = await page.evaluate(() => {
                    const nameBlock = document.querySelector('p.stats-player-header__name');
                    const name = nameBlock ? nameBlock.textContent.replace(/\s+/g, ' ').trim() : null;
                    const profileImage = document.querySelector('img')?.src || null;
                    const dob = Array.from(document.querySelectorAll('.pp-bio-stats__stat-value'))
                        .find(el => /\d{1,2} \w+ \d{4}/.test(el.textContent))?.textContent.trim();
                    const birthDate = dob ? new Date(dob).toISOString().split('T')[0] : null;
                    const positionLabel = Array.from(document.querySelectorAll('.pp-bio-stats__stat-label')).find(el => el.textContent.toLowerCase().includes('position'));
                    const position = positionLabel?.nextElementSibling?.textContent.trim() || null;
                    return name ? { name, profileImage, birthDate, position } : null;
                  });

                if (!athlete) continue;

                const athletePayload = {
                    ...athlete,
                    sport: 'Football',
                    nationality: '',
                    gender: 'Female',
                    roles: ['athlete'],
                    primaryRole: 'athlete'
                };

                try {
                    const res = await axios.get(`${API_BASE}/athlete/search`, {
                        params: { query: athlete.name, sport: athlete.sport },
                        withCredentials: true
                    });

                    const exists = res.data?.players?.some(p => p.name.toLowerCase() === athlete.name.toLowerCase());
                    if (exists) {
                        console.log(`Already exists: ${athlete.name}`);
                        continue;
                    }

                    await axios.post(`${API_BASE}/api/athlete/`, athletePayload, {
                        headers: { 'Content-Type': 'application/json' },
                        withCredentials: true
                    });
                    console.log(`✅ Uploaded: ${athlete.name}`);

                    await axios.post(`${API_BASE}/api/athlete/link`, {
                        athleteName: athlete.name,
                        organisationName: teamMeta.name,
                        sport: teamMeta.sport,
                        sportLabel: "Sport"
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        withCredentials: true
                    });

                    console.log(`🔗 Linked ${athlete.name} to ${teamMeta.name}`);
                } catch (err) {
                    console.error(`❌ Error processing ${athlete?.name || 'unknown player'}:`, err.response?.data || err.message);
                }
            }
        }

        console.log('🎉 Finished scraping AFLW athletes');
    } catch (err) {
        console.error('Script failed:', err.message);
        console.error(err.stack);
    } finally {
        await browser.close();
    }
})();
