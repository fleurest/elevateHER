require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const { verifyConnection, driver } = require('./neo4j');
const neo4jRoutes = require('./routes/neo4jRoutes');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const passport = require('./utils/passport');
const fs = require('fs');
const https = require('https');
const http = require('http');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(__dirname, '..', 'certs', 'localhost-key.pem');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, '..', 'certs', 'localhost.pem');

const useHttps = fs.existsSync(process.env.SSL_KEY_PATH) && fs.existsSync(process.env.SSL_CERT_PATH);
const clientOrigin = process.env.CLIENT_ORIGIN || (useHttps ? 'https://localhost:3000' : 'http://localhost:3000');

// Security middleware
app.use(helmet());
app.enable('trust proxy');

// redirect HTTP to HTTPS
if (useHttps && process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    next();
  });
}

// CORS
app.use(cors({
  origin: clientOrigin,
  credentials: true,
  exposedHeaders: ['set-cookie']
}));

// parsing & cookies
app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    path: process.env.BASE_PATH || '/',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  },
}));

// passport
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: process.env.FRONTEND_LOGIN_URL || 'http://localhost:3000/login',
    session: true
  }),
  (req, res, next) => {
    console.log('[SERVER] Google login success:', req.user);

    req.login(req.user, (err) => {
      if (err) {
        console.error('Login error after Google auth:', err);
        return res.redirect(process.env.FRONTEND_LOGIN_URL || 'http://localhost:3000/login');
      }

      console.log('[SERVER] Session after login:', req.session);

      return res.redirect(process.env.FRONTEND_HOME_URL || 'http://localhost:3000/home');
    });
  }
);



// api routes
app.use('/api', neo4jRoutes);

// assets
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(process.env.BASE_PATH, express.static(path.join(__dirname, '../client/build')));
app.get(`${process.env.BASE_PATH}/*`, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.post('/api/login', async (req, res) => {
  console.log('>>> LOGIN route hit');
  console.log('>>> request body:', req.body);
  const username = sanitizeUsername(req.body.username);
  const password = sanitizePassword(req.body.password);
  let session = null;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    session = driver.session();
    const result = await session.run(
      'MATCH (p:Person {email: $email}) RETURN p',
      { email }
    );

    if (result.records.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const person = result.records[0].get('p').properties;
    const hash = person.password;
    const match = await bcrypt.compare(password, hash);

    if (match) {
      req.login(person, (err) => {
        if (err) {
          console.error('Passport login error:', err);
          return res.status(500).json({ error: 'Login failed' });
        }

        res.json({
          message: 'Login successful',
          user: {
            id: person.id,
            username: person.username,
            email: person.email,
          },
        });
      });


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
  if (req.isAuthenticated()) {
    return res.json({ user: req.user });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

app.post('/api/logout', (req, res) => {
  req.logout(() => {
    res.clearCookie('sessionId');
    res.json({ success: true });
  });
});

if (process.env.NODE_ENV !== 'test') {
  if (useHttps) {
    const sslOptions = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH),
    };
    https.createServer(sslOptions, app).listen(PORT, async () => {
      console.log(`HTTPS Server running at https://localhost:${PORT}`);
      try {
        await verifyConnection();
      } catch (error) {
        console.error('Failed to connect to Neo4j', error);
      }
    });
    if (process.env.NODE_ENV === 'production') {
      http.createServer((req, res) => {
        res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
        res.end();
      }).listen(80, () => console.log('HTTP redirecting to HTTPS on port 80'));
    }
  } else {
    console.warn('SSL certificates not found, running HTTP server');
    app.listen(PORT, async () => {
      console.log(`HTTP Server running at http://localhost:${PORT}`);
      try { await verifyConnection(); } catch (error) { console.error('Neo4j connection error', error); }
    });
  }
}

process.on('SIGINT', async () => {
  await driver.close();
  console.log('Neo4j driver closed. Exiting.');
  process.exit(0);
});

module.exports = app;
