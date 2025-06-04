const request = require('supertest');
const express = require('express');
const sportsRoutes = require('../routes/api/sports/sportsRoutes');

// Mock dependencies
jest.mock('../neo4j', () => ({
  driver: {
    session: jest.fn()
  }
}));

global.driver = require('../neo4j').driver;

describe('Sports Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/sports', sportsRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/sports/create', () => {
    it('should create or update a sport', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({
          records: [{
            get: jest.fn().mockReturnValue({
              properties: {
                name: 'Basketball',
                type: 'Team Sport',
                category: 'Ball Sports'
              }
            })
          }]
        }),
        close: jest.fn()
      };

      driver.session.mockReturnValue(mockSession);

      const response = await request(app)
        .post('/api/sports/create')
        .send({
          name: 'Basketball',
          type: 'Team Sport',
          category: 'Ball Sports',
          description: 'A team sport played with a ball and hoops'
        })
        .expect(200);

      expect(response.body.message).toBe('Sport Basketball created/updated successfully');
      expect(response.body.sport).toEqual({
        name: 'Basketball',
        type: 'Team Sport',
        category: 'Ball Sports'
      });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return 400 if sport name is missing', async () => {
      const response = await request(app)
        .post('/api/sports/create')
        .send({ type: 'Team Sport' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Sport name is required' });
    });

    it('should handle database errors', async () => {
      const mockSession = {
        run: jest.fn().mockRejectedValue(new Error('DB Error')),
        close: jest.fn()
      };

      driver.session.mockReturnValue(mockSession);

      const response = await request(app)
        .post('/api/sports/create')
        .send({ name: 'Basketball' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to create sport' });
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('POST /api/sports', () => {
    it('should create a new sport with alternate names', async () => {
      const mockSession = {
        run: jest.fn()
          .mockResolvedValueOnce({ records: [] })
          .mockResolvedValueOnce({ records: [] }),
        close: jest.fn()
      };

      driver.session.mockReturnValue(mockSession);

      const response = await request(app)
        .post('/api/sports')
        .send({
          name: 'Football',
          alternateName: ['Soccer', 'Association Football'],
          iocDisciplineCode: 'FBL'
        })
        .expect(201);

      expect(response.body).toEqual({
        message: 'Sport "Football" created successfully.'
      });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return 409 if sport already exists', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({
          records: [{
            get: jest.fn().mockReturnValue({
              properties: { name: 'Football' }
            })
          }]
        }),
        close: jest.fn()
      };

      driver.session.mockReturnValue(mockSession);

      const response = await request(app)
        .post('/api/sports')
        .send({
          name: 'Football',
          alternateName: ['Soccer'],
          iocDisciplineCode: 'FBL'
        })
        .expect(409);

      expect(response.body).toEqual({
        message: 'Sport "Football" already exists (by name or alternateName).'
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/sports')
        .send({ name: 'Football' })
        .expect(400);

      expect(response.body.message).toContain('Missing required fields');
    });
  });

  describe('GET /api/sports', () => {
    it('should fetch all sports sorted by name', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({
          records: [
            {
              get: jest.fn((field) => {
                const data = {
                  name: 'Basketball',
                  alternateName: ['Hoops'],
                  iocDisciplineCode: 'BKB'
                };
                return data[field];
              })
            },
            {
              get: jest.fn((field) => {
                const data = {
                  name: 'Football',
                  alternateName: ['Soccer', 'Association Football'],
                  iocDisciplineCode: 'FBL'
                };
                return data[field];
              })
            }
          ]
        }),
        close: jest.fn()
      };

      driver.session.mockReturnValue(mockSession);

      const response = await request(app)
        .get('/api/sports')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({
        name: 'Basketball',
        alternateName: ['Hoops'],
        iocDisciplineCode: 'BKB'
      });
      expect(response.body[1]).toEqual({
        name: 'Football',
        alternateName: ['Soccer', 'Association Football'],
        iocDisciplineCode: 'FBL'
      });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockSession = {
        run: jest.fn().mockRejectedValue(new Error('DB Error')),
        close: jest.fn()
      };

      driver.session.mockReturnValue(mockSession);

      const response = await request(app)
        .get('/api/sports')
        .expect(500);

      expect(response.body).toEqual({ message: 'Internal server error.' });
      expect(mockSession.close).toHaveBeenCalled();
    });
  });
});