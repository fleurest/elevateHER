const router = require('express').Router();
const athletesRoutes = require('./athletes/athletesRoutes')
const eventsRoutes = require('./events/eventsRoutes')
const graphRoutes = require('./graph/graphRoutes')
const meRoutes = require('./me/meRoutes')
const usersRoutes = require('./users/usersRoutes')
const orgRoutes = require('./organisations/orgRoutes')


router.use('/athletes', athletesRoutes)
router.use('/events', eventsRoutes)
router.use('/graph', graphRoutes)
router.use('/me', meRoutes)
router.use('/users', usersRoutes)
router.use('/organisations', orgRoutes)

module.exports = router;
