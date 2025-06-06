const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const csv = require('csv-parser');
const axios = require('axios');

let pLimit;
try {
pLimit = require('p-limit').default || require('p-limit');
} catch (err) {
pLimit = (concurrency) => {
return (fn) => fn();
};
console.log('⚠️  p-limit not available, using fallback');
}

const KAGGLE_DATASET = 'heesoo37/120-years-of-olympic-history-athletes-and-results';
const DOWNLOAD_DIR = path.resolve(__dirname, 'data');
const ATHLETE_CSV = path.join(DOWNLOAD_DIR, 'athlete_events.csv');
const NOC_CSV = path.join(DOWNLOAD_DIR, 'noc_regions.csv');
const KAGGLE_CONFIG_DIR = path.resolve(__dirname, '.kaggle');
const API_BASE = 'http://localhost:3001';
const CONCURRENCY = 5;

/**
* Parse athlete names to extract primary name and alternate names
* Examples:
* - Cornelia "Cor" Aalten (-Strannood) → name: 'Cornelia Aalten', alternates: [...] 
* - Agnes Erika Aanonsen (-Eyde) → name: 'Agnes Aanonsen', alternates: [...]
*/
function parseAthleteName(fullName) {
if (!fullName || typeof fullName !== 'string') {
return { name: '', alternateNames: [] };
}

const originalName = fullName.trim();
let workingName = originalName;
const alternateNames = [originalName];

// Take out nickname in quotes (e.g., "Cor")
const nicknameMatch = workingName.match(/"([^"]+)"/);
const nickname = nicknameMatch ? nicknameMatch[1] : null;

// Take out nickname from working name
if (nickname) {
workingName = workingName.replace(/"[^"]+"\s*/, '').trim();
}

// Take out maiden/married name in parentheses (e.g., (-Strannood), (-Eyde))
const parenthesesMatch = workingName.match(/\(([^)]+)\)/);
const parenthesesContent = parenthesesMatch ? parenthesesMatch[1] : null;

// Take out parentheses content from working name
if (parenthesesContent) {
workingName = workingName.replace(/\s*\([^)]+\)/, '').trim();
}

// Split name into parts
const nameParts = workingName.split(/\s+/).filter(Boolean);

if (nameParts.length === 0) {
return { name: originalName, alternateNames: [originalName] };
}

// Primary name: First name + Last name (skip middle names for primary)
const firstName = nameParts[0];
const lastName = nameParts[nameParts.length - 1];
const primaryName = `${firstName} ${lastName}`;

// Create alternate name combinations
const alternates = new Set([originalName, primaryName]);

// Add full name with all parts
if (nameParts.length > 2) {
alternates.add(nameParts.join(' '));
}

// Add nickname combinations
if (nickname) {
alternates.add(`${firstName} "${nickname}" ${lastName}`);
alternates.add(`${nickname} ${lastName}`);
if (nameParts.length > 2) {
// Include middle names with nickname
const middleNames = nameParts.slice(1, -1).join(' ');
alternates.add(`${firstName} "${nickname}" ${middleNames} ${lastName}`);
}
}

// Handle parentheses content (maiden names, married names)
if (parenthesesContent) {
const parenthesesName = parenthesesContent.startsWith('-') 
? parenthesesContent.substring(1) 
: parenthesesContent;

// Create combinations with parentheses name
alternates.add(`${firstName} ${parenthesesName}`);

if (nickname) {
alternates.add(`${firstName} "${nickname}" ${parenthesesName}`);
}

// Full alternate with middle names
if (nameParts.length > 2) {
const middleNames = nameParts.slice(1, -1).join(' ');
alternates.add(`${firstName} ${middleNames} ${parenthesesName}`);
}
}

return {
name: primaryName,
alternateNames: Array.from(alternates).filter(name => name && name.trim())
};
}

/**
* Check if a sport already exists by name or alternate names
*/
async function sportExists(sportName) {
try {
const response = await axios.get(`${API_BASE}/api/sports/search`, {
params: { name: sportName },
timeout: 5000
});
return response.data && response.data.length > 0;
} catch (err) {
// If search endpoint doesn't exist, try to get all sports and search manually
try {
const response = await axios.get(`${API_BASE}/api/sports/`, { timeout: 5000 });
const sports = response.data || [];

return sports.some(sport => {
if (sport.name && sport.name.toLowerCase() === sportName.toLowerCase()) {
return true;
}
if (sport.alternateName && Array.isArray(sport.alternateName)) {
return sport.alternateName.some(alt => 
  alt.toLowerCase() === sportName.toLowerCase()
);
}
return false;
});
} catch (secondErr) {
console.log(`   ⚠️  Could not check if sport exists: ${sportName}`);
return false;
}
}
}

/**
* Check if an event already exists
*/
async function eventExists(eventName) {
try {
const response = await axios.get(`${API_BASE}/api/events/search`, {
params: { name: eventName },
timeout: 5000
});
return response.data && response.data.length > 0;
} catch (err) {
console.log(`   ⚠️  Could not check if event exists: ${eventName}`);
return false;
}
}

