const express = require('express');
const router = express.Router();
const { driver } = require('../neo4j');
const bcrypt = require('bcrypt');
const axios = require('axios');
const saltRounds = 10;
const { sanitizeEmail, sanitizeUsername, sanitizePassword } = require('../utils/inputSanitizers');
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
const personController = new PersonController(personService);
const organisationModel = new Organisation(driver);
const organisationService = new OrganisationService(organisationModel);
const organisationController = new OrganisationController(organisationService, personService);

const graphModel = new Graph(driver);
const graphService = new GraphService(graphModel);

const { isAuthenticated, isAdmin } = require('../authentication');

const passport = require('../utils/passport');
const { validateRegistration, validateLogin } = require('../utils/validators');

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


router.post('/team/upsert', (req, res) => organisationController.upsert(req, res));
router.post('/team/link-athlete', (req, res) => organisationController.link(req, res));
router.post('/team/link-league', (req, res) => organisationController.linkTeamToLeague(req, res));

router.post('/link-to-sport', async (req, res) => {
  const { name, type, sportName } = req.body;

  if (!name || !sportName || !type) {
    return res.status(400).json({ error: 'Missing required fields: name, type, or sportName' });
  }

  const session = driver.session();
  try {
    let matchQuery;
    if (type === 'athlete') {
      matchQuery = 'MATCH (n:Person {name: $name})';
    } else if (type === 'team') {
      matchQuery = 'MATCH (n:Organisation {name: $name})';
    } else {
      return res.status(400).json({ error: 'Invalid type provided. Must be \"athlete\" or \"team\".' });
    }

    const cypher = `
      ${matchQuery}
      MERGE (s:Sport {name: $sportName})
      ON CREATE SET s.label = 'Sport'
      MERGE (n)-[:PARTICIPATES_IN]->(s)
    `;

    await session.run(cypher, { name, sportName });

    res.json({ message: `Linked ${type} ${name} to sport ${sportName}` });
  } catch (err) {
    console.error('Error linking to sport:', err);
    res.status(500).json({ error: 'Failed to link to sport' });
  } finally {
    await session.close();
  }
});

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
router.post('/graph/filtered', async (req, res) => {
  const session = driver.session();
  const { names = [] } = req.body;

  try {
    let result;

    if (names.length > 0) {
      result = await session.run(
        `
        MATCH (a:Person)-[r]-(b:Person)
        WHERE a.name IN $names AND b.name IN $names
        RETURN a, r, b
        `,
        { names }
      );
    } else {
      result = await session.run(
        `
        MATCH (n:Person)-[r:PARTICIPATES_IN]-(m:Sport)
        RETURN n AS a, r, m AS b
        LIMIT 100
        `
      );
    }

    const nodesMap = new Map();
    const edges = [];

    result.records.forEach(record => {
      const a = record.get('a');
      const b = record.get('b');
      const r = record.get('r');

      const mapNode = node => ({
        data: {
          id: node.identity.toString(),
          label: node.properties.name || node.labels[0],
          image: node.properties.profileImage || './images/logo-default-profile.png',
          ...node.properties
        }
      });

      if (!nodesMap.has(a.identity.toString())) nodesMap.set(a.identity.toString(), mapNode(a));
      if (!nodesMap.has(b.identity.toString())) nodesMap.set(b.identity.toString(), mapNode(b));

      edges.push({
        data: {
          id: r.identity.toString(),
          source: a.identity.toString(),
          target: b.identity.toString(),
          label: r.type,
          ...r.properties
        }
      });
    });

    res.json({ nodes: Array.from(nodesMap.values()), edges });
  } catch (err) {
    console.error('Filtered graph error:', err);
    res.status(500).json({ error: 'Failed to get filtered graph' });
  } finally {
    await session.close();
  }
});


