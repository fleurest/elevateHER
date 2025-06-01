require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const axios = require('axios');

const WIKI_BASE = 'https://en.wikipedia.org';
const WIKI_PATH = '/wiki/Ireland_women%27s_national_rugby_union_team';
const AUTH_BASE = 'http://localhost:3000';
const API_BASE = `${AUTH_BASE}/api`;

const loginAndGetCookies = async (page) => {
  await page.goto(`${AUTH_BASE}/login`, { waitUntil: 'networkidle2' });
  const username = process.env.API_USERNAME;
  const password = process.env.API_PASSWORD;
  if (!username || !password) throw new Error('Missing credentials');
  await page.type('input[name="username"]', username);
  await page.type('input[name="password"]', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  const cookies = await page.cookies();
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
};

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const cookieHeader = await loginAndGetCookies(page);
    axios.defaults.headers.Cookie = cookieHeader;

    await page.goto(`${WIKI_BASE}${WIKI_PATH}`, { waitUntil: 'networkidle2' });

    const teamMeta = await page.evaluate(() => {
      const infobox = document.querySelector('.infobox');
      const getField = label => {
        const row = Array.from(infobox.querySelectorAll('tr')).find(tr =>
          tr.querySelector('th')?.textContent.trim() === label
        );
        return row ? row.querySelector('td')?.textContent.trim() : null;
      };
      const name = document.querySelector('#firstHeading')?.textContent.trim();
      const logo = infobox.querySelector('img')?.src || null;
      const foundedRaw = getField('Founded') || getField('Foundation');
      let foundingDate = null;
      if (foundedRaw) {
        const match = foundedRaw.match(/\d{1,2} \w+ \d{4}/);
        if (match) foundingDate = new Date(match[0]).toISOString().split('T')[0];
      }
      const country = getField('Country') || 'Ireland';
      const description = document.querySelector('p')?.textContent.trim() || '';
      return {
        name,
        alternateName: null,
        sport: 'Rugby union',
        foundingDate,
        location: country,
        description,
        sameAs: window.location.href,
        image: logo,
        imageLicense: null,
        imageCopyright: null,
        roles: ['team'],
      };
    });

    if (!teamMeta.location) teamMeta.location = 'Ireland';

    try {
      await axios.post(
        `${API_BASE}/team/upsert`,
        teamMeta,
        { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
      );
      console.log(`Uploaded team: ${teamMeta.name}`);
    } catch (err) {
      console.error('Failed to upsert team:', err.response?.data || err.message);
      console.error('Payload:', teamMeta);
      throw err;
    }

    try {
      await axios.post(
        `${API_BASE}/team/link-athlete`,
        {
          athleteName: teamMeta.name,
          organisationName: teamMeta.name,
          sport: teamMeta.sport,
          sportLabel: 'Sport'
        },
        { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
      );
      console.log(`Linked team '${teamMeta.name}' to ${teamMeta.sport}`);
    } catch (err) {
      console.error('Failed to link team to sport:', err.response?.data || err.message);
      throw err;
    }

    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));

    const playerUrls = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('table.wikitable a'));
      return Array.from(new Set(
        anchors.map(a => a.href).filter(href => href.includes('/wiki/'))
      ));
    });
    console.log(`Found ${playerUrls.length} player URLs`);

    for (const playerUrl of playerUrls) {
      console.log(`Scraping player: ${playerUrl}`);
      await page.goto(playerUrl, { waitUntil: 'networkidle2' });
      const athlete = await page.evaluate(() => {
        const name = document.querySelector('#firstHeading')?.textContent.trim();
        const infobox = document.querySelector('.infobox.vcard');
        if (!name || !infobox) return null;
        const img = infobox.querySelector('img')?.src || null;
        const getField = label => {
          const row = Array.from(infobox.querySelectorAll('tr')).find(tr =>
            tr.querySelector('th')?.textContent.trim() === label
          );
          return row ? row.querySelector('td')?.textContent.trim() : null;
        };
        const dobRaw = getField('Born');
        let birthDate = null;
        if (dobRaw) {
          const m = dobRaw.match(/\d{1,2} \w+ \d{4}/);
          if (m) birthDate = new Date(m[0]).toISOString().split('T')[0];
        }
        const position = getField('Position') || null;
        return { name, profileImage: img, birthDate, position };
      });
      if (!athlete) continue;
      athlete.nationality = 'Ireland';
      const athletePayload = {
        name: athlete.name,
        profileImage: athlete.profileImage,
        dateOfBirth: athlete.birthDate,
        position: athlete.position,
        sport: 'Rugby Union',
        nationality: athlete.nationality,
        gender: 'Female',
        roles: ['athlete'],
        primaryRole: 'athlete'
      };

      try {
        const searchRes = await axios.get(
          `${API_BASE}/search`,
          { params: { query: athlete.name, sport: athletePayload.sport }, withCredentials: true }
        );
        const exists = searchRes.data?.players?.some(p => p.name.toLowerCase() === athlete.name.toLowerCase());
        if (exists) {
          console.log(`Already exists: ${athlete.name}`);
          continue;
        }
        await axios.post(
          `${API_BASE}/athlete/create`,
          athletePayload,
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );
        console.log(`Uploaded: ${athlete.name}`);
        await axios.post(
          `${API_BASE}/team/link-athlete`,
          { athleteName: athlete.name, organisationName: teamMeta.name, sport: teamMeta.sport, sportLabel: 'Sport' },
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );
        console.log(`Linked ${athlete.name} to ${teamMeta.name}`);
      } catch (err) {
        console.error(`Error processing ${athlete.name}:`, err.response?.data || err.message);
      }
    }

    console.log('🎉 Finished scraping players');
  } catch (err) {
    console.error('Script failed:', err.response?.data || err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
})();
