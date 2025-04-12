const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const { verifyConnection, driver } = require('./neo4j');
const neo4jRoutes = require('./routes/neo4jRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

app.use('/api', neo4jRoutes);

app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Start server ONLY if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await verifyConnection();
  });
}

// Clean exit
process.on('SIGINT', async () => {
  await driver.close();
  console.log('Neo4j driver closed. Exiting.');
  process.exit(0);
});

module.exports = app;
