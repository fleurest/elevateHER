require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const axios = require('axios');

const TEAM_URL = 'https://www.sixnationsrugby.com/en/w6n/teams/england-women';
const AUTH_BASE = 'http://localhost:3000';
const API_BASE = `${AUTH_BASE}/api`;

async function loginAndGetCookies(page) {
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
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Authenticate and set axios cookies
    const cookieHeader = await loginAndGetCookies(page);
    axios.defaults.headers.Cookie = cookieHeader;

    await page.goto(TEAM_URL, { waitUntil: 'domcontentloaded' });

    const fullTitle = await page.title();
    const teamName = fullTitle.split(' - ')[0].trim();

    const competitions = await page.evaluate(() => {
      const list = [];
      const headings = document.querySelectorAll('h2');
      for (const h of headings) {
        if (h.textContent.trim() === 'Competitions') {
          let el = h.nextElementSibling;
          while (el && el.tagName !== 'UL') el = el.nextElementSibling;
          if (!el) break;
          for (const li of el.querySelectorAll('li')) {
            list.push(li.textContent.trim());
          }
          break;
        }
      }
      return list;
    });

    try {
      await axios.post(
        `${API_BASE}/team/upsert`,
        { name: teamName, sport: 'Rugby Union', roles: ['team'], location: 'England' },
        { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
      );
      console.log(`✅ Upserted team: ${teamName}`);
    } catch (e) {
      console.warn(`Team upsert skipped: ${e.response?.data || e.message}`);
    }

    try {
      await axios.post(
        `${API_BASE}/link-to-sport`,
        { name: teamName, type: 'team', sportName: 'Rugby Union' },
        { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
      );
      console.log(`🔗 Linked team '${teamName}' to Rugby Union`);
    } catch (e) {
      console.warn(`Link to sport skipped: ${e.response?.data || e.message}`);
    }

    for (const comp of competitions) {
      try {
        await axios.post(
          `${API_BASE}/team/link-league`,
          { teamName, leagueName: comp },
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );
        console.log(`🔗 Linked team '${teamName}' to competition '${comp}'`);
      } catch (e) {
        console.warn(`Link team->competition skipped for ${comp}: ${e.response?.data || e.message}`);
      }
    }

    const players = await page.evaluate(() => {
      const raw = [];
      const headings = Array.from(document.querySelectorAll('h2'));
      for (const h of headings) {
        const section = h.textContent.trim();
        if (section === 'Competitions' || section === 'Useful Links') break;
        let el = h.nextElementSibling;
        while (el && el.tagName !== 'UL') el = el.nextElementSibling;
        if (!el) continue;
        for (const li of Array.from(el.querySelectorAll('li'))) {
          let nameText = li.textContent.trim().replace(/\s+/g, ' ');
          nameText = nameText.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
          let image = '';
          const imgEl = li.querySelector('div[data-testid="profile-block__image"] img');
          if (imgEl?.src) image = imgEl.src.trim();
          else if (imgEl?.srcset) image = imgEl.srcset.split(',')[0].split(' ')[0].trim();
          raw.push({ name: nameText, image, position: section });
        }
      }
      
      const map = new Map();
      raw.forEach(p => { if (!map.has(p.name)) map.set(p.name, p); });
      return Array.from(map.values());
    });

    console.log(`Found ${players.length} players`);

    for (const { name: playerName, image: profileImage, position } of players) {
      console.log(`Processing player: ${playerName} as ${position}`);
      const athletePayload = {
        name: playerName,
        sport: 'Rugby Union',
        nationality: 'England',
        gender: 'Female',
        roles: ['athlete'],
        primaryRole: 'athlete',
        birthDate: null,
        profileImage: profileImage || '',
        position: position || null
      };

      let existing = null;
      try {
        const res = await axios.get(
          `${API_BASE}/search`,
          { params: { query: playerName, sport: 'Rugby Union' }, withCredentials: true }
        );
        existing = res.data?.players?.find(p => p.name.toLowerCase() === playerName.toLowerCase());
      } catch (e) {
        console.warn(`Search failed for ${playerName}: ${e.message}`);
      }

      if (existing) athletePayload.id = existing.id;

      try {
        await axios.post(
          `${API_BASE}/athlete/create`,
          athletePayload,
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );
        if (existing) console.log(`🔄 Updated athlete: ${playerName}`);
        else console.log(`✅ Created athlete: ${playerName}`);
      } catch (e) {
        console.warn(`Athlete upsert skipped for ${playerName}: ${e.response?.data || e.message}`);
        continue;
      }

      try {
        await axios.post(
          `${API_BASE}/team/link-athlete`,
          { athleteName: playerName, teamName },
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );
        console.log(`🔗 Linked ${playerName} -> ${teamName}`);
      } catch (e) {
        console.warn(`Link athlete->team skipped for ${playerName}: ${e.response?.data || e.message}`);
      }

      try {
        await axios.post(
          `${API_BASE}/link-to-sport`,
          { name: playerName, type: 'athlete', sportName: 'Rugby Union' },
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );
        console.log(`🔗 Linked athlete ${playerName} -> Rugby Union`);
      } catch (e) {
        console.warn(`Link athlete->sport skipped for ${playerName}: ${e.response?.data || e.message}`);
      }
    }

    console.log('🎉 Players to teams relationships complete');
  } catch (error) {
    console.error('Script failed:', error.response?.data || error.message);
  } finally {
    await browser.close();
  }
})();
