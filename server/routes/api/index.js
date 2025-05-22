const router = require('express').Router();
const athletesRoutes = require('./athletes/athletesRoutes')
const eventsRoutes = require('./events/eventsRoutes')
const graphRoutes = require('./graph/graphRoutes')
const meRoutes = require('./me/meRoutes')

router.use('/athletes', athletesRoutes)
router.use('/events', eventsRoutes)
router.use('/graph', graphRoutes)
router.use('/me', meRoutes)

module.exports = router;
