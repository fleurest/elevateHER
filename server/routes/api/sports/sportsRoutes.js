const router = require('express').Router();
const { driver } = require('../../../neo4j');

// Create or update a sport
router.post('/create', async (req, res) => {
  const { name, type, category, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Sport name is required' });
  }

  const session = driver.session();
  try {
    const cypher = `
      MERGE (s:Sport {name: $name})
      ON CREATE SET 
        s.type = $type,
        s.category = $category,
        s.description = $description,
        s.label = 'Sport',
        s.createdAt = datetime()
      ON MATCH SET
        s.type = COALESCE($type, s.type),
        s.category = COALESCE($category, s.category),
        s.description = COALESCE($description, s.description),
        s.updatedAt = datetime()
      RETURN s
    `;

    const result = await session.run(cypher, {
      name,
      type: type || 'Sport',
      category: category || null,
      description: description || null
    });

    res.json({ 
      message: `Sport ${name} created/updated successfully`,
      sport: result.records[0]?.get('s').properties 
    });

  } catch (err) {
    console.error('Error creating sport:', err);
    res.status(500).json({ error: 'Failed to create sport' });
  } finally {
    await session.close();
  }
});

// Link athlete or team to sport 
router.post('/', async (req, res) => {
  const { name, type, sportName } = req.body;

  if (!name || !sportName || !type) {
    return res.status(400).json({ 
      error: 'Missing required fields: name, type, or sportName' 
    });
  }

  const session = driver.session();
  try {
    let matchQuery, relationshipType;
    
    if (type === 'athlete') {
      matchQuery = 'MATCH (n:Person {name: $name})';
      relationshipType = 'PARTICIPATES_IN';
    } else if (type === 'team') {
      matchQuery = 'MATCH (n:Organisation {name: $name})';
      relationshipType = 'COMPETES_IN';
    } else {
      return res.status(400).json({ 
        error: 'Invalid type provided. Must be "athlete" or "team".' 
      });
    }

    const cypher = `
      ${matchQuery}
      MERGE (s:Sport {name: $sportName})
      ON CREATE SET s.label = 'Sport', s.createdAt = datetime()
      MERGE (n)-[:${relationshipType}]->(s)
      RETURN n, s
    `;

    await session.run(cypher, { name, sportName });

    res.json({ 
      message: `Linked ${type} ${name} to sport ${sportName}` 
    });
    
  } catch (err) {
    console.error('Error linking to sport:', err);
    res.status(500).json({ error: 'Failed to link to sport' });
  } finally {
    await session.close();
  }
});

// Get all sports
router.get('/', async (req, res) => {
  const session = driver.session();
  try {
    const cypher = `
      MATCH (s:Sport)
      OPTIONAL MATCH (s)<-[:PARTICIPATES_IN]-(athlete:Person)
      OPTIONAL MATCH (s)<-[:COMPETES_IN]-(team:Organisation)
      RETURN s, 
             count(DISTINCT athlete) as athleteCount,
             count(DISTINCT team) as teamCount
      ORDER BY s.name
    `;

    const result = await session.run(cypher);
    const sports = result.records.map(record => ({
      ...record.get('s').properties,
      athleteCount: record.get('athleteCount').toNumber(),
      teamCount: record.get('teamCount').toNumber()
    }));

    res.json(sports);

  } catch (err) {
    console.error('Error fetching sports:', err);
    res.status(500).json({ error: 'Failed to fetch sports' });
  } finally {
    await session.close();
  }
});

module.exports = router;