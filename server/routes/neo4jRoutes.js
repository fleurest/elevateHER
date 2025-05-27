const express = require('express');
const router = express.Router();
const { driver } = require('../neo4j');
const bcrypt = require('bcrypt');
const axios = require('axios');
const saltRounds = 10;
const { sanitizeEmail, sanitizeUsername, sanitizePassword } = require('../utils/inputSanitizers');
const path = require('path');
console.log('Looking for Graph at:', path.resolve(__dirname, '../models/Graph'));
const Graph = require('../models/Graph');
const GraphService = require('../services/GraphService');
const { getCalendarEvents, listPastEvents, listUpcomingEvents } = require('../services/EventCalService');

const graphModel = new Graph(driver);
const graphService = new GraphService(graphModel);

const { isAuthenticated, isAdmin } = require('../authentication');

const passport = require('../utils/passport');
const { validateRegistration, validateLogin, checkValidation } = require('../utils/validators');

// register route
router.post('/register', validateRegistration, async (req, res) => {
  const { username, email, password } = req.body;
  const user = sanitizeUsername(username);
  const mail = sanitizeEmail(email);
  const pass = sanitizePassword(password);

  let session;
  try {
    session = driver.session();
    // Check if email already exists
    const existing = await session.run(
      'MATCH (p:Person {email: $email}) RETURN p',
      { email: mail }
    );
    if (existing.records.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashed = await bcrypt.hash(pass, saltRounds);

    // Create user node
    await session.run(
      `CREATE (p:Person {email: $email, username: $username, password: $password, roles: ['user']})`,
      { email: mail, username: user, password: hashed }
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    if (session) await session.close();
  }
});


router.get('/refresh', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No token found' });

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    res.json({ username: decoded.username });
  } catch (err) {
    console.error('[SERVER] Token invalid:', err);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});





router.get('/recommendations/:name', async (req, res) => {
  const { name } = req.params;
  const topK = parseInt(req.query.k) || 5;
  try {
    const recs = await graphService.getSimilar(name, topK);
    res.json(recs);
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});


router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// router.get(
//   '/auth/google/callback',
//   passport.authenticate('google', {
//     failureRedirect: `${process.env.BASE_PATH}/login`,
//     session: true
//   }),
//   (req, res) => {
    
//     console.log('*** neo4jRoutes: Google login success:', req.user);
  
//     req.login(req.user, (err) => {
//       if (err) {
//         console.error('Login error:', err);
//         return res.redirect(process.env.FRONTEND_LOGIN_URL || '/login');
//       }

//       console.log('Session after login:', req.session);
      
//       console.log('**** process.env.FRONTEND_HOME_URL -->', process.env.FRONTEND_HOME_URL);
//       const base = process.env.BASE_PATH?.replace(/\/+$/, '') || '';
//       console.log('**** base -->', base);
      
//       console.log('[SERVER] Session after login:', req.session);
//       return res.redirect(process.env.FRONTEND_HOME_URL);
//     });
//   }
// );


module.exports = router;
