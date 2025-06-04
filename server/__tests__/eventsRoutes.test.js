const request = require('supertest');
const express = require('express');
const eventsRoutes = require('../routes/api/events/eventsRoutes');
const axios = require('axios');

// Mock dependencies
jest.mock('axios');
jest.mock('../../../services/EventCalService');
jest.mock('../../../neo4j', () => ({
  driver: {
    session: jest.fn()
  }
}));

global.driver = require('../../../neo4j').driver;

describe('Events Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/events', eventsRoutes);
    jest.clearAllMocks();
    
    process.env.GOOGLE_CALENDAR_ID = 'test-calendar-id';
    process.env.GOOGLE_API_KEY = 'test-api-key';
  });

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({
          records: [{
            get: jest.fn().mockReturnValue({
              properties: { name: 'Test Event', sport: 'Tennis' }
            })
          }]
        }),
        close: jest.fn()
      };

      driver.session.mockReturnValue(mockSession);

      const response = await request(app)
        .post('/api/events')
        .send({
          name: 'Test Event',
          sport: 'Tennis',
          location: 'London',
          year: 2024
        })
        .expect(201);

      expect(response.body.message).toBe('Event Test Event created/updated successfully');
      expect(response.body.event).toEqual({ name: 'Test Event', sport: 'Tennis' });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return 400 if event name is missing', async () => {
      const response = await request(app)
        .post('/api/events')
        .send({ sport: 'Tennis' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Event name is required' });
    });
  });

  describe('POST /api/events/:eventId/sport', () => {
    it('should link event to sport', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({}),
        close: jest.fn()
      };

      driver.session.mockReturnValue(mockSession);

      const response = await request(app)
        .post('/api/events/event-123/sport')
        .send({ sportName: 'Basketball' })
        .expect(200);

      expect(response.body).toEqual({ message: 'Event linked to sport Basketball' });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return 400 if sport name is missing', async () => {
      const response = await request(app)
        .post('/api/events/event-123/sport')
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: 'Sport name is required' });
    });
  });

  describe('GET /api/events/list', () => {
    it('should fetch all events with filters', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({
          records: [
            {
              get: jest.fn().mockReturnValue({
                properties: { name: 'Event 1', sport: 'Tennis', year: 2024 }
              })
            },
            {
              get: jest.fn().mockReturnValue({
                properties: { name: 'Event 2', sport: 'Tennis', year: 2024 }
              })
            }
          ]
        }),
        close: jest.fn()
      };

      driver.session.mockReturnValue(mockSession);

      const response = await request(app)
        .get('/api/events/list?sport=Tennis&year=2024')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({ name: 'Event 1', sport: 'Tennis', year: 2024 });
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.sport = $sport AND e.year = $year'),
        { sport: 'Tennis', year: '2024' }
      );
    });
  });

  describe('GET /api/events/past-events', () => {
    it('should fetch past events from service', async () => {
      const { listPastEvents } = require('../../../services/EventCalService');
      listPastEvents.mockResolvedValue([
        { id: '1', name: 'Past Event 1' },
        { id: '2', name: 'Past Event 2' }
      ]);

      const response = await request(app)
        .get('/api/events/past-events')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({ id: '1', name: 'Past Event 1' });
    });

    it('should handle errors gracefully', async () => {
      const { listPastEvents } = require('../../../services/EventCalService');
      listPastEvents.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/events/past-events')
        .expect(500);

      expect(response.body).toEqual({ error: 'Past event fetch error' });
    });
  });

  describe('GET /api/events/calendar-events', () => {
    it('should fetch calendar events from Google Calendar API', async () => {
      axios.get.mockResolvedValue({
        data: {
          items: [
            {
              summary: 'Calendar Event 1',
              start: { dateTime: '2024-01-20T10:00:00Z' },
              end: { dateTime: '2024-01-20T11:00:00Z' }
            },
            {
              summary: 'Calendar Event 2',
              start: { date: '2024-01-21' },
              end: { date: '2024-01-22' }
            }
          ]
        }
      });

      const response = await request(app)
        .get('/api/events/calendar-events')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({
        summary: 'Calendar Event 1',
        start: '2024-01-20T10:00:00Z',
        end: '2024-01-20T11:00:00Z'
      });
      expect(response.body[1]).toEqual({
        summary: 'Calendar Event 2',
        start: '2024-01-21',
        end: '2024-01-22'
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com/calendar/v3/calendars')
      );
    });

    it('should handle API errors', async () => {
      axios.get.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .get('/api/events/calendar-events')
        .expect(500);

      expect(response.body).toEqual({ error: 'Calendar fetch error' });
    });
  });
});