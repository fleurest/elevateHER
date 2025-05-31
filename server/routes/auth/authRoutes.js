const router = require('express').Router();
const passport = require('../../utils/passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { driver } = require('../../neo4j');
const Person = require('../../models/Person');
const PersonService = require('../../services/PersonService');
const PersonController = require('../../controllers/PersonController');
const { validateRegistration, validateLogin, checkValidation } = require('../../utils/validators');

const FRONTEND_HOME_URL = process.env.FRONTEND_HOME_URL || 'http://localhost:3000';

function isAuthenticated(req, res, next) {
    console.log('*** isAuthenticated START ***');
    console.log('sessionID:', req.sessionID);
    console.log('req.user:', req.user);
    console.log('req.session:', req.session);
    console.log('req.session.user:', req.session?.user);
    console.log('cookies:', req.cookies);
    
    if (req.user || req.session?.user) {
        console.log('Authentication SUCCESS');
        return next();
    }
    
    console.log('Authentication FAILED');
    return res.status(401).json({ message: 'Unauthorized' });
}

function isAdmin(req, res, next) {
    if (req.session?.user?.roles?.includes('admin')) return next();
    return res.status(403).json({ message: 'Admins only' });
}

const personModel = new Person(driver);
const personService = new PersonService(personModel, driver);
const personController = new PersonController(personService);


router.get('/session', 
    personController.sessionInfo
);

// Google OAuth
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: 'http://localhost:3000/login',
        session: true
    }),
    (req, res) => {
        console.log('🔍 Google callback - req.user:', req.user);
        console.log('🔍 Google callback - session before:', req.session);
        
        req.session.user = {
            username: req.user.username || req.user.displayName,
            email: req.user.email,
            roles: req.user.roles || ['user'],
        };
        
        console.log('🔍 Google callback - session after:', req.session);
        console.log('🔍 Google callback - session.user:', req.session.user);
        
        res.redirect(`${FRONTEND_HOME_URL}/home` || 'http://localhost:3000/home');
    }
);

// JWT REFRESH
router.get(
    '/refresh',
    (req, res) => {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'No token found' });

        try {
            const decoded = jwt.verify(token, process.env.SESSION_SECRET);
            res.json({ username: decoded.username });
        } catch (err) {
            console.error('[SERVER] Token invalid:', err);
            res.status(403).json({ error: 'Invalid or expired token' });
        }
    }
);

// Testing session
router.get('/test-session', (req, res) => {
    console.log('Test session - SessionID:', req.sessionID);
    console.log('Test session - Before:', req.session);
    
    req.session.user = {
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user']
    };
    
    console.log('Test session - After:', req.session);
    res.json({ message: 'Test user set in session' });
});

router.isAuthenticated = isAuthenticated;
router.isAdmin = isAdmin;

module.exports = router;
