const router = require('express').Router();
const { driver } = require('../../../neo4j');

/**
 * POST /api/relationships
 * Body: { sourceName, sourceType, targetName, targetType, relationshipType }
 * Creates a relationship between nodes found by name and label.
 */
router.post('/', async (req, res) => {
  const { sourceName, sourceType, targetName, targetType, relationshipType } = req.body;

  if (!sourceName || !targetName || !sourceType || !targetType || !relationshipType) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const validTypes = {
    person: 'Person',
    organisation: 'Organisation',
    sport: 'Sport',
    event: 'Event'
  };

  const startLabel = validTypes[sourceType];
  const endLabel = validTypes[targetType];

  if (!startLabel || !endLabel) {
    return res.status(400).json({ error: 'Invalid node type' });
  }

  const session = driver.session();

  try {
    // Check existence of start and end nodes
    const checkCypher = `
      OPTIONAL MATCH (a:${startLabel} {name: $sourceName})
      OPTIONAL MATCH (b:${endLabel} {name: $targetName})
      RETURN count(a) AS acount, count(b) AS bcount
    `;

    const checkResult = await session.run(checkCypher, { sourceName, targetName });
    const acount = checkResult.records[0].get('acount').toInt();
    const bcount = checkResult.records[0].get('bcount').toInt();

    if (acount === 0 || bcount === 0) {
      return res.status(404).json({
        error: 'Node not found',
        missing: acount === 0 && bcount === 0 ? 'both' : acount === 0 ? 'source' : 'target'
      });
    }

    const cypher = `
      MATCH (a:${startLabel} {name: $sourceName})
      MATCH (b:${endLabel} {name: $targetName})
      MERGE (a)-[r:${relationshipType}]->(b)
      RETURN a, b, type(r) AS type
    `;

    const result = await session.run(cypher, { sourceName, targetName });

    if (result.records.length === 0) {
      return res.status(500).json({ error: 'Failed to create relationship' });
    }

    res.json({
      message: 'Relationship created',
      start: sourceName,
      end: targetName,
      type: relationshipType
    });
  } catch (err) {
    console.error('Error creating relationship:', err);
    res.status(500).json({ error: 'Failed to create relationship' });
  } finally {
    await session.close();
  }
});

module.exports = router;