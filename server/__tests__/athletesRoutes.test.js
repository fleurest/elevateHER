jest.mock('../models/Athlete');
jest.mock('../models/Person');
jest.mock('../services/PersonService');
jest.mock('../controllers/PersonController');

const athletesRoutes = require('../routes/athletesRoutes');
const PersonController = require('../controllers/PersonController');
const { driver } = require('../neo4j');

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

jest.mock('../../../models/Athlete');
jest.mock('../../../models/Person');
jest.mock('../../../services/PersonService');
jest.mock('../../../controllers/PersonController');

const athletesRoutes = require('../routes/api/v1/athletesRoutes');
const PersonController = require('../../../controllers/PersonController');
const { driver } = require('../../../neo4j');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/athletes', athletesRoutes);

describe('Athletes Routes', () => {
  let mockPersonController;
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSession = {
      run: jest.fn(),
      close: jest.fn()
    };
    driver.session.mockReturnValue(mockSession);

    // Mock controller methods
    mockPersonController = {
      listAthletes: jest.fn((req, res) => res.json([])),
      searchAthletes: jest.fn((req, res) => res.json({ players: [] })),
      createOrUpdatePerson: jest.fn((req, res) => res.json({ success: true })),
      linkAthleteToOrg: jest.fn((req, res) => res.json({ success: true })),
      removeAthleteOrganisation: jest.fn((req, res) => res.json({ success: true })),
      linkAthletes: jest.fn((req, res) => res.json({ success: true }))
    };

    PersonController.mockImplementation(() => mockPersonController);
  });

  describe('GET /api/athletes', () => {
    it('should call listAthletes controller method', async () => {
      mockPersonController.listAthletes.mockImplementation((req, res) => {
        res.json([
          { id: '1', name: 'Alice', sport: 'Soccer' },
          { id: '2', name: 'Bob', sport: 'Basketball' }
        ]);
      });

      const res = await request(app).get('/api/athletes');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({ name: 'Alice', sport: 'Soccer' });
      expect(mockPersonController.listAthletes).toHaveBeenCalled();
    });
  });

  describe('GET /api/athletes/search', () => {
    it('should call searchAthletes controller method with authentication', async () => {
      mockPersonController.searchAthletes.mockImplementation((req, res) => {
        res.json({
          players: [{ id: '1', name: 'Alice', sport: 'Soccer' }],
          suggestions: []
        });
      });

      const res = await request(app)
        .get('/api/athletes/search')
        .query({ q: 'Alice' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('players');
      expect(mockPersonController.searchAthletes).toHaveBeenCalled();
    });
  });

  describe('POST /api/athletes', () => {
    it('should call createOrUpdatePerson controller method', async () => {
      const athleteData = {
        name: 'Charlie',
        sport: 'Tennis',
        nationality: 'USA',
        gender: 'M'
      };

      mockPersonController.createOrUpdatePerson.mockImplementation((req, res) => {
        res.json({
          success: true,
          player: { ...athleteData, id: '3' }
        });
      });

      const res = await request(app)
        .post('/api/athletes')
        .send(athleteData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.player).toMatchObject(athleteData);
      expect(mockPersonController.createOrUpdatePerson).toHaveBeenCalled();
    });
  });

  describe('POST /api/athletes/:id/organisation', () => {
    it('should call linkAthleteToOrg controller method', async () => {
      mockPersonController.linkAthleteToOrg.mockImplementation((req, res) => {
        res.json({ message: 'Athlete linked to organisation' });
      });

      const res = await request(app)
        .post('/api/athletes/123/organisation')
        .send({ organisationId: 'org456' });

      expect(res.statusCode).toBe(200);
      expect(mockPersonController.linkAthleteToOrg).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/athletes/:id/organisation/:organisationId', () => {
    it('should call removeAthleteOrganisation controller method', async () => {
      mockPersonController.removeAthleteOrganisation.mockImplementation((req, res) => {
        res.json({ message: 'Relationship removed' });
      });

      const res = await request(app)
        .delete('/api/athletes/123/organisation/org456');

      expect(res.statusCode).toBe(200);
      expect(mockPersonController.removeAthleteOrganisation).toHaveBeenCalled();
    });
  });

  describe('PUT /api/athletes/uuid/:uuid', () => {
    it('should update athlete by UUID when authenticated', async () => {
      const updateData = {
        name: 'Updated Name',
        sport: 'Updated Sport',
        description: 'Updated description'
      };

      mockSession.run.mockResolvedValue({
        records: [
          { get: () => ({ properties: { ...updateData, uuid: 'test-uuid' } }) }
        ]
      });

      const res = await request(app)
        .put('/api/athletes/uuid/test-uuid')
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Athlete updated');
      expect(res.body.person).toMatchObject(updateData);
      expect(mockSession.run).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return 404 when athlete not found', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const res = await request(app)
        .put('/api/athletes/uuid/nonexistent-uuid')
        .send({ name: 'Test' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Person not found');
    });
  });

  describe('GET /api/athletes/link', () => {
    it('should call linkAthletes controller method', async () => {
      mockPersonController.linkAthletes.mockImplementation((req, res) => {
        res.json({ linked: true });
      });

      const res = await request(app)
        .get('/api/athletes/link')
        .query({ q: 'search term' });

      expect(res.statusCode).toBe(200);
      expect(mockPersonController.linkAthletes).toHaveBeenCalled();
    });
  });
});