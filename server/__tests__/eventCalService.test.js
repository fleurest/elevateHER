jest.mock('../services/EventCalService', () => ({
  listUpcomingEvents: jest.fn(),
  listPastEvents: jest.fn()
}));

const { listUpcomingEvents, listPastEvents } = require('../services/EventCalService');

describe('EventCalService (Module Mock)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listUpcomingEvents', () => {
    it('should return upcoming events', async () => {
      const mockEvents = [
        {
          id: '1',
          summary: 'Test Event',
          start: { dateTime: '2024-01-20T10:00:00Z' },
          end: { dateTime: '2024-01-20T11:00:00Z' },
          description: 'Test description'
        }
      ];

      listUpcomingEvents.mockResolvedValue(mockEvents);

      const result = await listUpcomingEvents('test-calendar-id');

      expect(result).toEqual(mockEvents);
      expect(listUpcomingEvents).toHaveBeenCalledWith('test-calendar-id');
    });

    it('should handle errors', async () => {
      listUpcomingEvents.mockRejectedValue(new Error('Calendar API error'));

      await expect(listUpcomingEvents('test-calendar-id')).rejects.toThrow('Calendar API error');
    });
  });

  describe('listPastEvents', () => {
    it('should return past events', async () => {
      const mockEvents = [
        { id: '1', name: 'Past Event 1' },
        { id: '2', name: 'Past Event 2' }
      ];

      listPastEvents.mockResolvedValue(mockEvents);

      const result = await listPastEvents();

      expect(result).toEqual(mockEvents);
      expect(listPastEvents).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      listPastEvents.mockResolvedValue([]);

      const result = await listPastEvents();

      expect(result).toEqual([]);
    });
  });
});
