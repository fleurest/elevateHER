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

/**
 * POST /api/athletes
 * Query string parameters:
// POST   /api/athletes                     → create or update athlete profile
**/
router.post('/', personController.createOrUpdatePerson);

// POST   /api/athletes/:id/organisation    → add PARTICIPATES_IN relationship to team org
router.post('/:id/organisation', personController.linkAthleteToOrg);

// DELETE /api/athletes/:id/organisation/:organisationId → remove PARTICIPATES_IN relationship
router.delete('/:id/organisation/:organisationId', personController.removeAthleteOrganisation);

// GET /api/athletes/:id/network - fetch network around athlete
router.get('/:id/network', personController.getAthleteNetwork);

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
