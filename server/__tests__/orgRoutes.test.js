const request = require('supertest');
const express = require('express');

// Mock dependencies for Organisation routes
jest.mock('../neo4j', () => ({
  driver: {
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn()
    }))
  }
}));

jest.mock('../models/Organisation');
jest.mock('../services/OrganisationService');
jest.mock('../controllers/OrganisationController');

const orgRoutes = require('../routes/orgRoutes');
const OrganisationController = require('../controllers/OrganisationController');

// Create test app for org routes
const orgApp = express();
orgApp.use(express.json());
orgApp.use('/api/org', orgRoutes);

describe('Organisation Routes', () => {
  let mockOrgController;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrgController = {
      upsert: jest.fn((req, res) => res.json({ success: true })),
      linkTeamToLeague: jest.fn((req, res) => res.json({ success: true })),
      list: jest.fn((req, res) => res.json([]))
    };

    OrganisationController.mockImplementation(() => mockOrgController);
  });

  describe('POST /api/org', () => {
    it('should call upsert controller method', async () => {
      const orgData = {
        name: 'Test Team',
        type: 'team',
        sport: 'Soccer',
        location: 'City A'
      };

      mockOrgController.upsert.mockImplementation((req, res) => {
        res.json({
          success: true,
          organisation: { ...orgData, id: '123' }
        });
      });

      const res = await request(orgApp)
        .post('/api/org')
        .send(orgData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.organisation).toMatchObject(orgData);
      expect(mockOrgController.upsert).toHaveBeenCalled();
    });
  });

  describe('POST /api/org/link', () => {
    it('should call linkTeamToLeague controller method', async () => {
      mockOrgController.linkTeamToLeague.mockImplementation((req, res) => {
        res.json({
          message: 'Team linked to league successfully'
        });
      });

      const res = await request(orgApp)
        .post('/api/org/link')
        .send({
          teamId: 'team-123',
          leagueId: 'league-456'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Team linked to league');
      expect(mockOrgController.linkTeamToLeague).toHaveBeenCalled();
    });
  });

  describe('GET /api/org', () => {
    it('should call list controller method', async () => {
      mockOrgController.list.mockImplementation((req, res) => {
        res.json([
          { id: '1', name: 'Team A', type: 'team' },
          { id: '2', name: 'League B', type: 'league' }
        ]);
      });

      const res = await request(orgApp).get('/api/org');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(mockOrgController.list).toHaveBeenCalled();
    });
  });
});