/**
* Create or get sport node
*/
async function ensureSportExists(sportName) {
if (!sportName || await sportExists(sportName)) {
return;
}

try {
await axios.post(`${API_BASE}/api/sports/`, {
name: sportName,
alternateName: [sportName],
iocDisciplineCode: ""
}, { timeout: 10000 });
console.log(`⚽ Created sport: ${sportName}`);
} catch (err) {
if (err.response && err.response.status === 409) {
console.log(`⚠️  Sport already exists: ${sportName}`);
} else {
console.error(`❗️ Error creating sport ${sportName}:`, err.response?.data || err.message);
}
}
}

/**
* Create or get event node
*/
async function ensureEventExists(eventName, year, city, season) {
if (!eventName || await eventExists(eventName)) {
return;
}

try {
await axios.post(`${API_BASE}/api/events/`, {
name: eventName,
sport: null,
location: city,
roles: 'olympics',
year: year,
sameAs: generateWikipediaUrl(eventName),
}, { timeout: 10000 });
console.log(`📅 Created event: ${eventName}`);
} catch (err) {
if (err.response && err.response.status === 409) {
console.log(`Event already exists: ${eventName}`);
} else {
console.error(`Error creating event ${eventName}:`, err.response?.data || err.message);
}
}
}

/**
* Create award node if it doesn't exist
*/
async function ensureAwardExists(awardName, sport, eventName, year) {
try {
// Try to create as an Event node with roles="award"
await axios.post(`${API_BASE}/api/events/`, {
name: awardName,
sport: sport,
location: null,
roles: 'award',
year: year,
sameAs: null,
}, { timeout: 10000 });
console.log(`Created award: ${awardName}`);
} catch (err) {
if (err.response && err.response.status === 409) {
console.log(` Award already exists: ${awardName}`);
} else {
console.error(`Error creating award ${awardName}:`, err.response?.data || err.message);
}
}
}

/**
* Test API connectivity and endpoints
*/
async function testApiEndpoints() {
console.log('🔍 Testing API endpoints...\n');

// Test basic connectivity
try {
  const response = await axios.get(`${API_BASE}/`, {
    timeout: 3000,
    validateStatus: () => true,
  });
  console.log(`Server responded on port 3001 (status ${response.status})`);
} catch (err) {
  console.log('Cannot connect to server on port 3001');
  console.log(`   Error: ${err.message}`);
  throw new Error('API server not accessible');
}

// Test athletes endpoint
try {
const response = await axios.get(`${API_BASE}/api/athletes`, { timeout: 3000 });
console.log('GET /api/athletes is working');
console.log(`   Status: ${response.status}`);
} catch (err) {
console.log(`GET /api/athletes failed: ${err.response?.status || err.message}`);
}

// Test POST to athletes endpoint with minimal data
try {
const testData = {
name: 'Test Athlete',
sport: 'Test Sport',
alternateNames: ['Test Athlete'],
nationality: 'Test Country',
position: null,
birthDate: null,
gender: 'Female',
roles: ['athlete']
};

console.log('Testing POST /api/athletes with test data...');
const response = await axios.post(`${API_BASE}/api/athletes`, testData, { 
timeout: 5000,
headers: { 'Content-Type': 'application/json' }
});
console.log('POST /api/athletes is working');
console.log(`   Status: ${response.status}`);
console.log(`   Response type: ${typeof response.data}`);

// Try to delete the test athlete if possible
console.log('Test completed successfully\n');

} catch (err) {
console.log(`POST /api/athletes failed:`);
console.log(`   Status: ${err.response?.status}`);
console.log(`   URL: ${err.config?.url}`);

if (err.response?.data) {
if (typeof err.response.data === 'string' && err.response.data.includes('<!DOCTYPE html>')) {
console.log('   ⚠️  Server returned HTML - endpoint likely doesn\'t exist');
console.log('   💡 Check if your API server routes are properly mounted');
} else {
console.log(`   Response: ${JSON.stringify(err.response.data, null, 2)}`);
}
}

throw new Error('Athletes POST endpoint not working');
}
}

/**
 * Load mapping of NOC codes to regions/nationalities
 */
async function loadNocRegions() {
  if (!fs.existsSync(NOC_CSV)) {
    console.log(` NOC regions file not found: ${NOC_CSV}`);
    return {};
  }

  return new Promise((resolve) => {
    const mapping = {};
    fs.createReadStream(NOC_CSV)
      .pipe(csv())
      .on('data', (row) => {
        const noc = row.NOC || row.noc || row.code;
        const region = row.region || row.Region || row.country;
        if (noc && region) {
          mapping[noc.trim()] = region.trim();
        }
      })
      .on('end', () => resolve(mapping))
      .on('error', (err) => {
        console.error(`Error reading NOC regions file:`, err.message);
        resolve(mapping);
      });
  });
}

