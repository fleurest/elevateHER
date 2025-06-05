const router = require('express').Router();
const { driver } = require('../../../neo4j');
const { isAuthenticated } = require('../../../authentication');
const Athlete = require('../../../models/Athlete');
const Person = require('../../../models/Person');
const PersonService= require('../../../services/PersonService');
const PersonController = require('../../../controllers/PersonController');

const personModel    = new Person(driver);
const athleteModel   = new Athlete(driver);
const personService  = new PersonService(personModel, driver); 

const personController = new PersonController(personService);

// Athletes route
/**
 * GET /api/athletes
 * Query string parameters:
 * - random
 * - athleteCount
 */

// Athlete routes
// GET    /api/athletes                     → list & search athletes (via query params)
router.get('/', personController.listAthletes);
router.get(
    '/search',
    personController.searchAthletes
  );

// router.get('/', async (req, res, next) => {
//     let session;
//     try {
//         session = driver.session();
//         const shouldFetchRandom = req.query.random;
//         if (shouldFetchRandom) {
//             // Fetches random atheletes
//             const athleteCount = req.query.athleteCount || 5;
//             const result = await session.run(`
//                 MATCH (p:Person)
//                 WHERE 'athlete' IN p.roles
//                 WITH p, rand() AS r
//                 RETURN p LIMIT ${athleteCount}
//               `);

//             const athletes = result.records.map(record => record.get('p').properties);
//             res.json(athletes);
//         } else {
//             // Fetches all atheletes
//             const result = await session.run(
//                 `MATCH (a:Person) WHERE 'athlete' IN a.roles RETURN a.uuid AS id, a.name AS name, a.profileImage AS image`
//             );
//             const athletes = result.records.map(record => ({
//                 id: record.get('id'),
//                 name: record.get('name'),
//                 image: record.get('image')
//             }));
//             res.json(athletes);
//         }
//     } catch (err) {
//         if (session) {
//             await session.close();
//         }
//         next(err);
//     } finally {
//         if (session) {
//             await session.close();
//         }
//     }
// });

/**
 * POST /api/athletes
 * Query string parameters:
// POST   /api/athletes                     → create or update athlete profile
**/
router.post('/', personController.createOrUpdatePerson);

// router.post('/', async (req, res) => {
//     const session = driver.session();
//     try {
//         const { name, sport, nationality, roles = ['athlete'], gender, profileImage = null, birthDate = null, position = null } = req.body;

//         if (!name || !sport) {
//             console.warn('Missing required fields:', { name, sport });
//             return res.status(400).json({ error: 'Missing required fields' });
//         }

//         console.log(`Creating/updating athlete: ${name}`);

//         const result = await session.run(
//             `
//         MERGE (p:Person {name: $name})
//         ON CREATE SET
//           p:Athlete,
//           p.sport = $sport,
//           p.nationality = $nationality,
//           p.roles = $roles,
//           p.gender = $gender,
//           p.profileImage = $profileImage,
//           p.birthDate = $birthDate,
//           p.position = $position
//         ON MATCH SET
//           p.sport = CASE WHEN p.sport <> $sport THEN $sport ELSE p.sport END,
//           p.nationality = CASE WHEN p.nationality <> $nationality THEN $nationality ELSE p.nationality END,
//           p.gender = CASE WHEN p.gender <> $gender THEN $gender ELSE p.gender END,
//           p.profileImage = CASE WHEN p.profileImage <> $profileImage THEN $profileImage ELSE p.profileImage END,
//           p.birthDate = CASE WHEN p.birthDate <> $birthDate THEN $birthDate ELSE p.birthDate END,
//           p.position = CASE WHEN coalesce(p.position, '') <> coalesce($position, '') THEN $position ELSE p.position END,
//           p.roles = CASE WHEN NOT 'athlete' IN p.roles THEN p.roles + 'athlete' ELSE p.roles END
//         RETURN p
//         `,
//             { name, sport, nationality, roles, gender, profileImage, birthDate, position }
//         );

//         const createdPlayer = result.records[0]?.get('p')?.properties;

//         if (!createdPlayer) {
//             return res.status(404).json({ error: 'Failed to create or retrieve player' });
//         }
//         res.status(200).json({ success: true, player: createdPlayer });
//     } catch (err) {
//         console.error('Error creating or updating player:', err.stack || err.message || err);
//         res.status(500).json({ error: 'Failed to create or update player' });
//     } finally {
//         await session.close();
//     }
// });

// POST   /api/athletes/:id/organisation    → add PARTICIPATES_IN relationship to team org
router.post('/:id/organisation', personController.linkAthleteToOrg);

// DELETE /api/athletes/:id/organisation/:organisationId → remove PARTICIPATES_IN relationship
router.delete('/:id/organisation/:organisationId', personController.removeAthleteOrganisation);

router.put('/uuid/:uuid', isAuthenticated, async (req, res) => {
    const { uuid } = req.params;
    const { name, sport, description } = req.body;
  
    const session = driver.session();
  
    try {
      const result = await session.run(
        `
        MATCH (p:Person {uuid: $uuid})
        SET p.name = $name,
            p.sport = $sport,
            p.description = $description
        RETURN p
        `,
        { uuid, name, sport, description }
      );
  
      const updatedPerson = result.records[0]?.get('p')?.properties;
      if (!updatedPerson) {
        return res.status(404).json({ error: 'Person not found' });
      }
  
      res.status(200).json({ message: 'Athlete updated', person: updatedPerson });
    } catch (err) {
      console.error('Error updating athlete by UUID:', err);
      res.status(500).json({ error: 'Failed to update athlete' });
    } finally {
      await session.close();
    }
  });

// Search athletes by name
// GET /search?q=<query>&name=<personName>
// * Query string parameters:
// * - name
// * - sport
// */
// router.get('/search', searchAthletes, async (req, res) => {
//     const { query, sport } = req.query;

//     if (!query || query.trim() === '') {
//         return res.status(400).json({ error: 'Query is required' });
//     }

//     try {
//         const results = await personModel.searchByName({ query, sport });
//         let players = results.map(p => ({
//             id: p.identity.toNumber(),
//             name: p.properties.name,
//             sport: p.properties.sport || null,
//             profileImage: p.properties.profileImage || null,
//             description: p.properties.description || null,
//         }));

//         if (players.length === 0) {
//             const suggestionsRaw = await personModel.suggestSimilarNames(query);
//             const suggestions = suggestionsRaw.map(p => ({
//                 id: p.identity.toNumber(),
//                 name: p.properties.name,
//                 sport: p.properties.sport || null
//             }));
//             return res.json({ players: [], suggestions });
//         }

//         res.json({ players });
//     } catch (err) {
//         console.error('Search error:', err);
//         res.status(500).json({ error: 'Search failed' });
//     }
// });


// Link athletes by name to an organisation
// GET /link?q=<query>&name=<personName>
// * Query string parameters:
// * - link
// */
router.get('/link', personController.linkAthletes);

module.exports = router;
