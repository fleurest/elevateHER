jest.resetModules();

const sportsRoutes = require('../routes/sportsRoutes');
const { driver } = require('../neo4j');

// Create test app for sports routes
const sportsApp = express();
sportsApp.use(express.json());
sportsApp.use('/api/sports', sportsRoutes);

describe('Sports Routes', () => {
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSession = {
      run: jest.fn(),
      close: jest.fn()
    };
    driver.session.mockReturnValue(mockSession);
  });

  describe('POST /api/sports/create', () => {
    it('should create a new sport successfully', async () => {
      const sportData = {
        name: 'Soccer',
        type: 'Sport',
        category: 'Team Sport',
        description: 'A team sport played with a ball'
      };

      const mockSport = {
        properties: {
          ...sportData,
          label: 'Sport',
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      mockSession.run.mockResolvedValue({
        records: [{ get: () => mockSport }]
      });

      const res = await request(sportsApp)
        .post('/api/sports/create')
        .send(sportData);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Soccer created/updated successfully');
      expect(res.body.sport).toMatchObject(sportData);
      expect(mockSession.run).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return 400 when sport name is missing', async () => {
      const res = await request(sportsApp)
        .post('/api/sports/create')
        .send({ type: 'Sport' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Sport name is required');
    });
  });

  describe('POST /api/sports', () => {
    it('should create sport with alternate names and IOC code', async () => {
      const sportData = {
        name: 'Association Football',
        alternateName: ['Soccer', 'Football'],
        iocDisciplineCode: 'FB'
      };

      // Mock check for existing sport (none found)
      mockSession.run
        .mockResolvedValueOnce({ records: [] })
        .mockResolvedValueOnce({});

      const res = await request(sportsApp)
        .post('/api/sports')
        .send(sportData);

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toContain('Association Football created successfully');
      expect(mockSession.run).toHaveBeenCalledTimes(2);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(sportsApp)
        .post('/api/sports')
        .send({ name: 'Soccer' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Missing required fields');
    });

    it('should return 409 if sport already exists', async () => {
      // Mock existing sport found
      mockSession.run.mockResolvedValue({
        records: [{ get: () => ({ properties: { name: 'Soccer' } }) }]
      });

      const res = await request(sportsApp)
        .post('/api/sports')
        .send({
          name: 'Soccer',
          alternateName: ['Football'],
          iocDisciplineCode: 'FB'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('Soccer already exists');
    });
  });

  describe('GET /api/sports', () => {
    it('should return all sports ordered by name', async () => {
      const mockSports = [
        {
          get: (field) => {
            const sportData = {
              name: 'Basketball',
              alternateName: ['Hoops'],
              iocDisciplineCode: 'BK'
            };
            return sportData[field];
          }
        },
        {
          get: (field) => {
            const sportData = {
              name: 'Soccer',
              alternateName: ['Football'],
              iocDisciplineCode: 'FB'
            };
            return sportData[field];
          }
        }
      ];

      mockSession.run.mockResolvedValue({ records: mockSports });

      const res = await request(sportsApp).get('/api/sports');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        name: 'Basketball',
        alternateName: ['Hoops'],
        iocDisciplineCode: 'BK'
      });
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (s:Sport)'),
        undefined
      );
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockSession.run.mockRejectedValue(new Error('Database error'));

      const res = await request(sportsApp).get('/api/sports');

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Internal server error.');
      expect(mockSession.close).toHaveBeenCalled();
    });
  });
});