/**
* Process Olympic athlete data directly from athlete_events.csv
*/
async function processOlympicAthletesFromCsv() {
console.log(`\n📑 Processing Olympic athletes from: ${ATHLETE_CSV}`);

if (!fs.existsSync(ATHLETE_CSV)) {
console.error(`Athlete events file not found: ${ATHLETE_CSV}`);
return;
}

// Load NOC regions mapping
const nocRegions = await loadNocRegions();

return new Promise((resolve) => {
const rows = [];
let headers = [];

fs.createReadStream(ATHLETE_CSV)
.pipe(csv())
.on('headers', (headerList) => {
headers = headerList;
console.log(`   Headers: [${headers.map(h => `"${h}"`).join(', ')}]`);
})
.on('data', (row) => {
// Filter for female athletes only during data loading
const sex = row.Sex || row.sex;
if (sex && sex.trim().toUpperCase() === 'F') {
rows.push(row);
}
})
.on('end', async () => {
console.log(`   Total female athletes loaded: ${rows.length}`);

// Process the filtered female athletes
await processOlympicAthletes(rows, {
name: 'Name',
sex: 'Sex', 
age: 'Age',
height: 'Height',
weight: 'Weight',
team: 'Team',
noc: 'NOC',
games: 'Games',
year: 'Year',
season: 'Season', 
city: 'City',
sport: 'Sport',
event: 'Event',
medal: 'Medal'
}, nocRegions);

resolve();
})
.on('error', (err) => {
console.error(`❗️ Error reading athlete events file:`, err.message);
resolve();
});
});
}
/**
* Process Olympic athlete data with enhanced name parsing and relationship creation
*/
async function processOlympicAthletes(rows, headerMap, nocRegions = {}) {
console.log(`👤 Processing ${rows.length} female Olympic athletes`);

const limit = pLimit(CONCURRENCY);
const processedAthletes = new Set();

await Promise.allSettled(
rows.map(row =>
limit(async () => {
try {
// Extract data from row
const fullName = row[headerMap.name] || row['Name'] || row['name'];
const team = row[headerMap.team] || row['Team'] || row['team'] || '';
const noc = row[headerMap.noc] || row['NOC'] || row['noc'] || '';
const games = row[headerMap.games] || row['Games'] || row['games'] || '';
const year = row[headerMap.year] || row['Year'] || row['year'] || '';
const season = row[headerMap.season] || row['Season'] || row['season'] || '';
const city = row[headerMap.city] || row['City'] || row['city'] || '';
const sport = row[headerMap.sport] || row['Sport'] || row['sport'] || '';
const event = row[headerMap.event] || row['Event'] || row['event'] || '';
const medal = row[headerMap.medal] || row['Medal'] || row['medal'] || '';
const age = row[headerMap.age] || row['Age'] || row['age'] || null;
const height = row[headerMap.height] || row['Height'] || row['height'] || null;
const weight = row[headerMap.weight] || row['Weight'] || row['weight'] || null;

 // Determine athlete nationality using team, NOC code and mapping
 let nationality = '';
 if (team && team !== 'NA') {
   nationality = team.trim();
 } else if (noc && nocRegions[noc]) {
   nationality = nocRegions[noc];
 } else if (noc && noc !== 'NA') {
   nationality = noc;
 }

if (!fullName?.trim()) {
  return;
}

// Parse the athlete name
const { name: primaryName, alternateNames } = parseAthleteName(fullName);

// Unique key for athlete to avoid duplicates
const athleteKey = `${primaryName}-${noc}-${sport}`;
if (processedAthletes.has(athleteKey)) {
  return;
}
processedAthletes.add(athleteKey);

console.log(`\n👤 Processing: ${fullName}`);
console.log(`   Primary name: ${primaryName}`);

// 1. Create or update the athlete
const athleteResponse = await axios.post(`${API_BASE}/api/athletes/`, {
  name: primaryName,
  alternateName: alternateNames,
  sport: sport || 'Unknown',
  nationality: nationality,
  gender: 'Female',
  profileImage: null,
  birthDate: null,
  age: age && age !== 'NA' ? parseInt(age) : null,
  height: height && height !== 'NA' ? parseFloat(height) : null,
  weight: weight && weight !== 'NA' ? parseFloat(weight) : null,
}, { timeout: 10000 });

console.log(`✅ Created/Updated athlete: ${primaryName}`);
const athleteData = athleteResponse.data;
const athleteId = athleteData.uuid || athleteData.id || athleteData.player?.uuid;

// 2. Ensure Sport node exists and create PARTICIPATES_IN relationship
if (sport && sport.trim()) {
  await ensureSportExists(sport.trim());
  
  // Create relationship: Athlete PARTICIPATES_IN Sport
  try {
      await axios.post(`${API_BASE}/api/athletes/${athleteId}/sport`, {          sportName: sport.trim(),
          relationship: 'PARTICIPATES_IN'
      }, { timeout: 5000 });
      console.log(`   🔗 Created PARTICIPATES_IN relationship with sport: ${sport}`);
  } catch (err) {
      console.log(`   ⚠️  Could not create sport relationship: ${err.response?.status || err.message}`);
  }
}

// 3. Create Olympic Event and relationship
if (games && games.trim()) {
  // Create event name by concatenating Games + "Olympics"
  // e.g., "1932 Summer" -> "1932 Summer Olympics"
  const olympicEventName = games.includes('Olympics') ? games : `${games} Olympics`;
  
  await ensureEventExists(olympicEventName, year, city, season);
  
  // Clean the event name by removing "Women's" prefix
  let cleanEventName = event || '';
  if (cleanEventName.toLowerCase().startsWith("women's ")) {
      cleanEventName = cleanEventName.substring(8); // Remove "Women's "
  }
  
  // Create relationship: Athlete PARTICIPATES_IN Olympic Event with event property
  try {
      await axios.post(`${API_BASE}/api/athletes/${athleteId}/event`, {
          eventName: olympicEventName,
          relationship: 'PARTICIPATES_IN',
          year: year,
          event: cleanEventName, // e.g., "100 metres" instead of "Women's 100 metres"
          sport: sport
      }, { timeout: 5000 });
      console.log(`   🔗 Created PARTICIPATES_IN relationship with event: ${olympicEventName}`);
      if (cleanEventName) {
          console.log(`      📋 Event property: ${cleanEventName}`);
      }
  } catch (err) {
      console.log(`   ⚠️  Could not create event relationship: ${err.response?.status || err.message}`);
  }
}

// 4. Create Award relationship if medal is not NA
if (medal && medal.trim() && medal.toUpperCase() !== 'NA') {
  const awardName = `Olympic ${medal} Medal`;
  
  await ensureAwardExists(awardName, sport, games, year);
  
  // Clean the event name by removing "Women's" prefix for award relationship
  let cleanEventName = event || '';
  if (cleanEventName.toLowerCase().startsWith("women's ")) {
      cleanEventName = cleanEventName.substring(8); // Remove "Women's "
  }
  
  // Create relationship: Athlete WON Award
  try {
      await axios.post(`${API_BASE}/api/athletes/${athleteId}/award`, {
          awardName: awardName,
          relationship: 'WON',
          year: year,
          event: cleanEventName, // e.g., "100 metres" instead of "Women's 100 metres"
          games: games,
          sport: sport
      }, { timeout: 5000 });
      console.log(`   🏆 Created WON relationship with award: ${awardName}`);
      if (cleanEventName) {
          console.log(`      📋 Event property: ${cleanEventName}`);
      }
  } catch (err) {
      console.log(`   ⚠️  Could not create award relationship: ${err.response?.status || err.message}`);
  }
}

} catch (err) {
console.error(`❗️ Error processing athlete ${row[headerMap.name] || 'unknown'}:`);

if (err.response) {
  // Server responded with error status
  console.error(`   Status: ${err.response.status}`);
  console.error(`   Response:`, err.response.data);
  
  if (typeof err.response.data === 'string' && err.response.data.includes('<!DOCTYPE html>')) {
      console.error(`   ⚠️  Server returned HTML instead of JSON - check if API endpoint exists`);
  }
} else if (err.request) {
  // Request was made but no response received
  console.error(`   Network Error: ${err.message}`);
  console.error(`   Check if API server is running on http://localhost:3001`);
} else {
  // Something else happened
  console.error(`   Error: ${err.message}`);
}
}
})
)
);

console.log(`\n✅ Processed ${rows.length} female Olympic athletes`);
}

