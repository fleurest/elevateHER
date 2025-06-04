const request = require('supertest');
const express = require('express');
const graphRoutes = require('../routes/api/graph/graphRoutes');

jest.mock('../../../controllers/GraphController', () => ({
  getGraph: jest.fn((req, res) => res.json({ nodes: [], edges: [] })),
  getSimilar: jest.fn((req, res) => res.json({ similar: [] })),
  getParticipationGraph: jest.fn((req, res) => res.json({ graph: {} })),
  postEmbeddings: jest.fn((req, res) => res.json({ success: true })),
  postKnn: jest.fn((req, res) => res.json({ success: true })),
  getCommunities: jest.fn((req, res) => res.json({ communities: [] })),
  exportEdges: jest.fn((req, res) => res.json({ edges: [] })),
  getLikedByEmail: jest.fn((req, res) => res.json({ liked: [] })),
  getLikedSummary: jest.fn((req, res) => res.json({ summary: {} })),
  getFriendsByEmail: jest.fn((req, res) => res.json({ friends: [] }))
}));

const graphController = require('../../../controllers/GraphController');

describe('Graph Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/graph', graphRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/graph', () => {
    it('should call getGraph controller method', async () => {
      const response = await request(app)
        .get('/api/graph?limit=10&type=person')
        .expect(200);

      expect(graphController.getGraph).toHaveBeenCalled();
      expect(response.body).toEqual({ nodes: [], edges: [] });
    });
  });

  describe('GET /api/graph/similar', () => {
    it('should call getSimilar controller method', async () => {
      const response = await request(app)
        .get('/api/graph/similar?name=test')
        .expect(200);

      expect(graphController.getSimilar).toHaveBeenCalled();
      expect(response.body).toEqual({ similar: [] });
    });
  });

  describe('POST /api/graph', () => {
    it('should call getParticipationGraph controller method', async () => {
      const response = await request(app)
        .post('/api/graph')
        .send({ data: 'test' })
        .expect(200);

      expect(graphController.getParticipationGraph).toHaveBeenCalled();
      expect(response.body).toEqual({ graph: {} });
    });
  });

  describe('POST /api/graph/embeddings', () => {
    it('should call postEmbeddings controller method', async () => {
      const response = await request(app)
        .post('/api/graph/embeddings')
        .send({ dim: 128 })
        .expect(200);

      expect(graphController.postEmbeddings).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /api/graph/knn', () => {
    it('should call postKnn controller method', async () => {
      const response = await request(app)
        .post('/api/graph/knn')
        .send({ topK: 5 })
        .expect(200);

      expect(graphController.postKnn).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('GET /api/graph/communities', () => {
    it('should call getCommunities controller method', async () => {
      const response = await request(app)
        .get('/api/graph/communities')
        .expect(200);

      expect(graphController.getCommunities).toHaveBeenCalled();
      expect(response.body).toEqual({ communities: [] });
    });
  });

  describe('GET /api/graph/export', () => {
    it('should call exportEdges controller method', async () => {
      const response = await request(app)
        .get('/api/graph/export')
        .expect(200);

      expect(graphController.exportEdges).toHaveBeenCalled();
      expect(response.body).toEqual({ edges: [] });
    });
  });

  describe('GET /api/graph/recommendations/:name', () => {
    it('should call getSimilar with proper params', async () => {
      graphController.getSimilar.mockImplementation((req, res) => {
        expect(req.query.name).toBe('John');
        expect(req.query.topK).toBe('5');
        res.json({ similar: ['recommendation1'] });
      });

      const response = await request(app)
        .get('/api/graph/recommendations/John?k=5')
        .expect(200);

      expect(graphController.getSimilar).toHaveBeenCalled();
      expect(response.body).toEqual({ similar: ['recommendation1'] });
    });
  });

  describe('GET /api/graph/liked/:email', () => {
    it('should call getLikedByEmail controller method', async () => {
      const response = await request(app)
        .get('/api/graph/liked/test@example.com')
        .expect(200);

      expect(graphController.getLikedByEmail).toHaveBeenCalled();
      expect(response.body).toEqual({ liked: [] });
    });
  });

  describe('GET /api/graph/liked/:email/summary', () => {
    it('should call getLikedSummary controller method', async () => {
      const response = await request(app)
        .get('/api/graph/liked/test@example.com/summary')
        .expect(200);

      expect(graphController.getLikedSummary).toHaveBeenCalled();
      expect(response.body).toEqual({ summary: {} });
    });
  });

  describe('GET /api/graph/friends/:email', () => {
    it('should call getFriendsByEmail controller method', async () => {
      const response = await request(app)
        .get('/api/graph/friends/test@example.com')
        .expect(200);

      expect(graphController.getFriendsByEmail).toHaveBeenCalled();
      expect(response.body).toEqual({ friends: [] });
    });
  });
});