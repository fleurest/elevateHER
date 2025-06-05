require('dotenv').config();
const fetch = require('node-fetch');
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const { verifyConnection, driver } = require('./neo4j');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth/authRoutes');

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
  origin: 'http://localhost:3000',
  credentials: true
}));

// parsing & cookies
app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  },
}));

// passport
app.use(passport.initialize());
app.use(passport.session());

// Image proxy route to bypass CORS
app.get('/api/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).send('Missing url parameter');
    }
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
      }
    });

    if (!response.ok) {
      console.error('Image proxy upstream error:', response.status);
      return res.status(response.status).send('Image not found');
    }

    res.header('Content-Type', response.headers.get('content-type') || 'image/jpeg');

    response.body.pipe(res);

  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(502).send('Image proxy fetch error');
  }
});

// api routes
app.use('/api', apiRoutes);

// auth routes
app.use('/auth', authRoutes);

// assets
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(process.env.BASE_PATH, express.static(path.join(__dirname, '../client/build')));
app.get(`${process.env.BASE_PATH}/*`, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});



app.get('/session', (req, res) => {
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