// register route
router.post('/register', validateRegistration, async (req, res) => {
  const { username, email, password } = req.body;
  const user = sanitizeUsername(username);
  const mail = sanitizeEmail(email);
  const pass = sanitizePassword(password);

  let session;
  try {
    session = driver.session();
    // Check if email already exists
    const existing = await session.run(
      'MATCH (p:Person {email: $email}) RETURN p',
      { email: mail }
    );
    if (existing.records.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashed = await bcrypt.hash(pass, saltRounds);

    // Create user node
    await session.run(
      `CREATE (p:Person {email: $email, username: $username, password: $password, roles: ['user']})`,
      { email: mail, username: user, password: hashed }
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    if (session) await session.close();
  }
});

router.post('/login', validateLogin, async (req, res) => {
    console.log('>>> LOGIN route hit');
    console.log('>>> request body:', req.body);
  
    const identifier = sanitizeEmail(req.body.email);
    const password = sanitizePassword(req.body.password);
  
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
  
    let session;
    try {
      session = driver.session();
      const result = await session.run(
        'MATCH (p:Person {email: $id}) RETURN p.password AS hash',
        { id: identifier }
      );
  
      if (!result.records.length) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      const hash = result.records[0].get('hash');
  
      if (!hash) {
        return res.status(400).json({ error: 'Account has no password set. Try Google login.' });
      }
  
      const match = await bcrypt.compare(password, hash);
  
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      req.session.user = { identifier };
      res.status(200).json({ message: 'Login successful', user: { identifier } });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    } finally {
      session?.close();
    }
  });
  

router.get('/me', (req, res) => {
  if (req.session?.user) {
    return res.json({ user: req.session.user });
  }
  return res.status(401).json({ error: 'Not authenticated' });
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

router.put('/player/uuid/:uuid', isAuthenticated, async (req, res) => {
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

    res.status(200).json({ message: 'Player updated', person: updatedPerson });
  } catch (err) {
    console.error('Error updating person by UUID:', err);
    res.status(500).json({ error: 'Failed to update player' });
  } finally {
    await session.close();
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

//events calendar
router.get('/calendar-events', async (req, res) => {
  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const apiKey = process.env.GOOGLE_API_KEY;
    const timeMin = new Date().toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&singleEvents=true&orderBy=startTime`;
    const response = await axios.get(url);

    const events = response.data.items.map(event => ({
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    }));

    res.json(events);
  } catch (err) {
    console.error('Failed to fetch calendar events:', err);
    res.status(500).json({ error: 'Calendar fetch error' });
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
  const session = driver.session();
  try {
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
  } finally {
    await session.close();
  }
});

router.post('/graph/knn/setup', async (req, res) => {
  const { dim, iterations, topK } = req.body;
  try {
    await graphService.projectGraph();
    await graphService.computeEmbeddings({ dim, iterations });
    await graphService.writeKnn({ topK });
    res.json({ message: 'kNN setup complete' });
  } catch (err) {
    console.error('kNN setup error:', err);
    res.status(500).json({ error: 'Failed to setup kNN' });
  }
});

router.get('/recommendations/:name', async (req, res) => {
  const { name } = req.params;
  const topK = parseInt(req.query.k) || 5;
  try {
    const recs = await graphService.getSimilar(name, topK);
    res.json(recs);
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

router.get('/graph/pagerank', async (req, res) => {
  try {
    const result = await graphService.getPageRankScoresFromProperty();
    res.json(result);
  } catch (err) {
    console.error('PageRank error:', err);
    res.status(500).json({ error: 'Failed to retrieve PageRank' });
  }
});


router.get('/graph/communities', async (req, res) => {
  try {
    const session = driver.session();
    const result = await session.run(`
      MATCH (p:Person)
      WHERE exists(p.communityId)
      RETURN p.name AS name, p.communityId AS communityId
      ORDER BY communityId
    `);
    const data = result.records.map(r => ({
      name: r.get('name'),
      communityId: r.get('communityId')
    }));
    await session.close();
    res.json(data);
  } catch (err) {
    console.error('Community detection error:', err);
    res.status(500).json({ error: 'Failed to load communities' });
  }
});

router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.BASE_PATH}/login`,
    session: true
  }),
  (req, res) => {
    
    console.log('Google login success:', req.user);
  
    req.session.user = {
      identifier: req.user.email,
      username: req.user.username || req.user.displayName
    };
  
    res.redirect(`${process.env.BASE_PATH}/home`);
  }
);


module.exports = router;
