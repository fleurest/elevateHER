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
        this.getPageRank = this.getPageRank.bind(this);
        this.calculatePageRank = this.calculatePageRank.bind(this);
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

/**
 * GET /api/graph/pagerank - Get PageRank scores
 * Query parameters:
 * - limit: Maximum number of results (default: 20)
 * - threshold: Minimum PageRank score threshold (default: 0.0)
 */
async function getPageRank(req, res) {
    try {
        const { limit = 20, threshold = 0.0 } = req.query;
        
        const pageRankData = await graphService.getPageRankScores({
            limit: parseInt(limit),
            threshold: parseFloat(threshold)
        });
        
        if (pageRankData.length === 0) {
            return res.status(404).json({ 
                error: 'No PageRank scores found',
                message: 'PageRank may not have been calculated yet. Try POST /api/graph/pagerank to calculate scores first.'
            });
        }
        
        res.json(pageRankData);
    } catch (error) {
        console.error('PageRank retrieval error:', error);
        res.status(500).json({ 
            error: 'Failed to get PageRank scores',
            message: error.message 
        });
    }
}

/**
 * POST /api/graph/pagerank - Calculate and store PageRank scores
 * Body parameters:
 * - maxIterations: Maximum iterations for calculation (default: 20)
 * - dampingFactor: Damping factor for PageRank (default: 0.85)
 * - tolerance: Convergence tolerance (default: 0.0001)
 * - writeProperty: Property name to store results (default: 'pagerank')
 */
async function calculatePageRank(req, res) {
    try {
        const { 
            maxIterations = 20, 
            dampingFactor = 0.85,
            tolerance = 0.0001,
            writeProperty = 'pagerank'
        } = req.body;
        
        console.log('Calculating PageRank with parameters:', { maxIterations, dampingFactor, tolerance, writeProperty });
        
        const result = await graphService.calculatePageRank({
            maxIterations: parseInt(maxIterations),
            dampingFactor: parseFloat(dampingFactor),
            tolerance: parseFloat(tolerance),
            writeProperty
        });
        
        console.log('PageRank calculation completed:', result);
        
        res.json({
            success: true,
            message: 'PageRank calculation completed successfully',
            ...result
        });
    } catch (error) {
        console.error('PageRank calculation error:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('Graph does not exist')) {
            errorMessage = 'Graph projection not found. The system will attempt to create it automatically.';
        } else if (error.message.includes('gds.pageRank')) {
            errorMessage = 'Neo4j Graph Data Science library not available. Please ensure GDS is installed and enabled.';
        }
        
        res.status(500).json({ 
            error: 'Failed to calculate PageRank',
            message: errorMessage,
            details: error.message
        });
    }
}

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

            const mapNode = node => {
                const name = node.properties.name;
                const profileImage = node.properties.profileImage;
                
                return {
                    data: {
                        id: node.identity.toString(),
                        label: name || node.labels[0],
                        name: name,
                        image: profileImage || graphService.getWikipediaImageUrl(name) || './images/logo-default-profile.png',
                        profileImage: profileImage || graphService.getWikipediaImageUrl(name),
                        type: node.labels[0]?.toLowerCase() || 'unknown',
                        ...node.properties
                    }
                };
            };

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
    getFriendsByEmail,
    getPageRank,
    calculatePageRank
};