/**
* Detect CSV type - enhanced for Olympic data
*/
function detectCsvType(filename) {
const lowerFilename = filename.toLowerCase();

// Olympic athlete data files
if (lowerFilename.includes('athlete') || lowerFilename.includes('olympic') || 
lowerFilename.includes('games') || lowerFilename.includes('competitor')) {
return 'olympic_athletes';
}

// Original detection logic
if (lowerFilename.includes('node') && lowerFilename.includes('person')) {
return 'athletes';
}
if (lowerFilename.includes('node_event')) {
return 'events';
}
if (lowerFilename.includes('node_sport')) {
return 'sports';
}
if (lowerFilename.includes('sports_relationships')) {
return 'relationships';
}
if (lowerFilename.includes('node_award')) {
return 'awards';
}
if (lowerFilename.includes('org') || lowerFilename.includes('team') || lowerFilename.includes('club')) {
return 'organisations';
}

return 'unknown';
}

/**
* Enhanced header normalization for Olympic data
*/
function normaliseHeaders(headers) {
const normalised = {};

headers.forEach(header => {
const lower = header.toLowerCase().trim();

// Olympic-specific headers
if (lower === 'name' || lower === 'athlete') {
normalised.name = header;
}
else if (lower === 'sex' || lower === 'gender') {
normalised.sex = header;
}
else if (lower === 'age') {
normalised.age = header;
}
else if (lower === 'height') {
normalised.height = header;
}
else if (lower === 'weight') {
normalised.weight = header;
}
else if (lower === 'team') {
normalised.team = header;
}
else if (lower === 'noc') {
normalised.noc = header;
}
else if (lower === 'games') {
normalised.games = header;
}
else if (lower === 'year') {
normalised.year = header;  
}
else if (lower === 'season') {
normalised.season = header;
}
else if (lower === 'city') {
normalised.city = header;
}
else if (lower === 'sport') {
normalised.sport = header;
}
else if (lower === 'event') {
normalised.event = header;
}
else if (lower === 'medal') {
normalised.medal = header;
}
// Original header mappings...
else if ((lower.includes('name') && !lower.includes('alternate') && !lower.includes('start') && !lower.includes('end')) || lower === 'player') {
normalised.name = header;
}
// ... (rest of original normaliseHeaders function)
else if (lower === 'alternatename' || lower === 'alternate name') {
normalised.alternateName = header;
}
else if (lower === 'ioc discipline code' || lower === 'iocdisciplinecode') {
normalised['IOC Discipline Code'] = header;
}
else if ((lower.includes('start') && lower.includes('name')) || lower === 'startname') {
normalised.startName = header;
}
else if ((lower.includes('end') && lower.includes('name')) || lower === 'endname') {
normalised.endName = header;
}
else if ((lower.includes('alternate') && lower.includes('name')) || lower.includes('alias') || lower.includes('nickname')) {
normalised.alternateName = header;
}
else if (lower.includes('sport') && !lower.includes('relationship')) {
normalised.sport = header;
}
else if (lower.includes('team') || lower.includes('club') || lower.includes('organization') || lower.includes('organisation')) {
normalised.organisation = header;
}
else if (lower.includes('location') || lower.includes('city') || lower.includes('country') || lower.includes('nationality') || lower.includes('nation')) {
normalised.location = header;
}
else if (lower.includes('date') && !lower.includes('birth') && !lower.includes('event')) {
normalised.date = header;
}
else if (lower.includes('birth') && (lower.includes('date') || lower === 'birthdate')) {
normalised.birthDate = header;
}
else if (lower.includes('event') && lower.includes('date')) {
normalised.eventDate = header;
}
else if (lower.includes('relationship') || lower === 'reltype' || lower === 'rel_type' || lower === 'relationshiptype' || lower === 'relationship type') {
normalised.relationshipType = header;
}
else if ((lower.includes('role') || lower === 'type' || lower.includes('category')) && !normalised.relationshipType) {
normalised.roles = header;
}
else if (lower.includes('description') || lower.includes('about') || lower.includes('bio')) {
normalised.description = header;
}
else if (lower.includes('founding') || lower.includes('founded') || lower.includes('established') || lower.includes('created')) {
normalised.foundingDate = header;
}
else if (lower.includes('award') && !lower.includes('date')) {
normalised.awardName = header;
}
else if (lower.includes('awarded')) {
normalised.awardYear = header;
}
else if (lower.includes('sameas') || (lower.includes('url') && lower.includes('same'))) {
normalised.sameAs = header;
}
else if (lower.includes('venue') || lower.includes('place')) {
normalised.venue = header;
}
else if (lower.includes('gender') || lower.includes('sex')) {
normalised.gender = header;
}
});

return normalised;
}

