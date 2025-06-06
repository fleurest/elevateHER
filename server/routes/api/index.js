const router = require('express').Router();
const athletesRoutes = require('./athletes/athletesRoutes')
const eventsRoutes = require('./events/eventsRoutes')
const graphRoutes = require('./graph/graphRoutes')
const meRoutes = require('./me/meRoutes')
const usersRoutes = require('./users/usersRoutes')
const orgRoutes = require('./organisations/orgRoutes')
const sportsRoutes = require('./sports/sportsRoutes')
const relationshipsRoutes = require('./relationships/relationshipsRoutes')


router.use('/athletes', athletesRoutes)
router.use('/events', eventsRoutes)
router.use('/graph', graphRoutes)
router.use('/me', meRoutes)
router.use('/users', usersRoutes)
router.use('/organisations', orgRoutes)
router.use('/sports', sportsRoutes)
router.use('/auth', require('../auth/authRoutes'));
router.use('/relationships', relationshipsRoutes)

module.exports = router;
