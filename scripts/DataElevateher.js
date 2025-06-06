const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const csv = require('csv-parser');
const axios = require('axios');
const pLimit = require('p-limit').default;

const KAGGLE_DATASET = 'sydneyelise/women-in-sport-data-for-graph-visualisations';
const DOWNLOAD_DIR = path.resolve(__dirname, 'data');
const KAGGLE_CONFIG_DIR = path.resolve(__dirname, '.kaggle');
const API_BASE = 'http://localhost:3000/api';
const CONCURRENCY = 2;

/**
 * Detect CSV
 */
function detectCsvType(filename) {
    const lowerFilename = filename.toLowerCase();

    // *node*_person files - for new athletes
    if (lowerFilename.includes('node') && lowerFilename.includes('person')) {
        return 'athletes';
    }

    // node_event files - for new events
    if (lowerFilename.includes('node_event')) {
        return 'events';
    }

    // node_sport files - for new sport nodes
    if (lowerFilename.includes('node_sport')) {
        return 'sports';
    }

    // sports_relationships files - for new neo4j relationships
    if (lowerFilename.includes('sports_relationships')) {
        return 'relationships';
    }

    // node_award files
    if (lowerFilename.includes('node_award')) {
        return 'awards';
    }

    // organisations
    if (lowerFilename.includes('org') || lowerFilename.includes('team') || lowerFilename.includes('club')) {
        return 'organisations';
    }

    return 'unknown';
}

function normaliseHeaders(headers) {
    const normalised = {};

    headers.forEach(header => {
        const lower = header.toLowerCase().trim();

        if ((lower.includes('name') && !lower.includes('alternate') && !lower.includes('start') && !lower.includes('end')) || lower === 'athlete' || lower === 'player') {
            normalised.name = header;
        }
        else if (lower === 'alternatename' || lower === 'alternate name') {
            normalised.alternateName = header;
        }
        else if (lower === 'ioc discipline code' || lower === 'iocdisciplinecode') {
            normalised['IOC Discipline Code'] = header;
        }
        // Start name for relationships
        else if ((lower.includes('start') && lower.includes('name')) || lower === 'startname') {
            normalised.startName = header;
        }
        // End name for relationships
        else if ((lower.includes('end') && lower.includes('name')) || lower === 'endname') {
            normalised.endName = header;
        }
        // Alternate name variations
        else if ((lower.includes('alternate') && lower.includes('name')) || lower.includes('alias') || lower.includes('nickname')) {
            normalised.alternateName = header;
        }
        // Sport variations
        else if (lower.includes('sport') && !lower.includes('relationship')) {
            normalised.sport = header;
        }
        // Organisation variations (teams, clubs, etc.)
        else if (lower.includes('team') || lower.includes('club') || lower.includes('organization') || lower.includes('organisation')) {
            normalised.organisation = header;
        }
        // Location variations
        else if (lower.includes('location') || lower.includes('city') || lower.includes('country') || lower.includes('nationality') || lower.includes('nation')) {
            normalised.location = header;
        }
        // Date variations
        else if (lower.includes('date') && !lower.includes('birth') && !lower.includes('event')) {
            normalised.date = header;
        }
        // Birth date specific
        else if (lower.includes('birth') && (lower.includes('date') || lower === 'birthdate')) {
            normalised.birthDate = header;
        }
        // Event date specific
        else if (lower.includes('event') && lower.includes('date')) {
            normalised.eventDate = header;
        }
        // Age
        else if (lower === 'age' || lower.includes('age')) {
            normalised.age = header;
        }
        // Relationship type variations - FIXED: check this before general 'type'
        else if (lower.includes('relationship') || lower === 'reltype' || lower === 'rel_type' || lower === 'relationshiptype' || lower === 'relationship type') {
            normalised.relationshipType = header;
        }
        // Roles/Type - only after checking for relationshipType
        else if ((lower.includes('role') || lower === 'type' || lower.includes('category')) && !normalised.relationshipType) {
            normalised.roles = header;
        }
        // Event (for relationships)
        else if (lower.includes('event') && !lower.includes('date')) {
            normalised.event = header;
        }
        // Description
        else if (lower.includes('description') || lower.includes('about') || lower.includes('bio')) {
            normalised.description = header;
        }
        // Founding date variations
        else if (lower.includes('founding') || lower.includes('founded') || lower.includes('established') || lower.includes('created')) {
            normalised.foundingDate = header;
        }
        // Year
        else if (lower === 'year') {
            normalised.year = header;
        }
        // Award specific fields
        else if (lower.includes('award') && !lower.includes('date')) {
            normalised.awardName = header;
        }

        // Sponsor name
        else if (lower.includes('sponsor')) {
            normalised.sponsor = header;
        }

        else if (lower.includes('awarded')) {
            normalised.awardYear = header;
        }
        // SameAs URL field
        else if (lower.includes('sameas') || (lower.includes('url') && lower.includes('same'))) {
            normalised.sameAs = header;
        }
        // Venue for events
        else if (lower.includes('venue') || lower.includes('place')) {
            normalised.venue = header;
        }
        // Gender
        else if (lower.includes('gender') || lower.includes('sex')) {
            normalised.gender = header;
        }
        // Position
        else if (lower.includes('position')) {
            normalised.position = header;
        }
        // Profile image
        else if (lower.includes('image') || lower.includes('photo')) {
            normalised.profileImage = header;
        }
    });

    return normalised;
}

