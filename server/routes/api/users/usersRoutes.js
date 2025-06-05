const router = require('express').Router();
const { driver } = require('../../../neo4j');
const bcrypt = require('bcrypt');
const { validateRegistration,
  validateLogin,
  checkValidation } = require('../../../utils/validators');
const { isAuthenticated, isAdmin, isVerified } = require('../../../authentication');
const Person = require('../../../models/Person');
const PersonService = require('../../../services/PersonService');
const PersonController = require('../../../controllers/PersonController');

const personModel = new Person(driver);
const personService = new PersonService(personModel, driver);
const personController = new PersonController(personService);



// People route
/**
 * GET /api/people
 * Query string parameters:
 * - 
 * - 
 */

// SIGN UP
router.post('/', personController.createOrUpdatePerson);

// LOGIN
router.post(
  '/login',
  validateLogin,
  checkValidation,
  personController.login
);

// LOGOUT
router.post('/logout', personController.logout);


router.get(
  '/search',
  isAuthenticated,
  personController.searchUsers
);

// REGISTER
router.post(
  '/register',
  validateRegistration,
  checkValidation,
  personController.register
);


router.delete('/uuid/:uuid', isAdmin, async (req, res) => {
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


router.get('/likes/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const graph = await personModel.getLikedAthletesByUser(username);
    console.log('Liked athletes from Neo4j:', graph);
    res.json(graph);
  } catch (err) {
    console.error('Error fetching liked athletes:', err);
    res.status(500).json({ error: 'Failed to fetch liked athletes' });
  }
});

router.post('/likes', isAuthenticated, async (req, res) => {
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

router.delete('/likes', isAuthenticated, async (req, res) => {
  const { athleteName } = req.body;
  if (!athleteName) {
    return res.status(400).json({ error: 'Athlete name required' });
  }

  try {
    await personModel.unlikePlayer(req.session.user.username, athleteName);
    res.status(200).json({ message: `${req.session.user.username} unliked ${athleteName}` });
  } catch (err) {
    console.error('Error deleting LIKE relationship:', err);
    res.status(500).json({ error: 'Failed to unlike athlete' });
  }
});

// GET friends for username
router.get('/friends/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const friends = await personService.getFriendsForUser(username);
    res.json(friends);
  } catch (err) {
    console.error('Error fetching accepted friends:', err);
    res.status(500).json({ error: 'Could not fetch friends' });
  }
});

// USERS TOP 5
router.get('/top', personController.getTopUsers);

router.get('/friends/:username', isAuthenticated, async (req, res) => {
  const { username } = req.params;
  try {
    const records = await graph.getAcceptedFriends(username);
    const elements = [];

    records.forEach(record => {
      const u1 = record.get('u1');
      const rel = record.get('r');
      const u2 = record.get('u2');

      elements.push(
        { data: { id: u1.identity.toString(), label: u1.labels[0], ...u1.properties } },
        { data: { id: u2.identity.toString(), label: u2.labels[0], ...u2.properties } },
        {
          data: {
            id: rel.identity.toString(),
            source: u1.identity.toString(),
            target: u2.identity.toString(),
            label: rel.type,
            ...rel.properties
          }
        }
      );
    });

    res.json(elements);
  } catch (err) {
    console.error('Error fetching friends:', err);
    res.status(500).json({ error: 'Failed to fetch friends graph' });
  }
});


// friend request accepted
router.post('/accept', async (req, res) => {
  const { fromUsername, toUsername } = req.body;

  try {
    await personModel.acceptFriendRequest(fromUsername, toUsername);
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// friend request rejected
router.post('/reject', async (req, res) => {
  const { fromUsername, toUsername } = req.body;

  try {
    await personModel.rejectFriendRequest(fromUsername, toUsername);
    res.json({ message: 'Friend request rejected' });
  } catch (err) {
    console.error('Error rejecting friend request:', err);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// incoming friend requests
router.get('/pending-incoming/:username', async (req, res) => {
  try {
    const results = await personModel.getIncomingFriendRequests(req.params.username);
    res.json({ incoming: results });
  } catch (err) {
    console.error('Error getting incoming requests:', err);
    res.status(500).json({ error: 'Failed to fetch incoming requests' });
  }
});

// outgoing friend requests
router.get('/friends/pending-outgoing/:username',
  //isAuthenticated, 
  async (req, res) => {
    try {
      const results = await personModel.getOutgoingFriendRequests(req.params.username);
      res.json({ outgoing: results });
    } catch (err) {
      console.error('Error getting outgoing requests:', err);
      res.status(500).json({ error: 'Failed to fetch outgoing requests' });
    }
  });

// accepted friends
router.get('/friends/accepted/:username',
  // isAuthenticated, 
  async (req, res) => {
    try {
      const results = await personModel.getAcceptedFriends(req.params.username);
      res.json({ friends: results });
    } catch (err) {
      console.error('Error getting accepted friends:', err);
      res.status(500).json({ error: 'Failed to fetch friends' });
    }
  });



router.get('/top-friends/:username', async (req, res) => {
  try {
    const friends = await personService.getFriendsForUser(req.params.username);
    res.json(friends);
  } catch (error) {
    console.error('Error fetching top friends:', error);
    res.status(500).json({ error: 'Failed to get top friends' });
  }
});

// friend request
router.post('/friend-request', isAuthenticated, async (req, res) => {
  let toUsername;

  if (req.body && req.body.toUsername) {
    toUsername = req.body.toUsername;
  }
  else if (req.params && req.params.toUsername) {
    toUsername = decodeURIComponent(req.params.toUsername);
  }
  else {
    return res.status(400).json({ error: 'toUsername is required' });
  }

  console.log(`🤝 Friend request: ${req.session.user.username} → ${toUsername}`);

  try {
    await personModel.sendFriendRequest(req.session.user.username, toUsername);
    res.json({
      message: 'Friend request sent',
      from: req.session.user.username,
      to: toUsername
    });
  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

router.post('/sendfriendrequest/:fromUsername/:toUsername', isAuthenticated, (req, res) => {
  req.body = { toUsername: decodeURIComponent(req.params.toUsername) };
  return router.handle({ ...req, method: 'POST', url: '/friend-request' }, res);
});

// POST /api/users/update - Update user profile
router.post('/update', isAuthenticated, personController.updateProfile);

module.exports = router;