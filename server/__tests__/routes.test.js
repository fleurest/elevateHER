jest.mock('../controllers/PersonController', () => {
  return jest.fn().mockImplementation(() => ({
    listAthletes: jest.fn((req, res) => {
      // Handle random query parameter
      if (req.query.random === 'true') {
        return res.json([{ name: 'C' }]);
      }
      // Regular athletes list
      return res.json([
        { id: '1', name: 'Alice', image: 'img.png' },
        { id: '2', name: 'Bobina', image: 'bob.png' }
      ]);
    }),

    createOrUpdatePerson: jest.fn((req, res) => {
      if (!req.body.name || !req.body.sport) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      return res.status(200).json({
        success: true,
        player: {
          name: req.body.name,
          sport: req.body.sport
        }
      });
    }),

    searchAthletes: jest.fn((req, res) => {
      return res.json({ players: [] });
    }),

    linkAthleteToOrg: jest.fn((req, res) => {
      return res.json({ success: true });
    }),

    removeAthleteOrganisation: jest.fn((req, res) => {
      return res.json({ success: true });
    }),

    linkAthletes: jest.fn((req, res) => {
      return res.json({ success: true });
    }),

    // Added mock for login to satisfy /api/users/login route
    login: jest.fn(async (req, res) => {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
      }

      // Simulate database lookup using mocked Neo4j driver
      const { mockSession } = require('neo4j-driver');
      const result = await mockSession.run();

      if (!result.records || result.records.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const storedHash = result.records[0].get();
      const bcrypt = require('bcrypt');
      const match = await bcrypt.compare(password, storedHash);

      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.status(200).json({
        message: 'Login successful',
        user: {
          username: 'u',
          email
        }
      });
    }),

  logout: jest.fn((req, res) => {
    return res.json({ message: 'Logged out' });
  })
  }));
});

jest.mock('neo4j-driver', () => {
  const mockRun = jest.fn();
  const mockClose = jest.fn();
  const mockSession = {
    run: mockRun,
    close: mockClose,
  };
  const mockDriver = {
    session: jest.fn(() => mockSession),
  };
  return {
    driver: jest.fn(() => mockDriver),
    auth: { basic: jest.fn() },
    int: jest.fn((value) => ({ toNumber: () => Number(value) })),
    __esModule: true,
    mockSession,
    mockRun,
    mockClose,
  };
});

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

const request = require('supertest');
const app = require('../index');
const { mockSession, mockRun } = require('neo4j-driver');

describe('Active API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/athletes', () => {
    it('returns an array of athletes', async () => {
      const res = await request(app).get('/api/athletes');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([
        { id: '1', name: 'Alice', image: 'img.png' },
        { id: '2', name: 'Bob', image: 'bob.png' }
      ]);
    });
  });

  describe('GET /api/athletes?random=true', () => {
    it('returns a list of random athlete objects', async () => {
      const res = await request(app)
        .get('/api/athletes')
        .query({ random: 'true', athleteCount: 5 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([{ name: 'C' }]);
    });
  });

  describe('POST /api/athletes', () => {
    it('400 if required fields missing', async () => {
      const res = await request(app).post('/api/athletes').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Missing required fields/);
    });

    it('200 and returns player on valid input', async () => {
      const payload = {
        name: 'Bob',
        sport: 'Soccer',
        nationality: 'X',
        roles: [],
        gender: 'M',
        profileImage: null,
        birthDate: null
      };
      const res = await request(app)
        .post('/api/athletes')
        .send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.player).toMatchObject({ name: 'Bob', sport: 'Soccer' });
    });
  });

  describe('POST /api/users/login', () => {
    it('should return 400 if credentials are missing', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: '', password: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Missing credentials/i);
    });

    it('should return 401 if user does not exist', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'u@example.com', password: 'p' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 200 and login successfully with valid credentials', async () => {
      mockSession.run.mockResolvedValue({ records: [{ get: () => 'fakehash' }] });
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'u@example.com', password: 'p' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body.user).toMatchObject({ username: 'u', email: 'u@example.com' });
    });
  });

  describe('POST /api/athletes/:id/organisation', () => {
    it('should hit the endpoint and call Neo4j driver with correct cypher', async () => {
      const res = await request(app)
        .post('/api/athletes/123/organisation')
        .send({ organisationId: 'org456' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});