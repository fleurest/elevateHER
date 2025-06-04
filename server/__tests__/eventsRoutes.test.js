const request = require('supertest');
const express = require('express');
const axios = require('axios');

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

jest.mock('../services/EventCalService', () => ({
    getCalendarEvents: jest.fn(),
    listPastEvents: jest.fn(),
    listUpcomingEvents: jest.fn()
  }));
  jest.mock('axios');
  
  const eventsRoutes = require('../routes/eventsRoutes');
  const { driver } = require('../neo4j');
  const { listPastEvents } = require('../services/EventCalService');
  

// Create test app
const app = express();
app.use(express.json());
app.use('/api/events', eventsRoutes);

describe('Events Routes', () => {
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSession = {
      run: jest.fn(),
      close: jest.fn()
    };
    driver.session.mockReturnValue(mockSession);

    // Mock environment variables
    process.env.GOOGLE_CALENDAR_ID = 'test-calendar-id';
    process.env.GOOGLE_API_KEY = 'test-api-key';
  });

  describe('POST /api/events', () => {
    it('should create a new event successfully', async () => {
      const eventData = {
        name: 'Test Championship',
        sport: 'Soccer',
        location: 'Stadium A',
        year: 2024,
        roles: ['athlete', 'coach']
      };

      const mockEvent = {
        properties: {
          ...eventData,
          uuid: 'test-uuid',
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      mockSession.run.mockResolvedValue({
        records: [{ get: () => mockEvent }]
      });

      const res = await request(app)
        .post('/api/events')
        .send(eventData);

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toContain('Test Championship created/updated successfully');
      expect(res.body.event).toMatchObject(eventData);
      expect(mockSession.run).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return 400 when event name is missing', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({ sport: 'Soccer' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Event name is required');
    });

    it('should handle database errors', async () => {
      mockSession.run.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/events')
        .send({ name: 'Test Event' });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Failed to create event');
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('POST /api/events/:eventId/sport', () => {
    it('should link event to sport successfully', async () => {
      mockSession.run.mockResolvedValue({
        records: [{ get: () => ({}) }]
      });

      const res = await request(app)
        .post('/api/events/test-event-id/sport')
        .send({ sportName: 'Soccer' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Event linked to sport Soccer');
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (e)-[:PART_OF_SPORT]->(s)'),
        { eventId: 'test-event-id', sportName: 'Soccer' }
      );
    });

    it('should return 400 when sport name is missing', async () => {
      const res = await request(app)
        .post('/api/events/test-event-id/sport')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Sport name is required');
    });
  });

  describe('GET /api/events/list', () => {
    it('should return all events when no filters provided', async () => {
      const mockEvents = [
        { properties: { name: 'Event 1', year: 2024, sport: 'Soccer' } },
        { properties: { name: 'Event 2', year: 2023, sport: 'Basketball' } }
      ];

      mockSession.run.mockResolvedValue({
        records: mockEvents.map(event => ({ get: () => event }))
      });

      const res = await request(app).get('/api/events/list');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({ name: 'Event 1', sport: 'Soccer' });
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (e:Event)'),
        {}
      );
    });

    it('should filter events by sport', async () => {
      mockSession.run.mockResolvedValue({
        records: [
          { get: () => ({ properties: { name: 'Soccer Event', sport: 'Soccer' } }) }
        ]
      });

      const res = await request(app)
        .get('/api/events/list')
        .query({ sport: 'Soccer' });

      expect(res.statusCode).toBe(200);
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.sport = $sport'),
        { sport: 'Soccer' }
      );
    });

    it('should filter events by multiple criteria', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      await request(app)
        .get('/api/events/list')
        .query({ sport: 'Soccer', year: '2024', location: 'stadium' });

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.sport = $sport AND e.year = $year AND toLower(e.location) CONTAINS toLower($location)'),
        { sport: 'Soccer', year: '2024', location: 'stadium' }
      );
    });
  });

  describe('GET /api/events/past-events', () => {
    it('should return past events from service', async () => {
      const mockPastEvents = [
        { eventName: 'Past Event 1', year: 2020 },
        { eventName: 'Past Event 2', year: 2021 }
      ];

      listPastEvents.mockResolvedValue(mockPastEvents);

      const res = await request(app).get('/api/events/past-events');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockPastEvents);
      expect(listPastEvents).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      listPastEvents.mockRejectedValue(new Error('Service error'));

      const res = await request(app).get('/api/events/past-events');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Past event fetch error');
    });
  });

  describe('GET /api/events/calendar-events', () => {
    it('should return calendar events from Google API', async () => {
      const mockGoogleResponse = {
        data: {
          items: [
            {
              summary: 'Meeting 1',
              start: { dateTime: '2024-01-01T10:00:00Z' },
              end: { dateTime: '2024-01-01T11:00:00Z' }
            },
            {
              summary: 'Meeting 2',
              start: { date: '2024-01-02' },
              end: { date: '2024-01-03' }
            }
          ]
        }
      };

      axios.get.mockResolvedValue(mockGoogleResponse);

      const res = await request(app).get('/api/events/calendar-events');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        summary: 'Meeting 1',
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z'
      });
      expect(res.body[1]).toMatchObject({
        summary: 'Meeting 2',
        start: '2024-01-02',
        end: '2024-01-03'
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com/calendar/v3/calendars/test-calendar-id/events')
      );
    });

    it('should handle Google API errors', async () => {
      axios.get.mockRejectedValue(new Error('Google API error'));

      const res = await request(app).get('/api/events/calendar-events');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Calendar fetch error');
    });
  });
});