/**
* Generate Wikipedia URL from name
*/
function generateWikipediaUrl(name) {
if (!name) return null;
const formattedName = name.trim().replace(/\s+/g, '_');
return `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedName)}`;
}

/**
* Process athlete data from *node*_person files
*/
async function processAthletes(rows, headerMap) {
const athletes = rows
.filter(row => row[headerMap.name]?.trim())
.map(row => ({
name: row[headerMap.name]?.trim(),
sport: row[headerMap.sport]?.trim() || 'Unknown',
nationality: row[headerMap.location]?.trim() || '',
birthDate: row[headerMap.birthDate] || row[headerMap.date]?.trim() || null,
gender: row[headerMap.gender]?.trim() || 'Female',
profileImage: null,
organisation: row[headerMap.organisation]?.trim() || null,
}));

console.log(`👤 Processing ${athletes.length} athletes`);

const limit = pLimit(CONCURRENCY);

await Promise.allSettled(
athletes.map(athlete =>
limit(async () => {
try {
const response = await axios.post(`${API_BASE}/api/athletes/`, {
  name: athlete.name,
  sport: athlete.sport,
  nationality: athlete.nationality,
  gender: athlete.gender,
  profileImage: athlete.profileImage,
  birthDate: athlete.birthDate,
}, {
  timeout: 5000
});
console.log(`👤 Created/Updated athlete: ${athlete.name}`);

const athleteData = response.data;
const athleteId = athleteData.uuid || athleteData.id || athleteData.player?.uuid;

if (athlete.organisation && athleteId) {
  await axios.post(`${API_BASE}/api/athletes/${athleteId}/organisation`, {
      organisationName: athlete.organisation,
      sport: athlete.sport,
      sportLabel: 'Sport',
  }, {
      timeout: 5000
  });
  console.log(`   ↳ Linked to organisation: ${athlete.organisation}`);
}

} catch (err) {
console.error(`❗️ Error processing athlete ${athlete.name}:`,
  err.response?.data || err.message);
}
})
)
);
}

