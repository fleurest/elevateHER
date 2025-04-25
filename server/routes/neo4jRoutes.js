const express = require('express');
const router = express.Router();
const { driver } = require('../neo4j');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { sanitizeUsername, sanitizePassword } = require('../utils/inputSanitizers');
const Person = require('../models/Person');
const PersonService = require('../services/PersonService');
const PersonController = require('../controllers/PersonController');
const path = require('path');
console.log('Looking for Graph at:', path.resolve(__dirname, '../models/Graph'));
const Graph = require('../models/Graph');
const GraphService = require('../services/GraphService');
const { getCalendarEvents, listPastEvents, listUpcomingEvents } = require('../services/EventCalService');
const Organisation = require('../models/Organisation');
const OrganisationService = require('../services/OrganisationService');
const OrganisationController = require('../controllers/OrganisationController');
const personModel = new Person(driver);
const personService = new PersonService(personModel, driver);
const organisationModel = new Organisation(driver);
const organisationService = new OrganisationService(organisationModel);
const organisationController = new OrganisationController(organisationService, personService);

const graphModel = new Graph(driver);
const graphService = new GraphService(graphModel);

const personController = new PersonController(personService);
const { isAuthenticated, isAdmin } = require('../authentication');

// nodes
// router.get('/nodes', async (req, res) => {
//   try {
//     const graph = await graphService.buildBasicGraph();
//     res.json(graph);
//   } catch (err) {
//     console.error('Query error:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// Athletes route
router.get('/athletes', async (req, res) => {
  let session = null;
  try {
    session = driver.session();
    const result = await session.run(
      `MATCH (a:Person) WHERE 'athlete' IN a.roles RETURN a.uuid AS id, a.name AS name, a.profileImage AS image`
    );

    const athletes = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      image: record.get('image')
    }));

    res.json(athletes);
  } catch (err) {
    console.error('Athlete query error:', err);
    res.status(500).json({ error: 'Failed to fetch athletes' });
  } finally {
    if (session) {
      await session.close();
    }
  }
});

