const router = require('express').Router();
const { driver } = require('../../../neo4j');
const Organisation = require('../../../models/Organisation');
const OrganisationService = require('../../../services/OrganisationService');
const OrganisationController = require('../../../controllers/OrganisationController');

const orgModel     = new Organisation(driver);
const orgService   = new OrganisationService(orgModel, driver);
const orgController= new OrganisationController(orgService);

router.post('/', orgController.upsert);
router.post('/link', orgController.linkTeamToLeague);
router.get('/', orgController.list);

module.exports = router;