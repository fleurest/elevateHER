const express = require('express');
const path = require('path');
const cors = require('cors');
const { verifyConnection, driver } = require('./neo4j');
const neo4jRoutes = require('./routes/neo4jRoutes');

const app = express();
const PORT = 3000;

// CORS for frontend to call backend
app.use(cors());

// To parse JSON
app.use(express.json());

app.use(express.json());
app.use('/api', neo4jRoutes);

// Logo for default node image
app.use('/images', express.static(path.join(__dirname, 'public/images')));

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
