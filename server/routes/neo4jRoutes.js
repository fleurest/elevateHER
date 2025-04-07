const express = require('express');
const router = express.Router();
const { driver } = require('../neo4j');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { sanitizeUsername, sanitizePassword } = require('../utils/inputSanitizers');
const Person = require('../models/Person');
const PersonService = require('../services/PersonService');
const PersonController = require('../controllers/PersonController');
const Graph = require('../models/Graph');
const GraphService = require('../services/GraphService');

const graphModel = new Graph(driver);
const graphService = new GraphService(graphModel);
const personModel = new Person(driver);
const personService = new PersonService(personModel);
const personController = new PersonController(personService);

// Nodes
router.get('/nodes', async (req, res) => {
  try {
    const graph = await graphService.buildBasicGraph();
    res.json(graph);
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Athletes route
router.get('/athletes', async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      'MATCH (a:Athlete) RETURN a.athleteId AS id, a.name AS name, a.profileImage AS image'
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
  const session = driver.session();

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
    // Check if user already exists
    const existing = await session.run(
      'MATCH (u:User {username: $username}) RETURN u',
      { username }
    );

    if (existing.records.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, saltRounds);

    // Create user
    await session.run(
      'CREATE (u:User {username: $username, password: $password})',
      { username, password: hash }
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    await session.close();
  }
});

// Login route
router.post('/login', async (req, res) => {
  const username = sanitizeUsername(req.body.username);
  const password = sanitizePassword(req.body.password);

  try {
    const result = await session.run(
      'MATCH (u:User {username: $username}) RETURN u.password AS hash',
      { username }
    );

    if (result.records.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const hash = result.records[0].get('hash');
    const match = await bcrypt.compare(password, hash);

    if (match) {
      res.status(200).json({ message: 'Login successful', username });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    await session.close();
  }
});

router.get('/user-likes/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const liked = await personModel.getLikedPlayersByUser(username);

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

router.post('/user-likes', async (req, res) => {
  const { username, playerName } = req.body;

  if (!username || !playerName) {
    return res.status(400).json({ error: 'Username and player name required' });
  }

  try {
    await personModel.likePlayer(username, playerName);
    res.status(200).json({ message: `${username} liked ${playerName}` });
  } catch (err) {
    console.error('Error creating LIKE relationship:', err);
    res.status(500).json({ error: 'Failed to like player' });
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


router.post('/add-player', (req, res) => personController.createOrUpdate(req, res));

router.put('/player/:id', async (req, res) => {
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

module.exports = router;