/**
* Process event data from node_event files
*/
async function processEvents(rows, headerMap) {
const events = rows
.filter(row => row[headerMap.name] || row[headerMap.eventName])
.map(row => {
const name = (row[headerMap.name] || row[headerMap.eventName])?.trim();
let roles = row[headerMap.roles]?.trim() || null;

if (!roles && name && name.toLowerCase().includes('olympics')) {
roles = 'olympics';
}

return {
name: name,
sport: row[headerMap.sport]?.trim() || null,
location: row[headerMap.location]?.trim() || null,
roles: roles,
year: row[headerMap.year] || row[headerMap.awardYear] || row[headerMap.date]?.trim() || extractYearFromName(name),
sameAs: row[headerMap.sameAs]?.trim() || generateWikipediaUrl(name),
};
});

console.log(`📅 Processing ${events.length} events`);

try {
await axios.get(`${API_BASE}/api/events/list`, { timeout: 2000 });
console.log(`   ✅ Events API endpoint is available`);

const limit = pLimit(CONCURRENCY);
await Promise.allSettled(
events.map(event =>
limit(async () => {
try {
  await axios.post(`${API_BASE}/api/events/`, {
      name: event.name,
      sport: event.sport,
      location: event.location,
      roles: event.roles,
      year: event.year,
      sameAs: event.sameAs,
  }, {
      timeout: 5000
  });
  console.log(`📅 Created event: ${event.name}`);

} catch (err) {
  console.error(`❗️ Error processing event ${event.name}:`,
      err.response?.data || err.message);
}
})
)
);

} catch (err) {
console.log(`   ⚠️  Events API endpoint not available - logging event data:`);
events.forEach(event => {
console.log(`📅 Would create event: ${event.name}`);
console.log(`   Data: name="${event.name}", sport="${event.sport}", location="${event.location}", roles="${event.roles}", year="${event.year}"`);
console.log(`   Wikipedia: ${event.sameAs}`);
});
}
}

/**
* Process award data from node_award files
*/
async function processAwards(rows, headerMap) {
const awards = rows
.filter(row => row[headerMap.name] || row[headerMap.awardName])
.map(row => ({
name: (row[headerMap.name] || row[headerMap.awardName])?.trim(),
year: row[headerMap.year] || row[headerMap.awardYear]?.trim() || null,
sport: row[headerMap.sport]?.trim() || null,
event: row[headerMap.event]?.trim() || null,
}));

console.log(`🏆 Processing ${awards.length} awards`);

awards.forEach(award => {
console.log(`🏆 Award: ${award.name}`);
if (award.year) console.log(`   📅 Year: ${award.year}`);
if (award.sport) console.log(`   ⚽ Sport: ${award.sport}`);
if (award.event) console.log(`   📅 Event: ${award.event}`);
console.log(`   💡 Consider creating as Event node with roles="award"`);
});
}

/**
* Process sport data from node_sport files
*/
async function processSports(rows, headerMap) {
const sports = rows
.filter(row => row[headerMap.name]?.trim())
.map(row => {
const name = row[headerMap.name]?.trim();
let alternateNameRaw = row[headerMap.alternateName];
let alternateName = [];

if (alternateNameRaw && typeof alternateNameRaw === 'string') {
if (alternateNameRaw.includes(';')) {
alternateName = alternateNameRaw.split(';').map(s => s.trim()).filter(Boolean);
} else if (alternateNameRaw.includes(',')) {
alternateName = alternateNameRaw.split(',').map(s => s.trim()).filter(Boolean);
} else {
alternateName = [alternateNameRaw.trim()];
}
} else if (Array.isArray(alternateNameRaw)) {
alternateName = alternateNameRaw.map(s => s.trim()).filter(Boolean);
}

if (alternateName.length === 0 && name) alternateName = [name];

const iocDisciplineCode = row[headerMap['IOC Discipline Code']]?.trim() || "";

return {
name,
alternateName,
iocDisciplineCode,
};
});

console.log(`⚽ Uploading ${sports.length} sports using POST /api/sports/...`);

const limit = pLimit(CONCURRENCY);

await Promise.allSettled(
sports.map(sport =>
limit(async () => {
try {
const response = await axios.post(`${API_BASE}/api/sports/`, sport, { timeout: 10000 });
console.log(`✅ Created sport: ${sport.name}`);
} catch (err) {
if (err.response && err.response.status === 409) {
  console.log(`⚠️  Skipped (already exists by name or alternateName): ${sport.name}`);
} else {
  console.error(`❗️ Error creating sport ${sport.name}:`, err.response?.data || err.message);
}
}
})
)
);
}

