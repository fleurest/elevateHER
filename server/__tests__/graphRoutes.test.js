const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../../neo4j', () => ({
  driver: {
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn()
    }))
  }
}));

jest.mock('../../../authentication', () => ({
  isAuthenticated: jest.fn((req, res, next) => next())
}));

jest.mock('../models/Graph');
jest.mock('../services/GraphService');
jest.mock('../controllers/GraphController');

const graphRoutes = require('../routes/graphRoutes');
const graphController = require('../controllers/GraphController');


// Create test app
const app = express();
app.use(express.json());
app.use('/api/graph', graphRoutes);

describe('Graph Routes', () => {
  let mockGraphController;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock controller methods
    mockGraphController = {
      getGraph: jest.fn((req, res) => res.json({ nodes: [], edges: [] })),
      getSimilar: jest.fn((req, res) => res.json({ similar: [] })),
      getParticipationGraph: jest.fn((req, res) => res.json({ participation: [] })),
      postEmbeddings: jest.fn((req, res) => res.json({ success: true })),
      postKnn: jest.fn((req, res) => res.json({ success: true })),
      getCommunities: jest.fn((req, res) => res.json({ communities: [] })),
      exportEdges: jest.fn((req, res) => res.json({ edges: [] })),
      getLikedByEmail: jest.fn((req, res) => res.json({ liked: [] })),
      getLikedSummary: jest.fn((req, res) => res.json({ summary: {} })),
      getFriendsByEmail: jest.fn((req, res) => res.json({ friends: [] }))
    };

    Object.keys(mockGraphController).forEach(method => {
      graphController[method] = mockGraphController[method];
    });
  });

  describe('GET /api/graph', () => {
    it('should call getGraph controller method', async () => {
      mockGraphController.getGraph.mockImplementation((req, res) => {
        res.json({
          nodes: [
            { id: '1', label: 'Node 1' },
            { id: '2', label: 'Node 2' }
          ],
          edges: [
            { source: '1', target: '2', weight: 0.8 }
          ]
        });
      });

      const res = await request(app)
        .get('/api/graph')
        .query({ limit: 10, type: 'similarity' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('nodes');
      expect(res.body).toHaveProperty('edges');
      expect(mockGraphController.getGraph).toHaveBeenCalled();
    });
  });

  describe('GET /api/graph/similar', () => {
    it('should call getSimilar controller method', async () => {
      mockGraphController.getSimilar.mockImplementation((req, res) => {
        res.json({
          similar: [
            { name: 'Alice', score: 0.9 },
            { name: 'Bob', score: 0.8 }
          ]
        });
      });

      const res = await request(app)
        .get('/api/graph/similar')
        .query({ name: 'Alice', k: 5 });

      expect(res.statusCode).toBe(200);
      expect(res.body.similar).toHaveLength(2);
      expect(mockGraphController.getSimilar).toHaveBeenCalled();
    });
  });

  describe('POST /api/graph', () => {
    it('should call getParticipationGraph controller method', async () => {
      mockGraphController.getParticipationGraph.mockImplementation((req, res) => {
        res.json({
          participation: [
            { athlete: 'Alice', event: 'Olympics 2024' },
            { athlete: 'Bob', event: 'World Cup 2024' }
          ]
        });
      });

      const res = await request(app)
        .post('/api/graph')
        .send({ athletes: ['Alice', 'Bob'], events: ['Olympics 2024'] });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('participation');
      expect(mockGraphController.getParticipationGraph).toHaveBeenCalled();
    });
  });

  describe('POST /api/graph/embeddings', () => {
    it('should call postEmbeddings controller method', async () => {
      mockGraphController.postEmbeddings.mockImplementation((req, res) => {
        res.json({
          message: 'Embeddings computed successfully',
          dimensions: 128,
          iterations: 20
        });
      });

      const res = await request(app)
        .post('/api/graph/embeddings')
        .send({ dimensions: 128, iterations: 20 });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Embeddings computed successfully');
      expect(mockGraphController.postEmbeddings).toHaveBeenCalled();
    });
  });

  describe('POST /api/graph/knn', () => {
    it('should call postKnn controller method', async () => {
      mockGraphController.postKnn.mockImplementation((req, res) => {
        res.json({
          message: 'kNN computation completed',
          topK: 10
        });
      });

      const res = await request(app)
        .post('/api/graph/knn')
        .send({ topK: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('kNN computation completed');
      expect(mockGraphController.postKnn).toHaveBeenCalled();
    });
  });

  describe('GET /api/graph/communities', () => {
    it('should call getCommunities controller method', async () => {
      mockGraphController.getCommunities.mockImplementation((req, res) => {
        res.json({
          communities: [
            { id: 1, members: ['Alice', 'Bob', 'Charlie'] },
            { id: 2, members: ['David', 'Eve'] }
          ]
        });
      });

      const res = await request(app).get('/api/graph/communities');

      expect(res.statusCode).toBe(200);
      expect(res.body.communities).toHaveLength(2);
      expect(mockGraphController.getCommunities).toHaveBeenCalled();
    });
  });

  describe('GET /api/graph/export', () => {
    it('should call exportEdges controller method', async () => {
      mockGraphController.exportEdges.mockImplementation((req, res) => {
        res.json({
          edges: [
            { source: 'Alice', target: 'Bob', weight: 0.8 },
            { source: 'Bob', target: 'Charlie', weight: 0.6 }
          ]
        });
      });

      const res = await request(app).get('/api/graph/export');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('edges');
      expect(mockGraphController.exportEdges).toHaveBeenCalled();
    });
  });

  describe('GET /api/graph/recommendations/:name', () => {
    it('should call getSimilar with name from params', async () => {
      mockGraphController.getSimilar.mockImplementation((req, res) => {
        expect(req.query.name).toBe('Alice');
        expect(req.query.topK).toBe('5');
        res.json({
          recommendations: [
            { name: 'Bob', score: 0.9 },
            { name: 'Charlie', score: 0.8 }
          ]
        });
      });

      const res = await request(app)
        .get('/api/graph/recommendations/Alice')
        .query({ k: 5 });

      expect(res.statusCode).toBe(200);
      expect(mockGraphController.getSimilar).toHaveBeenCalled();
    });
  });

  describe('GET /api/graph/liked/:email', () => {
    it('should call getLikedByEmail controller method', async () => {
      mockGraphController.getLikedByEmail.mockImplementation((req, res) => {
        res.json({
          email: 'alice@example.com',
          liked: [
            { type: 'athlete', name: 'Bob' },
            { type: 'event', name: 'Olympics 2024' }
          ]
        });
      });

      const res = await request(app)
        .get('/api/graph/liked/alice@example.com');

      expect(res.statusCode).toBe(200);
      expect(res.body.liked).toHaveLength(2);
      expect(mockGraphController.getLikedByEmail).toHaveBeenCalled();
    });
  });

  describe('GET /api/graph/liked/:email/summary', () => {
    it('should call getLikedSummary controller method', async () => {
      mockGraphController.getLikedSummary.mockImplementation((req, res) => {
        res.json({
          email: 'alice@example.com',
          summary: {
            totalLiked: 5,
            athletes: 3,
            events: 2,
            topSports: ['Soccer', 'Basketball']
          }
        });
      });

      const res = await request(app)
        .get('/api/graph/liked/alice@example.com/summary');

      expect(res.statusCode).toBe(200);
      expect(res.body.summary).toHaveProperty('totalLiked');
      expect(mockGraphController.getLikedSummary).toHaveBeenCalled();
    });
  });

  describe('GET /api/graph/friends/:email', () => {
    it('should call getFriendsByEmail controller method', async () => {
      mockGraphController.getFriendsByEmail.mockImplementation((req, res) => {
        res.json({
          email: 'alice@example.com',
          friends: [
            { email: 'bob@example.com', name: 'Bob' },
            { email: 'charlie@example.com', name: 'Charlie' }
          ]
        });
      });

      const res = await request(app)
        .get('/api/graph/friends/alice@example.com');

      expect(res.statusCode).toBe(200);
      expect(res.body.friends).toHaveLength(2);
      expect(mockGraphController.getFriendsByEmail).toHaveBeenCalled();
    });
  });
});