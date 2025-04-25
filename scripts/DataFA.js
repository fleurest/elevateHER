require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Cluster } = require('puppeteer-cluster');
const axios = require('axios');

const BASE = 'https://womensleagues.thefa.com';
const API_BASE = 'http://localhost:3000/api';

(async () => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 5,
    puppeteerOptions: { headless: true }
  });

  const linkedTeams = new Set();

  await cluster.task(async ({ page, data: { url, type, meta } }) => {
    console.log('About to check task type:', type);

    if (type === 'main') {
      await page.goto(url, { waitUntil: 'networkidle2' });
      const teams = await page.evaluate(() =>
        Array.from(document.querySelectorAll('input[name="club[]"]')).map(input => ({
          name: input.value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          slug: input.value
        }))
      );
      console.log(teams);
      console.log(`Found ${teams.length} teams`);

      for (const { name: teamName, slug } of teams) {
        const teamUrl = `${BASE}/player/?club=${slug}`;
        console.log(`Queuing team page: ${teamUrl} for ${teamName}`);
        await cluster.queue({ url: teamUrl, type: 'team', meta: { teamName, slug, leagueName: meta.leagueName } });
      }

    } else if (type === 'team') {
      console.log(`Visiting team players page: ${url} for ${meta.teamName}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('a[href*="/player/"]', { timeout: 15000 });
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));

      const playerLinks = await page.$$eval('a[href*="/player/"]', anchors =>
        anchors
          .filter(a => a.href.includes('/player/'))
          .map(a => ({
            name: a.textContent.trim(),
            url: a.href.trim()
          }))
      );
      
      console.log(`Found ${playerLinks.length} players for ${meta.teamName}`);
      if (!playerLinks.length) return console.log(`No players for ${meta.teamName}`);

      for (const playerUrl of playerLinks) {
        console.log(`Queuing player: ${playerUrl.name}`);
        await cluster.queue({ url: playerUrl.url, type: 'player', meta });
      }

    } else if (type === 'player') {
      console.log(`Scraping player: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });

      const player = await page.evaluate(() => {
        const first = document.querySelector('.player-hero-small-mobile__firstName');
        const last = document.querySelector('.player-hero-small-mobile__lastName');
        const name = first && last ? `${first.innerText.trim()} ${last.innerText.trim()}` : null;
        const dob = Array.from(document.querySelectorAll('.player-stats__details .copy-centraNo1'))
          .find(el => el.textContent.includes('Date of Birth'))?.nextElementSibling?.innerText.trim() || null;
        const birthDate = dob ? new Date(dob).toISOString().split('T')[0] : null;
        const nationality = document.querySelector('.player-hero-small-mobile__nationality p')?.innerText.trim() || '';
        return { name, birthDate, nationality };
      });

      if (!player.name) return console.log(`Skipping: missing name`);
      const payload = {
        name: player.name,
        sport: 'Football',
        nationality: player.nationality,
        gender: 'Female',
        roles: ['athlete'],
        newRole: 'athlete',
        birthDate: player.birthDate,
        profileImage: null
      };

      console.log('Payload:', payload);

      try {
        await axios.post(`${API_BASE}/athlete/create`, payload);
        console.log(`Uploaded: ${player.name}`);

        await axios.post(`${API_BASE}/team/link-athlete`, {
          athleteName: player.name,
          teamName: meta.teamName
        });
        console.log(`🔗 Linked ${player.name} -> ${meta.teamName}`);

        if (!linkedTeams.has(meta.teamName)) {
          await axios.post(`${API_BASE}/team/link-league`, {
            teamName: meta.teamName,
            leagueName: meta.leagueName
          });
          console.log(`Linked ${meta.teamName} -> ${meta.leagueName}`);
          linkedTeams.add(meta.teamName);
        }
      } catch (err) {
        console.error(`Error for ${player.name}:`, err.response?.status, err.response?.data || err.message);
      }
    }
  });

  await cluster.queue({
    url: `${BASE}/player/`,
    type: 'main',
    meta: { leagueName: "Barclays Women’s Super League" }
  });

  await cluster.idle();
  await cluster.close();

  console.log('Finished scraping FA Women teams and players');
})();