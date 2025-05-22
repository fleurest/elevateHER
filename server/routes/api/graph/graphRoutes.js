const router = require('express').Router();

// graph
router.get('/graph', async (req, res) => {
    try {
        const graph = await graphService.buildGraph();
        res.json(graph);
    } catch (err) {
        console.error('Graph query error:', err);
        res.status(500).json({ error: 'Failed to get graph data' });
    }
});

// graph filtered (e.g. only PARTICIPATES_IN)
router.post('/graph/filtered', async (req, res) => {
    const session = driver.session();
    const { names = [] } = req.body;

    try {
        let result;

        if (names.length > 0) {
            result = await session.run(
                `
        MATCH (a:Person)-[r]-(b:Person)
        WHERE a.name IN $names AND b.name IN $names
        RETURN a, r, b
        `,
                { names }
            );
        } else {
            result = await session.run(
                `
        MATCH (n:Person)-[r:PARTICIPATES_IN]-(m:Sport)
        RETURN n AS a, r, m AS b
        LIMIT 100
        `
            );
        }

        const nodesMap = new Map();
        const edges = [];

        result.records.forEach(record => {
            const a = record.get('a');
            const b = record.get('b');
            const r = record.get('r');

            const mapNode = node => ({
                data: {
                    id: node.identity.toString(),
                    label: node.properties.name || node.labels[0],
                    image: node.properties.profileImage || './images/logo-default-profile.png',
                    ...node.properties
                }
            });

            if (!nodesMap.has(a.identity.toString())) nodesMap.set(a.identity.toString(), mapNode(a));
            if (!nodesMap.has(b.identity.toString())) nodesMap.set(b.identity.toString(), mapNode(b));

            edges.push({
                data: {
                    id: r.identity.toString(),
                    source: a.identity.toString(),
                    target: b.identity.toString(),
                    label: r.type,
                    ...r.properties
                }
            });
        });

        res.json({ nodes: Array.from(nodesMap.values()), edges });
    } catch (err) {
        console.error('Filtered graph error:', err);
        res.status(500).json({ error: 'Failed to get filtered graph' });
    } finally {
        await session.close();
    }
});


router.post('/graph/knn/setup', async (req, res) => {
    const { dim, iterations, topK } = req.body;
    try {
        await graphService.projectGraph();
        await graphService.computeEmbeddings({ dim, iterations });
        await graphService.writeKnn({ topK });
        res.json({ message: 'kNN setup complete' });
    } catch (err) {
        console.error('kNN setup error:', err);
        res.status(500).json({ error: 'Failed to setup kNN' });
    }
});


router.get('/graph/pagerank', async (req, res) => {
    try {
        const result = await graphService.getPageRankScoresFromProperty();
        res.json(result);
    } catch (err) {
        console.error('PageRank error:', err);
        res.status(500).json({ error: 'Failed to retrieve PageRank' });
    }
});


router.get('/graph/communities', async (req, res) => {
    try {
        const session = driver.session();
        const result = await session.run(`
        MATCH (p:Person)
        WHERE exists(p.communityId)
        RETURN p.name AS name, p.communityId AS communityId
        ORDER BY communityId
      `);
        const data = result.records.map(r => ({
            name: r.get('name'),
            communityId: r.get('communityId')
        }));
        await session.close();
        res.json(data);
    } catch (err) {
        console.error('Community detection error:', err);
        res.status(500).json({ error: 'Failed to load communities' });
    }
});

module.exports = router;