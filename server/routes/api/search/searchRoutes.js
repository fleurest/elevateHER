const router = require('express').Router();

router.get('/search', async (req, res) => {
    const { query, sport } = req.query;

    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        const results = await personModel.searchByName({ query, sport });
        let players = results.map(p => ({
            id: p.identity.toNumber(),
            name: p.properties.name,
            sport: p.properties.sport || null,
            profileImage: p.properties.profileImage || null,
            description: p.properties.description || null,
        }));

        if (players.length === 0) {
            const suggestionsRaw = await personModel.suggestSimilarNames(query);
            const suggestions = suggestionsRaw.map(p => ({
                id: p.identity.toNumber(),
                name: p.properties.name,
                sport: p.properties.sport || null
            }));
            return res.json({ players: [], suggestions });
        }

        res.json({ players });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});


router.get('/search-users', isAuthenticated, async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'No query provided' });
  
    try {
      const results = await personModel.searchUsers(query);
      res.json(results);
    } catch (err) {
      console.error('Search failed:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

module.exports = router;
