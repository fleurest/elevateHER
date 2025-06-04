const request = require('supertest');
const express = require('express');
const orgRoutes = require('../routes/api/org/orgRoutes');

jest.mock('../../../neo4j', () => ({
  driver: {}
}));

jest.mock('../../../controllers/OrganisationController');

describe('Organization Routes', () => {
  let app;
  let mockOrgController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/org', orgRoutes);

    const OrganisationController = require('../../../controllers/OrganisationController');
    mockOrgController = OrganisationController.mock.instances[0];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/org', () => {
    it('should call upsert controller method', async () => {
      mockOrgController.upsert = jest.fn((req, res) => {
        res.status(201).json({ 
          success: true, 
          organisation: { name: 'Test Org', id: '123' } 
        });
      });

      const response = await request(app)
        .post('/api/org')
        .send({
          name: 'Test Org',
          type: 'Team',
          sport: 'Basketball'
        })
        .expect(201);

      expect(mockOrgController.upsert).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: true,
        organisation: { name: 'Test Org', id: '123' }
      });
    });
  });

  describe('POST /api/org/link', () => {
    it('should call linkTeamToLeague controller method', async () => {
      mockOrgController.linkTeamToLeague = jest.fn((req, res) => {
        res.json({ 
          message: 'Team linked to league successfully' 
        });
      });

      const response = await request(app)
        .post('/api/org/link')
        .send({
          teamId: 'team-123',
          leagueId: 'league-456'
        })
        .expect(200);

      expect(mockOrgController.linkTeamToLeague).toHaveBeenCalled();
      expect(response.body).toEqual({
        message: 'Team linked to league successfully'
      });
    });
  });

  describe('GET /api/org', () => {
    it('should call list controller method', async () => {
      mockOrgController.list = jest.fn((req, res) => {
        res.json([
          { id: '1', name: 'Org 1', type: 'Team' },
          { id: '2', name: 'Org 2', type: 'League' }
        ]);
      });

      const response = await request(app)
        .get('/api/org')
        .expect(200);

      expect(mockOrgController.list).toHaveBeenCalled();
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({
        id: '1',
        name: 'Org 1',
        type: 'Team'
      });
    });

    it('should handle query parameters', async () => {
      mockOrgController.list = jest.fn((req, res) => {
        expect(req.query.type).toBe('Team');
        expect(req.query.sport).toBe('Basketball');
        res.json([
          { id: '1', name: 'Basketball Team', type: 'Team' }
        ]);
      });

      const response = await request(app)
        .get('/api/org?type=Team&sport=Basketball')
        .expect(200);

      expect(mockOrgController.list).toHaveBeenCalled();
      expect(response.body).toHaveLength(1);
    });
  });
});