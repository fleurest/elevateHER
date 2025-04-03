const express = require('express');
const router = express.Router();
const { driver } = require('../neo4j');
const bcrypt = require('bcrypt');
const saltRounds = 10;

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

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const session = driver.session();

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    await session.run(
      'CREATE (u:User {username: $username, password: $password})',
      { username, password: hash }
    );
    res.status(201).send({ message: 'User registered' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Registration failed' });
  } finally {
    await session.close();
  }
});

module.exports = router;
