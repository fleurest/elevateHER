const router = express.Router();

router.post('/team/upsert', (req, res) => organisationController.upsert(req, res));
router.post('/team/link-athlete', (req, res) => organisationController.link(req, res));
router.post('/team/link-league', (req, res) => organisationController.linkTeamToLeague(req, res));


module.exports = router;