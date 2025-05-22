const router = express.Router();

router.post('/sport', async (req, res) => {
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

module.exports = router;