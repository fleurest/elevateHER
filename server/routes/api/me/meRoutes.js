const router = require('express').Router();

// GET /api/me
router.get('/', (req, res) => {
    console.log('[API] req.session:', req.session);
    console.log('[API] req.user:', req.user);
    if (req.user) {
      return res.json({ user: req.user });
    }
    return res.status(401).json({ error: 'Not authenticated' });
  });

  module.exports = router;