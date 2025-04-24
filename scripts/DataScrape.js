require('dotenv').config();

const puppeteer = require('puppeteer');
const axios = require('axios');

const BASE = 'https://www.lovb.com';
const API_BASE = 'http://localhost:3000/api';

const loginAndGetCookies = async (page) => {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

  await page.type('input[name=username]', process.env.API_USERNAME);
  await page.type('input[name=password]', process.env.API_PASSWORD);
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

    await page.goto(`${BASE}/teams`, { waitUntil: 'networkidle2' });
    const teamUrls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href^="/teams/"]'));
      return Array.from(new Set(
        links.map(link => link.href).filter(href => href.includes('/teams/') && !href.includes('/athletes'))
      ));
    });

    console.log(`Found ${teamUrls.length} teams`);

    for (const teamUrl of teamUrls) {
      console.log(`Visiting team: ${teamUrl}`);
      await page.goto(teamUrl, { waitUntil: 'networkidle2' });

      const athleteUrls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/athletes/"]'));
        return Array.from(new Set(links.map(link => link.href)));
      });

      for (const athleteUrl of athleteUrls) {
        console.log(`Scraping athlete: ${athleteUrl}`);
        await page.goto(athleteUrl, { waitUntil: 'networkidle2' });

        const athlete = await page.evaluate(() => {
          const nameElem = document.querySelector('h1, div.font-display, div[class*="font-display"]');
          const name = nameElem ? nameElem.textContent.trim() : null;
        
          const imgElem = document.querySelector('img[src*="Headshot"]');
          const img = imgElem ? imgElem.src.trim() : null;

            return {
              name,
              sport: 'Volleyball',
              nationality: 'Unknown',
              gender: 'Female',
              roles: ['athlete'],
              primaryRole: 'athlete',
              birthDate: null,
              profileImage: img || null
            };
          });

          if (!athlete.name) {
            console.warn('Skipping unknown athlete at:', athleteUrl);
            continue;
          }

          try {
            // Check for existing
            const res = await axios.get(`${API_BASE}/search`, {
              params: { query: athlete.name, sport: athlete.sport },
              withCredentials: true
            });

            const exists = res.data?.players?.some(
              p => p.name.toLowerCase() === athlete.name.toLowerCase()
            );

            if (exists) {
              console.log(`Already exists: ${athlete.name}`);
              continue;
            }

            await axios.post(`${API_BASE}/athlete/create`, athlete, {
              headers: { 'Content-Type': 'application/json' },
              withCredentials: true
            });

            console.log(`✅ Uploaded: ${athlete.name}`);
          } catch (err) {
            console.error(`❌ Failed to upload ${athlete.name}:`, err.response?.data || err.message);
          }
        }
    }

      console.log('Finished scraping LOVB athletes');
    } catch (err) {
      console.error('Script failed:', err.message);
    } finally {
      await browser.close();
    }
  }) ();