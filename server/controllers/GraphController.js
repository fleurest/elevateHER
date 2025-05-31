// server/controllers/GraphController.js
const GraphService = require('../services/GraphService');
const Graph = require('../models/Graph');
const { driver } = require('../neo4j');

const graphModel = new Graph(driver);
const graphService = new GraphService(new Graph(driver));

class GraphController {
    constructor(graphService) {
        this.graphService = graphService;
        this.getGraph = this.getGraph.bind(this);
        this.getParticipationGraph = this.getParticipationGraph.bind(this);
        this.getLikedByEmail = this.getLikedByEmail.bind(this);
        this.getLikedSummary = this.getLikedSummary.bind(this);
    }
}

async function getGraph(req, res, next) {
    try {
        const limit = parseInt(req.query.limit, 10) || 100;
        const filter = req.query.type || null;
        const data = await graphService.buildGraph(limit, filter);
        res.status(200).json(data);
    } catch (err) {
        console.error('Error in getGraph:', err);
        res.status(500).json({ error: 'Failed to build graph' });
    }
};

async function postEmbeddings(req, res, next) {
    try {
        const { dim, iterations } = req.body;
        await graphService.computeEmbeddings({ dim, iterations });
        res.sendStatus(204);
    } catch (err) {
        next(err);
    }
};

async function getSimilar(req, res, next) {
    try {
        const { name, topK } = req.query;
        if (!name) return res.status(400).json({ error: 'name is required' });
        const list = await graphService.getSimilar(name, Number(topK) || 5);
        res.json(list);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/graph/knn
 */
async function postKnn(req, res, next) {
    try {
        const { topK } = req.body;
        await graphService.writeKnn({ topK: Number(topK) || 5 });
        res.sendStatus(204);
    } catch (err) {
        next(err);
    }
};

// GET /graph/communities
async function getCommunities(req, res, next) {
    try {
        const communities = await graphService.detectCommunities();
        res.status(200).json(communities);
    } catch (err) {
        next(err);
    }
};

// GET /graph/export
async function exportEdges(req, res, next) {
    try {
        const result = await graphService.exportEdgesToCSV();
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

// POST /graph/
async function getParticipationGraph(req, res, next) {
    try {
        const limit = parseInt(req.body.limit, 10) || 25;
        const records = await graphService.getParticipationGraph(limit);

        const nodesMap = new Map();
        const edges = [];

        records.forEach(record => {
            const n = record.get('n');
            const m = record.get('m');
            const rel = record.get('r');

            const mapNode = node => ({
                data: {
                    id: node.identity.toString(),
                    label: node.properties.name || node.labels[0],
                    image: node.properties.profileImage || './images/logo-default-profile.png',
                    type: node.labels[0]?.toLowerCase() || 'unknown',
                    ...node.properties
                }
            });

            if (!nodesMap.has(n.identity.toString())) nodesMap.set(n.identity.toString(), mapNode(n));
            if (!nodesMap.has(m.identity.toString())) nodesMap.set(m.identity.toString(), mapNode(m));

            edges.push({
                data: {
                    id: rel.identity.toString(),
                    source: n.identity.toString(),
                    target: m.identity.toString(),
                    label: rel.type.replace(/_/g, ' ').toLowerCase(),
                    title: rel.type.replace(/_/g, ' ').toLowerCase()
                }
            });
        });

        res.json({ nodes: Array.from(nodesMap.values()), edges });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/graph/liked/:email
 * Get liked entities for a user by email
 * Query parameters:
 * - limit: number of results (default: 50)
 * - type: filter by type ('person', 'organization', or null for all)
 */
async function getLikedByEmail(req, res, next) {
    try {
        const { email } = req.params;
        const limit = parseInt(req.query.limit, 10) || 50;
        const type = req.query.type || null;

        if (!email) {
            return res.status(400).json({ error: 'Email parameter is required' });
        }

        // Validate email format (basic validation)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const data = await graphService.getLikedByEmail(email, { limit, type });
        
        if (data.totalCount === 0) {
            return res.status(200).json({
                nodes: [],
                edges: [],
                totalCount: 0,
                message: 'No liked entities found for this user'
            });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error('Error in getLikedByEmail:', err);
        res.status(500).json({ error: 'Failed to get liked entities' });
    }
}

/**
 * GET /api/graph/liked/:email/summary
 * Get summary of liked entities for a user
 */
async function getLikedSummary(req, res, next) {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({ error: 'Email parameter is required' });
        }

        // Validate email format (basic validation)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const summary = await graphService.getLikedSummary(email);
        res.status(200).json(summary);
    } catch (err) {
        console.error('Error in getLikedSummary:', err);
        res.status(500).json({ error: 'Failed to get liked summary' });
    }
}

/**
 * GET /api/graph/friends/:email
 * Get friends graph for a user by email
 * Query parameters:
 * - limit: number of results (default: 50)
 */
async function getFriendsByEmail(req, res, next) {
    try {
        const { email } = req.params;
        const limit = parseInt(req.query.limit, 10) || 50;

        if (!email) {
            return res.status(400).json({ error: 'Email parameter is required' });
        }

        // Validate email format (basic validation)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const data = await graphService.getFriendsByEmail(email, { limit });
        
        if (data.totalCount === 0) {
            return res.status(200).json({
                nodes: [],
                edges: [],
                totalCount: 0,
                message: 'No friends found for this user'
            });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error('Error in getFriendsByEmail:', err);
        res.status(500).json({ error: 'Failed to get friends' });
    }
}

module.exports = {
    getGraph,
    postEmbeddings,
    getSimilar,
    postKnn,
    getCommunities,
    exportEdges,
    getParticipationGraph,
    getLikedByEmail,
    getLikedSummary,
    getFriendsByEmail
};