const express = require('express');
const router = express.Router();
const { driver } = require('../neo4j');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { sanitizeUsername, sanitizePassword } = require('../../utils/inputSanitizers');

// Get a few nodes
router.get('/nodes', async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run('MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 10');

    const nodesMap = new Map();
    const edges = [];

    result.records.forEach(record => {
      const startNode = record.get('n');
      const endNode = record.get('m');
      const rel = record.get('r');

      // Add a start node
      if (!nodesMap.has(startNode.identity.toString())) {
        nodesMap.set(startNode.identity.toString(), {
          data: {
            id: startNode.identity.toString(),
            label: startNode.labels[0],
            ...startNode.properties
          }
        });
      }

      // Add an end node
      if (!nodesMap.has(endNode.identity.toString())) {
        nodesMap.set(endNode.identity.toString(), {
          data: {
            id: endNode.identity.toString(),
            label: endNode.labels[0],
            ...endNode.properties
          }
        });
      }

      // Add a relationship/edge
      edges.push({
        data: {
          id: rel.identity.toString(),
          source: startNode.identity.toString(),
          target: endNode.identity.toString(),
          label: rel.type
        }
      });
    });

    const nodes = Array.from(nodesMap.values());
    res.json({ nodes, edges });
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await session.close();
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

// Endpoint for graph data for diagram
router.get('/graph', async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      'MATCH p=()-[:PARTICIPATES_IN]->() RETURN p LIMIT 25;'
    );

    const nodesMap = new Map();
    const edges = [];

    result.records.forEach(record => {
      const path = record.get('p');

      path.segments.forEach(segment => {
        const startNode = segment.start;
        const endNode = segment.end;
        const rel = segment.relationship;

        // Start node
        if (!nodesMap.has(startNode.identity.toString())) {
          const profileImage = startNode.properties.profileImage;
          nodesMap.set(startNode.identity.toString(), {
            data: {
              id: startNode.identity.toString(),
              label: startNode.properties.name || startNode.labels[0],
              image: (profileImage && profileImage !== 'null' && profileImage !== '')
                ? profileImage
                : process.env.DEFAULT_IMAGE_URL,
              ...startNode.properties
            }
          });
        }

        // End node
        if (!nodesMap.has(endNode.identity.toString())) {
          const profileImage = endNode.properties.profileImage;
          nodesMap.set(endNode.identity.toString(), {
            data: {
              id: endNode.identity.toString(),
              label: endNode.properties.name || endNode.labels[0],
              image: (profileImage && profileImage !== 'null' && profileImage !== '')
                ? profileImage
                : './images/logo-default-profile.png',
              ...endNode.properties
            }
          });
        }

        // Add relationship/edge
        edges.push({
          data: {
            id: rel.identity.toString(),
            source: startNode.identity.toString(),
            target: endNode.identity.toString(),
            label: rel.type.replace(/_/g, ' ').toLowerCase(),
            title: rel.type.replace(/_/g, ' ').toLowerCase()
          }
        });
      });
    });

    const nodes = Array.from(nodesMap.values());
    res.json({ nodes, edges });
  } catch (err) {
    console.error('Graph query error:', err);
    res.status(500).json({ error: 'Failed to get graph data' });
  } finally {
    await session.close();
  }
});

// Register route
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
  console.log('>>> LOGIN route hit');
  console.log('>>> request body:', req.body);
  const username = sanitizeUsername(req.body.username);
  const password = sanitizePassword(req.body.password);

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const session = driver.session();
  
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
      req.session.user = { username };
      res.status(200).json({ message: 'Login successful', user: { username } });
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

router.get('/me', (req, res) => {
  if (req.session?.user?.username) {
    return res.json({ username: req.session.user.username });
  } else {
    return res.status(401).json({ error: 'Not authenticated' });
  }
});

router.get('/session', (req, res) => {
  if (req.session?.user?.username) {
    return res.status(200).json({ authenticated: true, user: req.session.user });
  } else {
    return res.status(401).json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out' });
  });
});


router.get('/user-likes/:username', async (req, res) => {
  const { username } = req.params;
  const session = driver.session();
  console.time('FetchUserLikes');

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[:LIKED]->(p:Player)
      RETURN p
      LIMIT 5
      `,
      { username }
    );

    const likedPlayers = result.records.map(record => {
      const player = record.get('p');
      return {
        id: player.identity.toNumber(),
        name: player.properties.name,
        description: player.properties.description || null,
        profileImage: player.properties.profileImage || null
      };
    });

    res.json(likedPlayers);
  } catch (err) {
    console.error('Error fetching liked players:', err);
    res.status(500).json({ error: 'Failed to fetch liked players' });
  } finally {
    await session.close();
  }
});

router.post('/user-likes', async (req, res) => {
  const { username, playerName } = req.body;
  const session = driver.session();

  if (!username || !playerName) {
    return res.status(400).json({ error: 'Username and player name required' });
  }

  try {
    await session.run(
      `
      MERGE (u:User {username: $username})
      MERGE (p:Player {name: $playerName})
      MERGE (u)-[:LIKED]->(p)
      `,
      { username, playerName }
    );

    res.status(200).json({ message: `${username} liked ${playerName}` });
  } catch (err) {
    console.error('Error creating LIKE relationship:', err);
    res.status(500).json({ error: 'Failed to like player' });
  } finally {
    await session.close();
  }
});

router.get('/search', async (req, res) => {
  const { query, sport } = req.query;
  const session = driver.session();

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const cypher = `
      MATCH (p:Player)
      WHERE toLower(p.name) CONTAINS toLower($query)
      ${sport ? 'AND toLower(p.sport) = toLower($sport)' : ''}
      RETURN p LIMIT 10
    `;

    const result = await session.run(cypher, { query, sport });

    let players = result.records.map(record => {
      const p = record.get('p');
      return {
        id: p.identity.toNumber(),
        name: p.properties.name,
        sport: p.properties.sport || null,
        profileImage: p.properties.profileImage || null,
        description: p.properties.description || null,
      };
    });

    // no players found? ok fetch top 5 similar names
    if (players.length === 0) {
      const altResult = await session.run(
        `
        MATCH (p:Player)
        WITH p, apoc.text.sorensenDiceSimilarity(toLower(p.name), toLower($query)) AS similarity
        WHERE similarity > 0.1
        RETURN p ORDER BY similarity DESC LIMIT 5
        `,
        { query }
      );

      const suggestions = altResult.records.map(record => {
        const p = record.get('p');
        return {
          id: p.identity.toNumber(),
          name: p.properties.name,
          sport: p.properties.sport || null,
        };
      });

      return res.json({ players: [], suggestions });
    }

    res.json({ players });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  } finally {
    await session.close();
  }
});

router.post('/add-player', async (req, res) => {
  const { name, sport } = req.body;
  const session = driver.session();

  if (!name || !sport) {
    return res.status(400).json({ error: 'Name and sport are required' });
  }

  try {
    await session.run(
      `MERGE (p:Player {name: $name}) SET p.sport = $sport`,
      { name, sport }
    );

    res.status(201).json({ message: `Player ${name} added to ${sport}` });
  } catch (err) {
    console.error('Add player error:', err);
    res.status(500).json({ error: 'Failed to add player' });
  } finally {
    await session.close();
  }
});

module.exports = router;
