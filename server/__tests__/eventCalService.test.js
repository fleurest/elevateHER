jest.setTimeout(10000);

const recordProps = { eventName: 'Ev', year: 2020, location: 'X' };
const sessionMock = {
  run: jest.fn().mockResolvedValue({ records: [ { get: () => ({ properties: recordProps }) } ] }),
  close: jest.fn()
};

const googleCalendarListMock = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    calendar: () => ({
      events: { list: googleCalendarListMock }
    })
  }
}));

jest.mock('neo4j-driver', () => ({
  driver: jest.fn(() => ({ session: () => sessionMock })),
  auth: { basic: jest.fn() }
}));

const { listUpcomingEvents, listPastEvents } = require('../services/EventCalService');

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
        end:   { dateTime: '2025-05-01T12:00:00Z' },
        description: 'Desc'
      }
    ];
    googleCalendarListMock.mockResolvedValueOnce({ data: { items: fakeItems } });

    const result = await listUpcomingEvents('dummyCalId');

    expect(googleCalendarListMock).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: 'dummyCalId' })
    );
    expect(result).toEqual([
      { id: '1', summary: 'Match', start: fakeItems[0].start, end: fakeItems[0].end, description: 'Desc' }
    ]);
  });

  test('listPastEvents maps Neo4j records correctly', async () => {
    const result = await listPastEvents();

    expect(sessionMock.run).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (e:Event)')
    );
    expect(result).toEqual([recordProps]);
    expect(sessionMock.close).toHaveBeenCalled();
  });
});
