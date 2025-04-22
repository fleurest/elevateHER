const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const { verifyConnection, driver } = require('./neo4j');
const neo4jRoutes = require('./routes/neo4jRoutes');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { redirect } = require('react-router-dom');

const app = express();
const PORT = process.env.PORT || 3001;

// middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  },
}));

app.use('/api', neo4jRoutes);

app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.post('/api/login', async (req, res) => {
  console.log('>>> LOGIN route hit');
  console.log('>>> request body:', req.body);
  const username = sanitizeUsername(req.body.username);
  const password = sanitizePassword(req.body.password);
  let session = null;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    session = driver.session();
    const result = await session.run(
      'MATCH (p:Person {username: $username}) RETURN p',
      { username }
    );

    if (result.records.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const person = result.records[0].get('p').properties;
    const hash = person.password;
    const match = await bcrypt.compare(password, hash);

    if (match) {
      req.session.user = {
        id: person.id,
        username: person.username,
        email: person.email,
        //  ...
      };
      req.session.loggedIn = true;
      console.log('Session after login', req.session);
      res.json({
        message: 'Login successful',
        user: {
          id: person.id,
          username: person.username,
          email: person.email,
        },
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    if (session) {
      await session.close();
    }
  }
});

app.get('/api/auth/session', (req, res) => {
  console.log('Session data: ', req.session);
  if (req.session.loggedIn) {
    res.json({ user: req.session.user, loggedIn: req.session.loggedIn });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).json({ message: 'Logout failed' });
    } else {
      res.clearCookie('sessionId');
      res.json({ message: 'Logout successful' });
    }
  });
});

// Start server ONLY if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
      await verifyConnection();
    } catch (error) {
      console.error("Failed to connect to Neo4j", error);
    }
  });
}

// Clean exit
process.on('SIGINT', async () => {
  await driver.close();
  console.log('Neo4j driver closed. Exiting.');
  process.exit(0);
});

module.exports = app;
