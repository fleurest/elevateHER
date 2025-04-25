require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const axios = require('axios');

const BASE = 'https://www.lovb.com';
const API_BASE = 'http://localhost:3000/api';

const loginAndGetCookies = async (page) => {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

  const username = process.env.API_USERNAME;
  const password = process.env.API_PASSWORD;
  console.log("USERNAME:", process.env.API_USERNAME);
  console.log("PASSWORD:", process.env.API_PASSWORD ? '●●●●●●●' : 'undefined');

  if (!username || !password) {
    throw new Error("Missing API_USERNAME or API_PASSWORD in .env");
  }

  await page.type('input[name=username]', username);
  await page.type('input[name=password]', password);

  await page.click('button[type=submit]');

  if (!username || !password) {
    throw new Error("Missing API_USERNAME or API_PASSWORD in .env");
  }

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

      const teamMeta = await page.evaluate(() => {
        const name = document.querySelector('h1')?.textContent?.trim() || null;
        const description = document.querySelector('meta[name="description"]')?.content || '';
        const image = document.querySelector('img[src*="Team"]')?.src || null;

        return {
          name,
          alternateName: null,
          sport: "Volleyball",
          foundingDate: null,
          location: "United States",
          description,
          roles: ["team"],
          sameAs: window.location.href,
          image,
          imageLicense: "© League One Volleyball Inc. (LOVB)",
          imageCopyright: "League One Volleyball Inc. (LOVB)"
        };
      });

      // Upload team
      try {
        const teamRes = await axios.post(`${API_BASE}/team/upsert`, teamMeta, {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        });
        console.log(`Team uploaded: ${teamMeta.name}`);
      } catch (err) {
        console.error(`Failed to upload team '${teamMeta.name}':`, err.response?.data || err.message);
      }

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
          await axios.post(`${API_BASE}/team/link-athlete`, {
            athleteName: athlete.name,
            teamName: teamMeta.name,
            sport: teamMeta.sport,
            sportLabel: "Sport"
          }, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
          });

          console.log(`🔗 Linked ${athlete.name} to team '${teamMeta.name}' and sport '${teamMeta.sport}'`);
        } catch (err) {
          console.error(`❌ Failed to process ${athlete.name}:`, err.response?.data || err.message);
        }
      }
    }

    console.log('Finished scraping LOVB athletes');
  } catch (err) {
    console.error('Script failed:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
})();