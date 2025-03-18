const express = require('express');
const { verifyConnection, driver } = require('./neo4j');
const neo4jRoutes = require('./routes/neo4jRoutes.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', neo4jRoutes);

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await verifyConnection();
});

// Clean close out
process.on('SIGINT', async () => {
  await driver.close();
  console.log('Neo4j driver closed. Exiting.');
  process.exit(0);
});
