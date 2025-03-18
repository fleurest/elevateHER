const express = require('express');
const router = express.Router();
const { driver } = require('../neo4j');

// 5 nodes for this one
router.get('/nodes', async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run('MATCH (n) RETURN n LIMIT 5');
    const nodes = result.records.map(record => record.get('n').properties);
    res.json(nodes);
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await session.close();
  }
});

module.exports = router;
