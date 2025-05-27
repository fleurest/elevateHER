const router = require('express').Router();
const passport = require('../../utils/passport');
const FRONTEND_HOME_URL = process.env.FRONTEND_HOME_URL || 'http://localhost:3000';

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
        // on success, redirect to home
        res.redirect(`${FRONTEND_HOME_URL}/home` || 'http://localhost:3000/home');
    }
);

function isAuthenticated(req, res, next) {
    console.log('*** isAuthenticated ***')
    if (req.session?.user) {
        return next();
    }
    return res.status(401).json({ message: 'Unauthorized' });
}

function isAdmin(req, res, next) {
    if (req.session?.user?.roles?.includes('admin')) {
        return next();
    }
    return res.status(403).json({ message: 'Forbidden: Admins only' });
}

module.exports = {
    isAuthenticated,
    isAdmin
};


module.exports = router;
