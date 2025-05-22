const router = require('express').Router();

// router.post('/add-player', isAuthenticated, (req, res) => personController.createOrUpdate(req, res));

// Athletes route
/**
 * GET /api/athletes
 * Query string parameters:
 * - random
 * - athleteCount
 */
router.get('/', async (req, res, next) => {
    let session;
    try {
        session = driver.session();
        const shouldFetchRandom = req.query.random;
        if (shouldFetchRandom) {
            // Fetches random atheletes
            const athleteCount = req.query.athleteCount || 5;
            const result = await session.run(`
                MATCH (p:Person)
                WHERE 'athlete' IN p.roles
                WITH p, rand() AS r
                RETURN p LIMIT ${athleteCount}
              `);

            const athletes = result.records.map(record => record.get('p').properties);
            res.json(athletes);
        } else {
            // Fetches all atheletes
            const result = await session.run(
                `MATCH (a:Person) WHERE 'athlete' IN a.roles RETURN a.uuid AS id, a.name AS name, a.profileImage AS image`
            );
            const athletes = result.records.map(record => ({
                id: record.get('id'),
                name: record.get('name'),
                image: record.get('image')
            }));
            res.json(athletes);
        }
    } catch (err) {
        if (session) {
            await session.close();
        }
        next(err);
    } finally {
        if (session) {
            await session.close();
        }
    }
});

router.post('/athlete/create', async (req, res) => {
    const session = driver.session();
    try {
        const { name, sport, nationality, roles = ['athlete'], gender, profileImage = null, birthDate = null, position = null } = req.body;

        if (!name || !sport) {
            console.warn('Missing required fields:', { name, sport });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`Creating/updating athlete: ${name}`);

        const result = await session.run(
            `
        MERGE (p:Person {name: $name})
        ON CREATE SET
          p:Athlete,
          p.sport = $sport,
          p.nationality = $nationality,
          p.roles = $roles,
          p.gender = $gender,
          p.profileImage = $profileImage,
          p.birthDate = $birthDate,
          p.position = $position
        ON MATCH SET
          p.sport = CASE WHEN p.sport <> $sport THEN $sport ELSE p.sport END,
          p.nationality = CASE WHEN p.nationality <> $nationality THEN $nationality ELSE p.nationality END,
          p.gender = CASE WHEN p.gender <> $gender THEN $gender ELSE p.gender END,
          p.profileImage = CASE WHEN p.profileImage <> $profileImage THEN $profileImage ELSE p.profileImage END,
          p.birthDate = CASE WHEN p.birthDate <> $birthDate THEN $birthDate ELSE p.birthDate END,
          p.position = CASE WHEN coalesce(p.position, '') <> coalesce($position, '') THEN $position ELSE p.position END,
          p.roles = CASE WHEN NOT 'athlete' IN p.roles THEN p.roles + 'athlete' ELSE p.roles END
        RETURN p
        `,
            { name, sport, nationality, roles, gender, profileImage, birthDate, position }
        );

        const createdPlayer = result.records[0]?.get('p')?.properties;

        if (!createdPlayer) {
            return res.status(404).json({ error: 'Failed to create or retrieve player' });
        }
        res.status(200).json({ success: true, player: createdPlayer });
    } catch (err) {
        console.error('Error creating or updating player:', err.stack || err.message || err);
        res.status(500).json({ error: 'Failed to create or update player' });
    } finally {
        await session.close();
    }
});


// GET /atheletes/{athleteId}

module.exports = router;
