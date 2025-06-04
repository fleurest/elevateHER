const request = require('supertest');
const express = require('express');

const mockSession = {
  run: jest.fn(),
  close: jest.fn()
};

const mockDriver = {
  session: jest.fn(() => mockSession)
};

jest.mock('../neo4j', () => ({
  driver: mockDriver
}));

jest.mock('../authentication', () => ({
  isAuthenticated: (req, res, next) => next()
}));

jest.mock('../models/Athlete', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../models/Person', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../services/PersonService', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../controllers/PersonController', () => {
  return jest.fn().mockImplementation(() => ({
    listAthletes: jest.fn(),
    searchAthletes: jest.fn(),
    createOrUpdatePerson: jest.fn(),
    linkAthleteToOrg: jest.fn(),
    removeAthleteOrganisation: jest.fn(),
    linkAthletes: jest.fn()
  }));
});

const athletesRoutes = require('../routes/api/athletes/athletesRoutes');
const PersonController = require('../controllers/PersonController');

describe('Athletes Routes', () => {
  let app;
  let mockPersonController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/athletes', athletesRoutes);

    mockPersonController = PersonController.mock.results[0].value;
    
    jest.clearAllMocks();
    mockSession.run.mockReset();
    mockSession.close.mockReset();
  });

  describe('GET /api/athletes', () => {
    it('should call listAthletes controller method', async () => {
      mockPersonController.listAthletes.mockImplementation((req, res) => {
        res.json([{ id: 1, name: 'Athlete 1' }]);
      });

      const response = await request(app)
        .get('/api/athletes')
        .expect(200);

      expect(mockPersonController.listAthletes).toHaveBeenCalled();
      expect(response.body).toEqual([{ id: 1, name: 'Athlete 1' }]);
    });
  });

  describe('GET /api/athletes/search', () => {
    it('should call searchAthletes controller method with authentication', async () => {
      mockPersonController.searchAthletes.mockImplementation((req, res) => {
        res.json({ players: [{ id: 1, name: 'Found Athlete' }] });
      });

      const response = await request(app)
        .get('/api/athletes/search?q=test')
        .expect(200);

      expect(mockPersonController.searchAthletes).toHaveBeenCalled();
      expect(response.body).toEqual({ players: [{ id: 1, name: 'Found Athlete' }] });
    });
  });

  describe('POST /api/athletes', () => {
    it('should call createOrUpdatePerson controller method', async () => {
      mockPersonController.createOrUpdatePerson.mockImplementation((req, res) => {
        res.status(201).json({ success: true, player: { name: 'New Athlete' } });
      });

      const response = await request(app)
        .post('/api/athletes')
        .send({
          name: 'New Athlete',
          sport: 'Basketball',
          nationality: 'USA'
        })
        .expect(201);

      expect(mockPersonController.createOrUpdatePerson).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true, player: { name: 'New Athlete' } });
    });
  });

  describe('POST /api/athletes/:id/organisation', () => {
    it('should call linkAthleteToOrg controller method', async () => {
      mockPersonController.linkAthleteToOrg.mockImplementation((req, res) => {
        res.json({ message: 'Athlete linked to organization' });
      });

      const response = await request(app)
        .post('/api/athletes/123/organisation')
        .send({ organisationId: 'org-456' })
        .expect(200);

      expect(mockPersonController.linkAthleteToOrg).toHaveBeenCalled();
      expect(response.body).toEqual({ message: 'Athlete linked to organization' });
    });
  });

  describe('DELETE /api/athletes/:id/organisation/:organisationId', () => {
    it('should call removeAthleteOrganisation controller method', async () => {
      mockPersonController.removeAthleteOrganisation.mockImplementation((req, res) => {
        res.json({ message: 'Relationship removed' });
      });

      const response = await request(app)
        .delete('/api/athletes/123/organisation/org-456')
        .expect(200);

      expect(mockPersonController.removeAthleteOrganisation).toHaveBeenCalled();
      expect(response.body).toEqual({ message: 'Relationship removed' });
    });
  });

  describe('PUT /api/athletes/uuid/:uuid', () => {
    it('should update athlete by UUID', async () => {
      mockSession.run.mockResolvedValue({
        records: [{
          get: jest.fn().mockReturnValue({
            properties: { uuid: 'test-uuid', name: 'Updated Athlete' }
          })
        }]
      });

      const response = await request(app)
        .put('/api/athletes/uuid/test-uuid')
        .send({
          name: 'Updated Athlete',
          sport: 'Tennis',
          description: 'Updated description'
        })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Athlete updated',
        person: { uuid: 'test-uuid', name: 'Updated Athlete' }
      });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return 404 if athlete not found', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const response = await request(app)
        .put('/api/athletes/uuid/non-existent')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body).toEqual({ error: 'Person not found' });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockSession.run.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .put('/api/athletes/uuid/test-uuid')
        .send({ name: 'Test' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to update athlete' });
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('GET /api/athletes/link', () => {
    it('should call linkAthletes controller method', async () => {
      mockPersonController.linkAthletes.mockImplementation((req, res) => {
        res.json({ linked: true });
      });

      const response = await request(app)
        .get('/api/athletes/link?q=test')
        .expect(200);

      expect(mockPersonController.linkAthletes).toHaveBeenCalled();
      expect(response.body).toEqual({ linked: true });
    });
  });
});