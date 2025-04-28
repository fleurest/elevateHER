const request = require('supertest');
const app = require('../index');
const bcrypt = require('bcrypt');

const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};
jest.mock('../neo4j', () => ({
  driver: { session: () => mockSession }
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

describe('Active API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/athletes', () => {
    it('returns an array of athletes', async () => {
      mockSession.run.mockResolvedValue({
        records: [
          { get: key => (key === 'id' ? '1' : key === 'name' ? 'Alice' : 'img.png') }
        ]
      });

      const res = await request(app).get('/api/athletes');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([{ id: '1', name: 'Alice', image: 'img.png' }]);
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('POST /api/athlete/create', () => {
    it('400 if required fields missing', async () => {
      const res = await request(app).post('/api/athlete/create').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Missing required fields/);
    });

    it('200 and returns player on valid input', async () => {
      mockSession.run.mockResolvedValue({
        records: [
          { get: () => ({ properties: { name: 'Bob', sport: 'Soccer' } }) }
        ]
      });

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
        .post('/api/athlete/create')
        .send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.player).toMatchObject({ name: 'Bob', sport: 'Soccer' });
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('POST /api/login', () => {
    it('should return 400 if credentials are missing', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ username: '', password: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Missing credentials/i);
    });

    it('should return 401 if user does not exist', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const res = await request(app)
        .post('/api/login')
        .send({ username: 'u', password: 'p' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 200 and login successfully with valid credentials', async () => {
      mockSession.run.mockResolvedValue({ records: [{ get: () => 'fakehash' }] });
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/login')
        .send({ username: 'u', password: 'p' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body.user).toEqual({ username: 'u' });
    });
  });

  describe('GET /api/athlete/random', () => {
    it('returns a list of random athlete objects', async () => {
      mockSession.run.mockResolvedValue({
        records: [
          { get: () => ({ properties: { name: 'C' } }) }
        ]
      });

      const res = await request(app).get('/api/athlete/random');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([{ name: 'C' }]);
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (p:Person)')
      );
    });
  });
});