/**
* Process relationship data from sports_relationships files
*/
async function processRelationships(rows, headerMap) {
const relationships = rows
.filter(row => row[headerMap.startName]?.trim() && row[headerMap.endName]?.trim())
.map(row => ({
startName: row[headerMap.startName]?.trim(),
endName: row[headerMap.endName]?.trim(),
relationshipType: row[headerMap.relationshipType]?.trim() || 'PARTICIPATES_IN',
year: row[headerMap.year]?.trim() || null,
event: row[headerMap.event]?.trim() || null,
}));

console.log(`🔗 Processing ${relationships.length} relationships`);
console.log(`   Valid types: SPONSORED_BY, PARTICIPATES_IN, WON, TRAINED_BY, SPORT_AWARD`);

const limit = pLimit(CONCURRENCY);

await Promise.allSettled(
relationships.map(rel =>
limit(async () => {
try {
const isStartNameAward = isLikelyAward(rel.startName);
const isEndNameEvent = isLikelyEvent(rel.endName);
const isEndNameSport = isLikelySport(rel.endName);
const isEndNameOrg = isLikelyOrganisation(rel.endName);

if (isStartNameAward) {
  console.log(`🏆 Would create award node: ${rel.startName}`);
}

if (isEndNameEvent) {
  console.log(`📅 Would create event node: ${rel.endName}`);
}

if (isEndNameSport && !isEndNameEvent) {
  try {
      await axios.post(`${API_BASE}/sport`, {
          name: '_temp_sport_creation',
          type: 'athlete',
          sportName: rel.endName,
      }, {
          timeout: 5000
      });
      console.log(`⚽ Created sport node: ${rel.endName}`);
  } catch (err) {
      console.log(`   ⚠️  Could not create sport ${rel.endName}: ${err.response?.status || err.message}`);
  }
}

if (isEndNameOrg && !isEndNameSport && !isEndNameEvent) {
  try {
      await axios.post(`${API_BASE}/api/organisations/`, {
          name: rel.endName,
          roles: ['organisation'],
          description: `Auto-created from relationship: ${rel.startName} -[${rel.relationshipType}]-> ${rel.endName}`
      }, {
          timeout: 5000
      });
      console.log(`🏢 Created organisation node: ${rel.endName}`);
  } catch (err) {
      console.log(`   ⚠️  Could not create organisation ${rel.endName}: ${err.response?.status || err.message}`);
  }
}

const relationshipProps = [];
if (rel.year) relationshipProps.push(`year: "${rel.year}"`);
if (rel.event) relationshipProps.push(`event: "${rel.event}"`);

const propsString = relationshipProps.length > 0 ? ` {${relationshipProps.join(', ')}}` : '';

console.log(`🔗 Would create relationship: (${rel.startName}) -[${rel.relationshipType}${propsString}]-> (${rel.endName})`);

} catch (err) {
console.error(`❗️ Error processing relationship ${rel.startName} -> ${rel.endName}:`,
  err.response?.data || err.message);
}
})
)
);
}

/**
* Process organisation data
*/
async function processOrganisations(rows, headerMap) {
const organisations = rows
.filter(row => row[headerMap.name]?.trim())
.map(row => ({
name: row[headerMap.name]?.trim(),
alternateName: row[headerMap.alternateName]?.trim() || null,
sport: row[headerMap.sport]?.trim() || null,
roles: row[headerMap.roles]?.trim() || 'Organisation',
location: row[headerMap.location]?.trim() || null,
description: row[headerMap.description]?.trim() || null,
foundingDate: row[headerMap.foundingDate]?.trim() || null,
}));

console.log(`🏢 Processing ${organisations.length} organisations`);

const limit = pLimit(CONCURRENCY);

await Promise.allSettled(
organisations.map(org =>
limit(async () => {
try {
await axios.post(`${API_BASE}/api//organisations/`, {
  name: org.name,
  alternateName: org.alternateName,
  sport: org.sport,
  roles: org.roles,
  location: org.location,
  description: org.description,
  foundingDate: org.foundingDate,
}, {
  timeout: 5000
});
console.log(`🏢 Created organisation: ${org.name}`);

if (org.sport) {
  await axios.post(`${API_BASE}/sport`, {
      name: org.name,
      type: 'team',
      sportName: org.sport,
  }, {
      timeout: 5000
  });
  console.log(`   ↳ Linked to sport: ${org.sport}`);
}

} catch (err) {
console.error(`❗️ Error processing organisation ${org.name}:`,
  err.response?.data || err.message);
}
})
)
);
}

/**
* Helper functions
*/
function isLikelyEvent(name) {
const eventKeywords = ['championship', 'championships', 'cup', 'tournament', 'games', 'olympics', 'world', 'competition', 'league', 'series', 'open', 'masters', 'classic', 'grand prix', 'bowl'];
const lowerName = name.toLowerCase();
return eventKeywords.some(keyword => lowerName.includes(keyword));
}

function isLikelyAward(name) {
const awardKeywords = ['gold', 'silver', 'bronze', 'medal', 'award', 'prize', 'trophy', 'championship', 'cup', 'title', 'winner', 'champion', 'first place', 'second place', 'third place'];
const lowerName = name.toLowerCase();
return awardKeywords.some(keyword => lowerName.includes(keyword));
}

function isLikelyOrganisation(name) {
const orgKeywords = ['federation', 'association', 'committee', 'union', 'league', 'council', 'board', 'organization', 'organisation', 'society', 'club', 'team', 'academy', 'institute', 'foundation', 'iaaf', 'fifa', 'uefa', 'ioc', 'rfc', 'fc', 'united', 'city', 'rovers', 'athletic', 'leinster', 'munster', 'ulster', 'connacht'];
const lowerName = name.toLowerCase();
return orgKeywords.some(keyword => lowerName.includes(keyword));
}

