require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

const BASE = 'https://www.afl.com.au';
const API_BASE = process.env.API_BASE;

    (async () => {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        try {
            const email = process.env.API_USERNAME;
            const password = process.env.API_PASSWORD;
            if (!email || !password) throw new Error("Missing credentials");
            const loginRes = await axios.post(`${API_BASE}/users/login`, { email, password });
            const cookieHeader = loginRes.headers['set-cookie']?.join('; ');
            if (cookieHeader) {
                axios.defaults.headers.Cookie = cookieHeader;
            } else {
                throw new Error('Login did not return cookies');
            }


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
                    console.log(`Uploaded team: ${teamMeta.name}`);
                } catch (err) {
                    console.error(`Failed to upload team: ${teamMeta.name}`, err.response?.data || err.message);
                }

                try {
                    await axios.post(`${API_BASE}/api/athletes/link`, {
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
                        const toAbsolute = (src) => {
                            if (!src) return null;
                            try {
                                return new URL(src, window.location.href).href;
                            } catch (_) {
                                return src;
                            }
                        };
                        const pickImage = () => {
                            const metaTags = [
                                'meta[property="og:image"]',
                                'meta[name="twitter:image"]',
                                'meta[itemprop="image"]',
                                'link[rel="image_src"]'
                            ];
                            for (const sel of metaTags) {
                                const c = document.querySelector(sel)?.content;
                                if (c) return toAbsolute(c);
                            }
                            const headshot = document.querySelector('img[src*="headshot" i], img[src*="playerhead" i]');
                            if (headshot) return toAbsolute(headshot.getAttribute('src') || headshot.getAttribute('data-src'));
                            const hero = document.querySelector('.hero-media__image img, img.hero-media__image');
                            if (hero) return toAbsolute(hero.getAttribute('src') || hero.getAttribute('data-src'));
                            const pictureImg = document.querySelector('picture img');
                            if (pictureImg) return toAbsolute(pictureImg.getAttribute('src') || pictureImg.getAttribute('data-src'));
                            const img = document.querySelector('img');
                            return img ? toAbsolute(img.getAttribute('src') || img.getAttribute('data-src')) : null;
                        };

                        const nameBlock = document.querySelector('p.stats-player-header__name');
                        const name = nameBlock ? nameBlock.textContent.replace(/\s+/g, ' ').trim() : null;
                        const imageProfile = pickImage();
                        const dob = Array.from(document.querySelectorAll('.pp-bio-stats__stat-value'))
                            .find(el => /\d{1,2} \w+ \d{4}/.test(el.textContent))?.textContent.trim();
                        const birthDate = dob ? new Date(dob).toISOString().split('T')[0] : null;
                        const positionLabel = Array.from(document.querySelectorAll('.pp-bio-stats__stat-label')).find(el => el.textContent.toLowerCase().includes('position'));
                        const position = positionLabel?.nextElementSibling?.textContent.trim() || null;
                        return name ? { name, imageProfile, birthDate, position } : null;
                    });

                    if (!athlete) continue;

                    const athletePayload = {
                        name: athlete.name,
                        profileImage: athlete.profileImage,
                        birthDate: athlete.birthDate,
                        position: athlete.position,
                        sport: 'Football',
                        nationality: '',
                        gender: 'Female',
                        roles: ['athlete']
                    };

                    try {
                        const res = await axios.get(`${API_BASE}/api/athletes/search`, {
                            params: { query: athlete.name, sport: athletePayload.sport },
                            withCredentials: true
                        });

                        const exists = res.data?.players?.some(p => p.name.toLowerCase() === athlete.name.toLowerCase());
                        if (exists) {
                            console.log(`Already exists: ${athlete.name}`);
                            continue;
                        }

                        await axios.post(`${API_BASE}/api/athletes/`, athletePayload, {
                            headers: { 'Content-Type': 'application/json' },
                            withCredentials: true
                        });
                        console.log(`✅ Uploaded: ${athlete.name}`);

                        await axios.post(`${API_BASE}/api/athletes/link`, {
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
