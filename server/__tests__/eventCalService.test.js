jest.setTimeout(10000);

const recordProps = { eventName: 'Ev', year: 2020, location: 'X' };

jest.mock('googleapis', () => {
  const mockGoogleCalendarList = jest.fn();

  return {
    google: {
      calendar: () => ({
        events: { list: mockGoogleCalendarList }
      })
    }
  };
});

jest.mock('neo4j-driver', () => {
  const mockSession = {
    run: jest.fn().mockResolvedValue({
      records: [
        { get: () => ({ properties: { eventName: 'Ev', year: 2020, location: 'X' } }) }
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

const { listUpcomingEvents, listPastEvents } = require('../services/EventCalService');

const { google } = require('googleapis');
const { driver } = require('neo4j-driver');

describe('EventCalService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('listUpcomingEvents maps Google API data correctly', async () => {
    const fakeItems = [
      {
        id: '1',
        summary: 'Match',
        start: { dateTime: '2025-05-01T10:00:00Z' },
        end: { dateTime: '2025-05-01T12:00:00Z' },
        description: 'Desc'
      }
    ];

    const calendar = google.calendar();
    calendar.events.list = jest.fn().mockResolvedValueOnce({ data: { items: fakeItems } });

    const result = await listUpcomingEvents('dummyCalId');

    expect(calendar.events.list).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: 'dummyCalId' })
    );

    expect(result).toEqual([
      {
        id: '1',
        summary: 'Match',
        start: fakeItems[0].start,
        end: fakeItems[0].end,
        description: 'Desc'
      }
    ]);
  });

  test('listPastEvents maps Neo4j records correctly', async () => {
    const session = driver().session();
    const result = await listPastEvents();

    expect(session.run).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (e:Event)')
    );

    expect(result).toEqual([{ eventName: 'Ev', year: 2020, location: 'X' }]);
    expect(session.close).toHaveBeenCalled();
  });
});
