const router = require('express').Router();
const { driver } = require('../../../neo4j');
const { isAuthenticated } = require('../../../authentication');

const Graph = require('../../../models/Graph');
const GraphService = require('../../../services/GraphService');
const graphController = require('../../../controllers/GraphController');

// GET  /graph?limit=&type=
router.get('/', graphController.getGraph);

router.get('/similar', graphController.getSimilar);

// POST
router.post('/', graphController.getParticipationGraph);

// POST /graph/embeddings
router.post('/embeddings', graphController.postEmbeddings);

// POST /graph/knn
router.post('/knn', graphController.postKnn);

// GET  /graph/communities
router.get('/communities', graphController.getCommunities);

// GET  /graph/export
router.get('/export', graphController.exportEdges);

// NEW: GET /api/graph/recommendations/:name?k=5
router.get(
    '/recommendations/:name',
    (req, res, next) => {
        req.query.name = req.params.name;
        req.query.topK = req.query.k;
        return graphController.getSimilar(req, res, next);
    }
);

// NEW: GET /api/graph/liked/:email - Get liked entities for a user
router.get('/liked', graphController.getAllLikes);
router.get('/liked/:email', graphController.getLikedByEmail);

// NEW: GET /api/graph/liked/:email/summary - Get liked summary for a user
router.get('/liked/:email/summary', graphController.getLikedSummary);

// NEW: GET /api/graph/friends/:email - Get friends for a user
router.get('/friends/:email', graphController.getFriendsByEmail);


// POST /graph/pagerank - Calculate and store PageRank scores
router.post('/pagerank', graphController.calculatePageRank);

// GET /api/graph/org-community - organisation with most participants and likes
router.get('/org-community', graphController.getTopOrgWithLikes);

module.exports = router;