router.post('/athlete/create', async (req, res) => {
  try {
    const { name, sport, nationality, roles, gender, profileImage, birthDate } = req.body;

    if (!name || !sport) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = driver.session();
    const result = await session.run(
      `
      CREATE (p:Person:Athlete {
        name: $name,
        sport: $sport,
        nationality: $nationality,
        roles: ['athlete'],
        gender: $gender,
        profileImage: $profileImage,
        birthDate: $birthDate
      })
      RETURN p
      `,
      { name, sport, nationality, roles, gender, profileImage, birthDate }
    );

    const createdPlayer = result.records[0].get('p').properties;

    res.json({ success: true, player: createdPlayer });
  } catch (err) {
    console.error('Error creating player:', err);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

router.post('/team/upsert', (req, res) => organisationController.upsert(req, res));
router.post('/team/link-athlete', (req, res) => organisationController.link(req, res));

// graph
router.get('/graph', async (req, res) => {
  try {
    const graph = await graphService.buildGraph();
    res.json(graph);
  } catch (err) {
    console.error('Graph query error:', err);
    res.status(500).json({ error: 'Failed to get graph data' });
  }
});

// graph filtered (e.g. only PARTICIPATES_IN)
router.get('/graph/filtered', async (req, res) => {
  try {
    const graph = await graphService.buildGraph(100, 'PARTICIPATES_IN');
    res.json(graph);
  } catch (err) {
    console.error('Filtered graph error:', err);
    res.status(500).json({ error: 'Failed to get filtered graph' });
  }
});


// register route
router.post('/register', async (req, res) => {
  const username = sanitizeUsername(req.body.username);
  const password = sanitizePassword(req.body.password);

  if (username.length < 4) {
    return res.status(400).json({ error: 'Username must be at least 4 characters' });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include a letter, number, and symbol'
    });
  }

  try {
    let session = driver.session();
    // Check if user already exists
    const existing = await session.run(
      'MATCH (p:Person {username: $username}) RETURN p',
      { username }
    );

    if (existing.records.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, saltRounds);

    // Create user
    await session.run(
      'CREATE (p:Person {username: $username, password: $password, roles: $roles})',
      { username, password: hash, roles: "user" }
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    if (session) {
      await session.close();
    }
  }
});

router.post('/login', async (req, res) => {
  console.log('>>> LOGIN route hit');
  console.log('>>> request body:', req.body);

  const username = sanitizeUsername(req.body.username);
  const password = sanitizePassword(req.body.password);
  let session = null;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    session = driver.session();
    const result = await session.run(
      'MATCH (p:Person {username: $username}) RETURN p.password AS hash',
      { username }
    );

    if (result.records.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const hash = result.records[0].get('hash');
    const match = await bcrypt.compare(password, hash);

    if (match) {
      req.session.user = { username };
      res.status(200).json({ message: 'Login successful', user: { username } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    if (session) {
      await session.close();
    }
  }
});

router.get('/me', isAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

router.get('/session', (req, res) => {
  if (req.session?.user?.username) {
    return res.status(200).json({ authenticated: true, user: req.session.user });
  } else {
    return res.status(401).json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
    });
    res.json({ message: 'Logged out' });
  });
});

router.post('/user/update', isAuthenticated, async (req, res) => {
  const { username, email = '', location = '', bio = '' } = req.body;
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (p:Person {username: $username})
      SET p.email = $email,
          p.location = $location,
          p.bio = $bio
      RETURN p
      `,
      { username, email, location, bio }
    );

    const updatedProps = result.records[0]?.get('p').properties;
    res.json(updatedProps);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  } finally {
    await session.close();
  }
});

router.get('/refresh', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No token found' });

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    res.json({ username: decoded.username });
  } catch (err) {
    console.error('[SERVER] Token invalid:', err);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

router.get('/user-likes/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const liked = await personModel.getLikedPlayersByUser(username);
    console.log('Liked players from Neo4j:', liked);
    const likedPlayers = liked.map(p => ({
      id: p.identity.toNumber(),
      name: p.properties.name,
      description: p.properties.description || null,
      profileImage: p.properties.profileImage || null
    }));

    res.json(likedPlayers);
  } catch (err) {
    console.error('Error fetching liked players:', err);
    res.status(500).json({ error: 'Failed to fetch liked players' });
  }
});

router.post('/user-likes', isAuthenticated, async (req, res) => {
  const { username, playerName } = req.body;

  if (!username || !playerName) {
    return res.status(400).json({ error: 'Username and player name required' });
  }

  try {
    await personModel.likePlayer(req.session.user.username, playerName);
    res.status(200).json({ message: `${req.session.user.username} liked ${playerName}` });
  } catch (err) {
    console.error('Error creating LIKE relationship:', err);
    res.status(500).json({ error: 'Failed to like player' });
  }
});

router.get('/user-friends/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const friends = await personService.getFriendsForUser(username);
    res.json(friends);
  } catch (err) {
    console.error('Error fetching accepted friends:', err);
    res.status(500).json({ error: 'Could not fetch friends' });
  }
});

router.get('/search', async (req, res) => {
  const { query, sport } = req.query;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const results = await personModel.searchByName({ query, sport });
    let players = results.map(p => ({
      id: p.identity.toNumber(),
      name: p.properties.name,
      sport: p.properties.sport || null,
      profileImage: p.properties.profileImage || null,
      description: p.properties.description || null,
    }));

    if (players.length === 0) {
      const suggestionsRaw = await personModel.suggestSimilarNames(query);
      const suggestions = suggestionsRaw.map(p => ({
        id: p.identity.toNumber(),
        name: p.properties.name,
        sport: p.properties.sport || null
      }));
      return res.json({ players: [], suggestions });
    }

    res.json({ players });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});


router.post('/add-player', isAuthenticated, (req, res) => personController.createOrUpdate(req, res));

router.put('/player/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { name, sport, description } = req.body;

  try {
    const updatedPerson = await personModel.updateById(id, { name, sport, description });
    res.status(200).json({ message: 'Player updated', person: updatedPerson });
  } catch (err) {
    console.error('Error updating person:', err);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

router.get('/search-users', isAuthenticated, async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'No query provided' });

  try {
    const results = await personModel.searchUsers(query);
    res.json(results);
  } catch (err) {
    console.error('Search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.delete('/person/:id', isAdmin, async (req, res) => {
  const session = driver.session();
  const id = parseInt(req.params.id);

  try {
    await session.run(`MATCH (p:Person) WHERE ID(p) = $id DETACH DELETE p`, { id });
    res.json({ message: 'Person deleted successfully' });
  } catch (err) {
    console.error('Error deleting person:', err);
    res.status(500).json({ error: 'Failed to delete person' });
  } finally {
    await session.close();
  }
});

//events calendar
router.get('/calendar-events', async (req, res) => {
  try {
    const calendarId = 'c_e0a01a47aff1ecc1da77e5822cd3d63bc054f441ae359c05fae0552aee58c3cc@group.calendar.google.com';
    const events = await listUpcomingEvents(calendarId);
    res.json(events);
  } catch (err) {
    console.error('Failed to fetch calendar events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// friend request
router.post('/friend-request', isAuthenticated, async (req, res) => {
  const { fromUsername, toUsername } = req.body;

  try {
    await personModel.sendFriendRequest(req.session.user.username, toUsername);
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// friend request accepted
router.post('/friend-accept', async (req, res) => {
  const { fromUsername, toUsername } = req.body;

  try {
    await personModel.acceptFriendRequest(fromUsername, toUsername);
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// incoming friend requests
router.get('/friends/pending-incoming/:username', async (req, res) => {
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

router.get('/user-friends/:username', isAuthenticated, async (req, res) => {
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

router.get('/top-users', async (req, res) => {
  try {
    const users = await personService.getTopUsers();
    res.json(users);
  } catch (error) {
    console.error('[SERVER] Error fetching top users:', error);
    res.status(500).json({ error: 'Failed to fetch top users' });
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

router.get('/calendar-events', async (req, res) => {
  try {
    const calendarId = 'c_e0a01a47aff1ecc1da77e5822cd3d63bc054f441ae359c05fae0552aee58c3cc@group.calendar.google.com';
    const events = await listUpcomingEvents(calendarId);
    res.json(events);
  } catch (err) {
    console.error('Failed to fetch calendar events:', err);
    res.status(500).json({ error: 'Calendar fetch error' });
  }
});

router.get('/past-events', async (req, res) => {
  try {
    const events = await listPastEvents();
    res.json(events);
  } catch (err) {
    console.error('Failed to fetch past events:', err);
    res.status(500).json({ error: 'Past event fetch error' });
  }
});

router.get('/athlete/random', async (req, res) => {
  try {
    const session = driver.session();
    const result = await session.run(`
      MATCH (p:Person)
      WHERE 'athlete' IN p.roles
      WITH p, rand() AS r
      RETURN p LIMIT 5
    `);

    const players = result.records.map(record => record.get('p').properties);
    res.json(players);
  } catch (err) {
    console.error('Failed to fetch random players:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