/**
 * Process athlete data from *node*_person files
 */
async function processAthletes(rows, headerMap) {
    const athletes = rows
        .filter(row => row[headerMap.name]?.trim())
        .map(row => {
            let altRaw = row[headerMap.alternateName];
            let alternateNames = [];
            if (altRaw && typeof altRaw === 'string') {
                alternateNames = altRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean);
            } else if (Array.isArray(altRaw)) {
                alternateNames = altRaw.map(s => s.trim()).filter(Boolean);
            }
            if (alternateNames.length === 0 && row[headerMap.name]) {
                alternateNames = [row[headerMap.name].trim()];
            }

            let rolesRaw = row[headerMap.roles];
            let roles = ['athlete'];
            if (rolesRaw && typeof rolesRaw === 'string') {
                const parsed = rolesRaw.split(/[;,]/).map(r => r.trim()).filter(Boolean);
                if (parsed.length > 0) roles = parsed;
            }

            return {
                name: row[headerMap.name]?.trim(),
                sport: row[headerMap.sport]?.trim() || 'Unknown',
                nationality: row[headerMap.location]?.trim() || '',
                birthDate: row[headerMap.birthDate] || row[headerMap.date]?.trim() || null,
                gender: row[headerMap.gender]?.trim() || 'Female',
                profileImage: row[headerMap.profileImage]?.trim() || null,
                position: row[headerMap.position]?.trim() || null,
                roles,
                alternateNames,
                organisation: row[headerMap.organisation]?.trim() || null,
            };
        });

    console.log(`👤 Processing ${athletes.length} athletes`);

    const limit = pLimit(CONCURRENCY);

    await Promise.allSettled(
        athletes.map(athlete =>
            limit(async () => {
                try {
                    let exists = false;
                    try {
                        const res = await axios.get(`${API_BASE}/athletes/search`, {
                            params: { query: athlete.name, sport: athlete.sport },
                            timeout: 5000
                        });
                        exists = res.data?.players?.some(p => p.name.toLowerCase() === athlete.name.toLowerCase());
                    } catch (searchErr) {
                        console.error(`🔍 Search failed for ${athlete.name}:`, searchErr.response?.data || searchErr.message);
                    }

                    if (exists) {
                        console.log(`👤 Skipping existing athlete: ${athlete.name}`);
                        return;
                    }
                    // 1. Create or update the athlete
                    const response = await axios.post(`${API_BASE}/athletes/`, {
                        name: athlete.name,
                        sport: athlete.sport,
                        nationality: athlete.nationality,
                        gender: athlete.gender,
                        profileImage: athlete.profileImage,
                        birthDate: athlete.birthDate,
                        position: athlete.position,
                        roles: athlete.roles,
                        alternateNames: athlete.alternateNames,
                    }, {
                        timeout: 5000
                    });
                    console.log(`👤 Created/Updated athlete: ${athlete.name}`);

                    // Use uuid if present, otherwise fallback to id or player.uuid
                    const athleteData = response.data;
                    const athleteId = athleteData.uuid || athleteData.id || athleteData.player?.uuid;

                    // 2. Link to organisation if available
                    if (athlete.organisation && athleteId) {
                        await axios.post(`${API_BASE}/athletes/${athleteId}/organisation`, {
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

            // Special case: if name contains "olympics", set role to "olympics"
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
                profileImage: row[headerMap.profileImage]?.trim() || null,
            };
        });

    console.log(`📅 Processing ${events.length} events`);

    // First, check if the events endpoint exists
    try {
        await axios.get(`${API_BASE}/events/list`, { timeout: 2000 });
        console.log(`Events API endpoint is available`);

        // Process events with API calls
        const limit = pLimit(CONCURRENCY);
        await Promise.allSettled(
            events.map(event =>
                limit(async () => {
                    try {
                        await axios.post(`${API_BASE}/events/`, {
                            name: event.name,
                            sport: event.sport,
                            location: event.location,
                            roles: event.roles,
                            year: event.year,
                            sameAs: event.sameAs,
                            profileImage: event.profileImage,
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
        // Events endpoint doesn't exist - just log the data
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
            sponsor: row[headerMap.sponsor]?.trim() || null,
        }));

    console.log(`🏆 Processing ${awards.length} awards`);

    const limit = pLimit(CONCURRENCY);

    await Promise.allSettled(
        awards.map(award =>
            limit(async () => {
                try {
                    await axios.post(`${API_BASE}/events/`, {
                        name: award.name,
                        sport: award.sport,
                        location: null,
                        roles: 'award',
                        year: null,
                        sameAs: null,
                    }, { timeout: 5000 });
                    console.log(`🏆 Created award event: ${award.name}`);

                    if (award.sponsor) {
                        try {
                            await axios.post(`${API_BASE}/organisations/`, {
                                name: award.sponsor,
                                sport: award.sport,
                                roles: 'Sponsor',
                            }, { timeout: 5000 });
                            console.log(`   ↳ Created sponsor: ${award.sponsor}`);
                        } catch (orgErr) {
                            if (orgErr.response && orgErr.response.status === 409) {
                                console.log(`   ↳ Sponsor exists: ${award.sponsor}`);
                            } else {
                                console.error(`   ⚠️  Error creating sponsor ${award.sponsor}:`, orgErr.response?.data || orgErr.message);
                            }
                        }
                    }

                } catch (err) {
                    console.error(`❗️ Error processing award ${award.name}:`, err.response?.data || err.message);
                }
            })
        )
    );
}

/**
 * Process sport data from node_sport files using POST /sports/ (one at a time).
 * Fields: name (string), alternateName (array), iocDisciplineCode (string)
 */
async function processSports(rows, headerMap) {
    // Prep sport object
    const sports = rows
        .filter(row => row[headerMap.name]?.trim())
        .map(row => {
            const name = row[headerMap.name]?.trim();
            let alternateNameRaw = row[headerMap.alternateName];
            let alternateName = [];

            // Convert alternateName to array
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

            // Ensure at least one alternateName
            if (alternateName.length === 0 && name) alternateName = [name];

            // IOC Discipline Code
            const iocDisciplineCode = row[headerMap['IOC Discipline Code']]?.trim() || "";

            return {
                name,
                alternateName,
                iocDisciplineCode,
            };
        });

    console.log(`⚽ Uploading ${sports.length} sports using POST /sports/...`);

    const limit = pLimit(CONCURRENCY);

    await Promise.allSettled(
        sports.map(sport =>
            limit(async () => {
                try {
                    const response = await axios.post(`${API_BASE}/sports/`, sport, { timeout: 10000 });
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
 * Properties: startName, endName, relationshipType (SPONSORED_BY, PARTICIPATES_IN, WON, TRAINED_BY, SPORT_AWARD), year, event
 */
async function processRelationships(rows, headerMap) {
    const relationships = rows
        .filter(row => row[headerMap.startName]?.trim() && row[headerMap.endName]?.trim())
        .map(row => ({
            startName: row[headerMap.startName]?.trim(),
            endName: row[headerMap.endName]?.trim(),
            relationshipType: row[headerMap.relationshipType]?.trim() || 'PARTICIPATES_IN', // Default to PARTICIPATES_IN
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
                    // Detect what type of nodes we're dealing with
                    const isStartNameAward = isLikelyAward(rel.startName);
                    const isEndNameEvent = isLikelyEvent(rel.endName);
                    const isEndNameSport = isLikelySport(rel.endName);
                    const isEndNameOrg = isLikelyOrganisation(rel.endName);

                    // Create Award node if startName looks like an award
                    if (isStartNameAward) {
                        console.log(`🏆 Would create award node: ${rel.startName}`);
                        // Awards could be created as Event nodes with roles="award"
                    }

                    // Create Event node if endName looks like an event/championship
                    if (isEndNameEvent) {
                        console.log(`📅 Would create event node: ${rel.endName}`);
                        // Events like "IAAF World Championships" should be Event nodes
                    }

                    // Create Sport node if endName is a sport
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

                    // Create Organisation node if endName looks like an organisation
                    if (isEndNameOrg && !isEndNameSport && !isEndNameEvent) {
                        try {
                            await axios.post(`${API_BASE}/org/`, {
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

                    // Log the relationship with properties
                    const relationshipProps = [];
                    if (rel.year) relationshipProps.push(`year: "${rel.year}"`);
                    if (rel.event) relationshipProps.push(`event: "${rel.event}"`);

                    const propsString = relationshipProps.length > 0 ? ` {${relationshipProps.join(', ')}}` : '';

                    console.log(`🔗 Would create relationship: (${rel.startName}) -[${rel.relationshipType}${propsString}]-> (${rel.endName})`);

                    // Provide specific guidance based on relationship type
                    if (rel.relationshipType === 'SPORT_AWARD') {
                        console.log(`   🏆 Award Relationship: "${rel.startName}" is a sport award for event "${rel.endName}"`);
                        if (rel.year) console.log(`      📅 Year: ${rel.year}`);
                        if (rel.event) console.log(`      🎯 Event: ${rel.event}`);
                    } else if (rel.relationshipType === 'PARTICIPATES_IN') {
                        // This is an athlete participating in an organisation/team
                        console.log(`   👤 Athlete-Organisation: "${rel.startName}" participates in "${rel.endName}"`);
                        console.log(`      🔗 Use existing: POST /api/athletes/{athleteId}/organisation with organisationName: ${rel.endName}`);
                        console.log(`      📝 Need to find athlete ID first, then link to organisation`);
                    } else if (rel.relationshipType === 'SPONSORED_BY') {
                        console.log(`   💰 Sponsorship: "${rel.startName}" sponsored by "${rel.endName}"`);
                    } else if (rel.relationshipType === 'WON') {
                        console.log(`   🥇 Won: "${rel.startName}" won "${rel.endName}"`);
                        if (rel.year) console.log(`      📅 Year: ${rel.year}`);
                        if (rel.event) console.log(`      🎯 Event: ${rel.event}`);
                    } else if (rel.relationshipType === 'TRAINED_BY') {
                        console.log(`   🏃 Training: "${rel.startName}" trained by "${rel.endName}"`);
                    } else {
                        console.log(`   🔗 Custom relationship type - may need specific endpoint for ${rel.relationshipType}`);
                    }

                    // Show Cypher example for manual creation
                    console.log(`   💾 Cypher: MATCH (a {name: "${rel.startName}"}), (b {name: "${rel.endName}"}) CREATE (a)-[:${rel.relationshipType}${propsString}]->(b)`);

                } catch (err) {
                    console.error(`❗️ Error processing relationship ${rel.startName} -> ${rel.endName}:`,
                        err.response?.data || err.message);
                }
            })
        )
    );
}

/**
 * Helper function to detect if a name is likely an event
 */
function isLikelyEvent(name) {
    const eventKeywords = ['championship', 'championships', 'cup', 'tournament', 'games', 'olympics', 'world', 'competition', 'league', 'series', 'open', 'masters', 'classic', 'grand prix', 'bowl'];
    const lowerName = name.toLowerCase();
    return eventKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Helper function to detect if a name is likely an award
 */
function isLikelyAward(name) {
    const awardKeywords = ['gold', 'silver', 'bronze', 'medal', 'award', 'prize', 'trophy', 'championship', 'cup', 'title', 'winner', 'champion', 'first place', 'second place', 'third place'];
    const lowerName = name.toLowerCase();
    return awardKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Helper function to detect if a name is likely an organisation
 */
function isLikelyOrganisation(name) {
    const orgKeywords = ['federation', 'association', 'committee', 'union', 'league', 'council', 'board', 'organization', 'organisation', 'society', 'club', 'team', 'academy', 'institute', 'foundation', 'iaaf', 'fifa', 'uefa', 'ioc', 'rfc', 'fc', 'united', 'city', 'rovers', 'athletic', 'leinster', 'munster', 'ulster', 'connacht'];
    const lowerName = name.toLowerCase();
    return orgKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Process organisation data (fallback for other org files)
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
                    await axios.post(`${API_BASE}/org/`, {
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
 * Helper function to detect if a name is likely a sport
 */
function isLikelySport(name) {
    const sportKeywords = ['football', 'soccer', 'basketball', 'tennis', 'volleyball', 'swimming', 'athletics', 'track', 'field', 'gymnastics', 'hockey', 'baseball', 'softball', 'golf', 'rugby', 'cricket', 'badminton', 'skiing', 'snowboarding', 'cycling', 'running', 'marathon', 'triathlon', 'pentathlon', 'wrestling', 'boxing', 'judo', 'karate', 'taekwondo', 'fencing', 'archery', 'shooting', 'sailing', 'rowing', 'canoeing', 'weightlifting', 'powerlifting', 'climbing', 'surfing', 'skateboarding'];
    const lowerName = name.toLowerCase();
    return sportKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Generate Wikipedia URL from event name
 */
function generateWikipediaUrl(name) {
    if (!name) return null;
    // Replace spaces with underscores and encode for URL
    const formattedName = name.trim().replace(/\s+/g, '_');
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedName)}`;
}

/**
 * Extract year from event name if present
 */
function extractYearFromName(name) {
    if (!name) return null;
    const yearMatch = name.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : null;
}

//
// ─── MAIN IMPORT PIPELINE ────────────────────────────────────────────────────────
//

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
                console.log(`   Headers: [${headers.map(h => `"${h}"`).join(', ')}]`); // Show headers with quotes to see spacing issues

                // Detect file type based on filename
                const csvType = detectCsvType(filename);
                console.log(`   Detected type: ${csvType}`);

                if (csvType === 'unknown') {
                    console.log(`   ⚠️  Skipping unknown CSV type`);
                    resolve();
                    return;
                }

                // Normalise headers
                const headerMap = normaliseHeaders(headers);
                console.log(`   Mapped headers:`, headerMap);

                // Debug: Show which relationship type column was detected
                if (csvType === 'relationships') {
                    console.log(`   Relationship type column: ${headerMap.relationshipType || 'NOT FOUND'}`);
                    if (!headerMap.relationshipType) {
                        console.log(`   ⚠️  Warning: No relationship type column found. Will use default 'PARTICIPATES_IN'`);
                    }
                }

                // Process based on type
                try {
                    switch (csvType) {
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

//
// ─── PROCESSING ORDER ────────────────────────────────────────────────────────
//

/**
 * Determine the best processing order for CSV files
 * Process nodes first, then relationships
 */
function sortCsvFilesByType(csvFiles) {
    const order = {
        'sports': 1,      // Create sports first
        'organisations': 2, // Then organisations
        'athletes': 3,    // Then athletes
        'events': 4,      // Then events
        'awards': 5,      // Then awards
        'relationships': 6, // Finally relationships
        'unknown': 7      // Unknown last
    };

    return csvFiles.sort((a, b) => {
        const typeA = detectCsvType(a);
        const typeB = detectCsvType(b);
        return (order[typeA] || 7) - (order[typeB] || 7);
    });
}

(async () => {
    try {
        console.log('🚀 Starting DataElevateher sports data import pipeline...\n');

        // Check if data directory already exists
        if (!fs.existsSync(DOWNLOAD_DIR)) {
            fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
        }

        // 1. Download + unzip the Kaggle dataset
        console.log('📥 Downloading dataset...');
        try {
            execSync(
                `kaggle datasets download -d ${KAGGLE_DATASET} -p ${DOWNLOAD_DIR} --unzip`,
                { env: { ...process.env, KAGGLE_CONFIG_DIR } }
            );
            console.log('✅ Dataset downloaded & extracted to:', DOWNLOAD_DIR);
        } catch (err) {
            console.log('⚠️  Download failed. Checking if files already exist...');
        }

        // 2. Find all CSV files
        const allFiles = fs.readdirSync(DOWNLOAD_DIR);
        const csvFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.csv'));

        if (csvFiles.length === 0) {
            console.error('❌ No CSV files found in', DOWNLOAD_DIR);
            process.exit(1);
        }

        console.log(`\n🔎 Found ${csvFiles.length} CSV file(s):`);
        csvFiles.forEach(file => {
            const type = detectCsvType(file);
            console.log(`   - ${file} → ${type}`);
        });

        // 3. Sort CSV files by type for proper processing order
        const sortedCsvFiles = sortCsvFilesByType(csvFiles);

        console.log('\n📋 Processing order:');
        sortedCsvFiles.forEach((file, index) => {
            const type = detectCsvType(file);
            console.log(`   ${index + 1}. ${file} (${type})`);
        });

        // 4. Process each CSV file in order
        for (const csvFile of sortedCsvFiles) {
            await processCsvFile(csvFile);
        }

        console.log('\n✅ All CSV files processed successfully!');

    } catch (err) {
        console.error('🔥 Pipeline failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
})();