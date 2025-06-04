jest.setTimeout(10000);

jest.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => ({
          setCredentials: jest.fn(),
          getAccessToken: jest.fn().mockResolvedValue('mock-access-token')
        })),
      },
      calendar: jest.fn().mockReturnValue({
        events: {
          list: jest.fn().mockResolvedValue({ data: { items: [] } })
        }
      })
    }
  };
});

jest.mock('neo4j-driver', () => {
  const mockSession = {
    run: jest.fn().mockResolvedValue({
      records: [
        { get: () => ({ properties: { name: 'Test Event', year: 2024, location: 'Stadium' } }) }
      ]
    }),
    close: jest.fn()
  };

  return {
    driver: jest.fn(() => ({
      session: () => mockSession
    })),
    auth: { basic: jest.fn() }
  };
});

jest.mock('axios', () => ({
  get: jest.fn()
}));

const { getCalendarEvents, listPastEvents, listUpcomingEvents } = require('../services/EventCalService');
const { google } = require('googleapis');
const { driver } = require('neo4j-driver');
const axios = require('axios');

describe('EventCalService (Updated)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('listUpcomingEvents maps Google API data correctly', async () => {
    const fakeItems = [
      {
        id: '1',
        summary: 'Championship Match',
        start: { dateTime: '2025-06-01T15:00:00Z' },
        end: { dateTime: '2025-06-01T17:00:00Z' },
        description: 'Important match'
      }
    ];

    const calendar = google.calendar();
    calendar.events.list = jest.fn().mockResolvedValueOnce({ data: { items: fakeItems } });

    const result = await listUpcomingEvents('test-calendar-id');

    expect(calendar.events.list).toHaveBeenCalledWith(
      expect.objectContaining({ 
        calendarId: 'test-calendar-id',
        timeMin: expect.any(String),
        singleEvents: true,
        orderBy: 'startTime'
      })
    );

    expect(result).toEqual([
      {
        id: '1',
        summary: 'Championship Match',
        start: fakeItems[0].start,
        end: fakeItems[0].end,
        description: 'Important match'
      }
    ]);
  });

  test('listPastEvents maps Neo4j records correctly', async () => {
    const session = driver().session();
    const result = await listPastEvents();

    expect(session.run).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (e:Event)')
    );

    expect(result).toEqual([{ name: 'Test Event', year: 2024, location: 'Stadium' }]);
    expect(session.close).toHaveBeenCalled();
  });

  test('getCalendarEvents handles axios requests correctly', async () => {
    const mockEvents = [
      {
        summary: 'Test Event',
        start: { dateTime: '2025-06-01T10:00:00Z' },
        end: { dateTime: '2025-06-01T12:00:00Z' }
      }
    ];

    axios.get.mockResolvedValue({
      data: { items: mockEvents }
    });

    // Mock environment variables
    process.env.GOOGLE_CALENDAR_ID = 'test-calendar';
    process.env.GOOGLE_API_KEY = 'test-key';

    const result = await getCalendarEvents();

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('googleapis.com/calendar/v3/calendars/test-calendar/events')
    );
    expect(result).toEqual(mockEvents);
  });
});