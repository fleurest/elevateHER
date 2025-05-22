const router = require('express').Router();

router.delete('/person/uuid/:uuid', isAdmin, async (req, res) => {
    const { uuid } = req.params;
    const session = driver.session();
  
    try {
      const personCheck = await session.run(
        `MATCH (p:Person {uuid: $uuid}) RETURN p.name AS name`,
        { uuid }
      );
  
      if (personCheck.records.length === 0) {
        return res.status(404).json({ error: 'Person not found.' });
      }
  
      const personName = personCheck.records[0].get('name');
  
      await session.run(
        `MATCH (p:Person {uuid: $uuid}) DETACH DELETE p`,
        { uuid }
      );
      // GDPR-compliant logging
      console.log(`[GDPR] Data erased for UUID: ${uuid}, Name: ${personName}, Timestamp: ${new Date().toISOString()}`);
      res.status(200).json({ message: 'Person data erased successfully for GDPR compliance.', uuid });
    } catch (err) {
      console.error('Error deleting person by UUID:', err);
      res.status(500).json({ error: 'Failed to delete person' });
    } finally {
      await session.close();
    }
  });


router.get('/person/likes/:username', async (req, res) => {
    const { username } = req.params;
  
    try {
      const liked = await personModel.getLikedAthletesByUser(username);
      console.log('Liked athletes from Neo4j:', liked);
      const likedPlayers = liked.map(p => ({
        id: p.identity.toNumber(),
        name: p.properties.name,
        description: p.properties.description || null,
        profileImage: p.properties.profileImage || null
      }));
  
      res.json(likedPlayers);
    } catch (err) {
      console.error('Error fetching liked athletes:', err);
      res.status(500).json({ error: 'Failed to fetch liked athletes' });
    }
  });
  
  router.post('/person/likes', isAuthenticated, async (req, res) => {
    const { username, athleteName } = req.body;
  
    if (!username || !athleteName) {
      return res.status(400).json({ error: 'Username and athlete name required' });
    }
  
    try {
      await personModel.likePlayer(req.session.user.username, athleteName);
      res.status(200).json({ message: `${req.session.user.username} liked ${athleteName}` });
    } catch (err) {
      console.error('Error creating LIKE relationship:', err);
      res.status(500).json({ error: 'Failed to like athlete' });
    }
  });
  
  router.get('/person/friends/:username', async (req, res) => {
    const { username } = req.params;
  
    try {
      const friends = await personService.getFriendsForUser(username);
      res.json(friends);
    } catch (err) {
      console.error('Error fetching accepted friends:', err);
      res.status(500).json({ error: 'Could not fetch friends' });
    }
  });
  
  router.put('/athlete/uuid/:uuid', isAuthenticated, async (req, res) => {
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
  
module.exports = router;