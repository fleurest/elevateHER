const router = require('express').Router();
const athletesRoutes = require('./athletes/athletesRoutes')
const eventsRoutes = require('./events/eventsRoutes')
const graphRoutes = require('./graph/graphRoutes')
const meRoutes = require('./me/meRoutes')
const personRoutes = require('./person/personRoutes')

router.use('/athletes', athletesRoutes)
router.use('/events', eventsRoutes)
router.use('/graph', graphRoutes)
router.use('/me', meRoutes)
router.use('/person', personRoutes)

module.exports = router;