function isLikelySport(name) {
const sportKeywords = ['football', 'soccer', 'basketball', 'tennis', 'volleyball', 'swimming', 'athletics', 'track', 'field', 'gymnastics', 'hockey', 'baseball', 'softball', 'golf', 'rugby', 'cricket', 'badminton', 'skiing', 'snowboarding', 'cycling', 'running', 'marathon', 'triathlon', 'pentathlon', 'wrestling', 'boxing', 'judo', 'karate', 'taekwondo', 'fencing', 'archery', 'shooting', 'sailing', 'rowing', 'canoeing', 'weightlifting', 'powerlifting', 'climbing', 'surfing', 'skateboarding'];
const lowerName = name.toLowerCase();
return sportKeywords.some(keyword => lowerName.includes(keyword));
}

function extractYearFromName(name) {
if (!name) return null;
const yearMatch = name.match(/\b(19|20)\d{2}\b/);
return yearMatch ? yearMatch[0] : null;
}

/**
* Process CSV file based on detected type
*/
async function processCsvFile(filename) {
const fullPath = path.join(DOWNLOAD_DIR, filename);

return new Promise((resolve) => {
const rows = [];
let headers = [];

fs.createReadStream(fullPath)
.pipe(csv())
.on('headers', (headerList) => {
headers = headerList;
})
.on('data', (row) => {
rows.push(row);
})
.on('end', async () => {
console.log(`\n📑 Processing ${filename}`);
console.log(`   Rows: ${rows.length}, Columns: ${headers.length}`);
console.log(`   Headers: [${headers.map(h => `"${h}"`).join(', ')}]`);

const csvType = detectCsvType(filename);
console.log(`   Detected type: ${csvType}`);

if (csvType === 'unknown') {
console.log(`   ⚠️  Skipping unknown CSV type`);
resolve();
return;
}

const headerMap = normaliseHeaders(headers);
console.log(`   Mapped headers:`, headerMap);

try {
switch (csvType) {
  case 'olympic_athletes':
      await processOlympicAthletes(rows, headerMap);
      break;
  case 'athletes':
      await processAthletes(rows, headerMap);
      break;
  case 'events':
      await processEvents(rows, headerMap);
      break;
  case 'awards':
      await processAwards(rows, headerMap);
      break;
  case 'sports':
      await processSports(rows, headerMap);
      break;
  case 'relationships':
      await processRelationships(rows, headerMap);
      break;
  case 'organisations':
      await processOrganisations(rows, headerMap);
      break;
}
} catch (err) {
console.error(`❗️ Error processing ${filename}:`, err.message);
}

resolve();
})
.on('error', (err) => {
console.error(`❗️ Error reading ${filename}:`, err.message);
resolve();
});
});
}

/**
* Enhanced processing order for Olympic data
*/
function sortCsvFilesByType(csvFiles) {
const order = {
'sports': 1,
'organisations': 2,
'athletes': 3,
'olympic_athletes': 4, // Process Olympic athletes after regular athletes
'events': 5,
'awards': 6,
'relationships': 7,
'unknown': 8
};

return csvFiles.sort((a, b) => {
const typeA = detectCsvType(a);
const typeB = detectCsvType(b);
return (order[typeA] || 8) - (order[typeB] || 8);
});
}

// Main execution function
(async () => {
try {
console.log('🚀 Starting Olympic History Data Import Pipeline...\n');
console.log(`📊 Dataset: ${KAGGLE_DATASET}`);

// Ensure data directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Download the Olympic dataset if not already present
console.log('📥 Downloading Olympic dataset...');
try {
execSync(
`kaggle datasets download -d ${KAGGLE_DATASET} -p ${DOWNLOAD_DIR} --unzip`,
{ env: { ...process.env, KAGGLE_CONFIG_DIR } }
);
console.log('✅ Dataset downloaded & extracted to:', DOWNLOAD_DIR);
} catch (err) {
console.log('⚠️  Download failed or files already exist. Checking for data files...');
}

// Verify required files exist
const requiredFiles = [ATHLETE_CSV];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
console.error('❌ Missing required files:', missingFiles);
console.error('Please ensure the Kaggle dataset is properly downloaded.');
process.exit(1);
}

console.log('✅ Required data files found:');
console.log(`   - ${ATHLETE_CSV}`);
if (fs.existsSync(NOC_CSV)) {
console.log(`   - ${NOC_CSV}`);
}

// Test API endpoints before processing data
await testApiEndpoints();

// Process Olympic athletes from the CSV file
await processOlympicAthletesFromCsv();

console.log('\n🎉 Olympic data import completed successfully!');
console.log('📈 Summary:');
console.log('   ✅ Female Olympic athletes processed');
console.log('   ✅ Sport nodes created/linked');
console.log('   ✅ Olympic event nodes created');
console.log('   ✅ Medal award relationships established');

} catch (err) {
console.error('🔥 Pipeline failed:', err.message);
console.error(err.stack);
process.exit(1);
}
})();