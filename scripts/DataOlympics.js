const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const csv = require('csv-parser');
const axios = require('axios');
const pLimit = require('p-limit').default;

const KAGGLE_DATASET = 'heesoo37/120-years-of-olympic-history-athletes-and-results';
const DOWNLOAD_DIR = path.resolve(__dirname, 'data');
const ATHLETE_CSV = path.join(DOWNLOAD_DIR, 'athlete_events.csv');
const NOC_CSV = path.join(DOWNLOAD_DIR, 'noc_regions.csv');
const KAGGLE_CONFIG_DIR = path.resolve(__dirname, '.kaggle');
const API_BASE = 'http://localhost:3000/api';
const CONCURRENCY = 10;

(async () => {
  try {
    execSync(`kaggle datasets download -d ${KAGGLE_DATASET} -p ${DOWNLOAD_DIR} --unzip`, {
      env: { ...process.env, KAGGLE_CONFIG_DIR }
    });
    console.log('Downloaded and extracted');

    const nocMap = {};
    await new Promise((resolve) => {
      fs.createReadStream(NOC_CSV)
        .pipe(csv())
        .on('data', (row) => {
          nocMap[row.NOC.trim()] = row.region.trim();
        })
        .on('end', resolve);
    });

    const femaleAthletes = [];
    await new Promise((resolve) => {
      fs.createReadStream(ATHLETE_CSV)
        .pipe(csv())
        .on('data', (row) => {
          const name = row.Name?.trim();
          const sport = row.Sport?.trim();
          const noc = row.NOC?.trim();
          const nationality = nocMap[noc];

          if (row.Sex === 'F' && name && sport && nationality) {
            femaleAthletes.push({
              name,
              sport,
              nationality,
              gender: 'Female',
              roles: ['athlete'],
              primaryRole: 'athlete',
              profileImage: null,
              birthDate: null
            });
          }
        })
        .on('end', resolve);
    });

    console.log(`Found ${femaleAthletes.length} valid female athletes`);

    const limit = pLimit(CONCURRENCY);

    await Promise.allSettled(
      femaleAthletes.map((athlete) =>
        limit(async () => {
          try {
            await axios.post(`${API_BASE}/athlete/create`, athlete, {
              headers: { 'Content-Type': 'application/json' }
            });
            console.log(`Upserted: ${athlete.name}`);

            const teamName = `Team ${athlete.nationality}`;
            await axios.post(`${API_BASE}/team/link-athlete`, {
              athleteName: athlete.name,
              teamName,
              sport: athlete.sport,
              sportLabel: 'Sport'
            }, {
              headers: { 'Content-Type': 'application/json' }
            });

            console.log(`Linked ${athlete.name} to ${teamName} and ${athlete.sport}`);
          } catch (err) {
            console.error(`${athlete.name}:`, err.response?.data || err.message);
          }
        })
      )
    );

    console.log('All athletes processed');
  } catch (err) {
    console.error('Pipeline failed:', err.message);
    console.error(err.stack);
  }
})();
