import GraphService from '../services/GraphService';
import { driver } from '../neo4j';

jest.setTimeout(10000);

describe('GraphService (Updated)', () => {
  let service;

  beforeEach(() => {
    const mockModel = { driver };
    service = new GraphService(mockModel);
  });

  afterAll(async () => {
    await driver.close();
  });

  it('getSimilar returns names & scores from Neo4j', async () => {
    const records = [
      { get: key => (key === 'name' ? 'Alice' : key === 'score' ? 0.95 : null) },
      { get: key => (key === 'name' ? 'Bob' : key === 'score' ? 0.87 : null) }
    ];
    const sessionMock = {
      run: jest.fn().mockResolvedValue({ records }),
      close: jest.fn(),
    };
    jest.spyOn(driver, 'session').mockReturnValue(sessionMock);

    const result = await service.getSimilar('Alice', 2);
    expect(result).toEqual([
      { name: 'Alice', score: 0.95 },
      { name: 'Bob', score: 0.87 }
    ]);
    expect(sessionMock.run).toHaveBeenCalledWith(
      expect.stringContaining('similarity'),
      expect.objectContaining({ name: 'Alice', limit: 2 })
    );
    expect(sessionMock.close).toHaveBeenCalled();
  });

  it('getParticipationGraph returns graph data', async () => {
    const records = [
      {
        get: key => {
          if (key === 'athlete') return { properties: { name: 'Alice' } };
          if (key === 'event') return { properties: { name: 'Olympics 2024' } };
          if (key === 'relationship') return { type: 'PARTICIPATED_IN' };
          return null;
        }
      }
    ];

    const sessionMock = {
      run: jest.fn().mockResolvedValue({ records }),
      close: jest.fn()
    };
    jest.spyOn(driver, 'session').mockReturnValue(sessionMock);

    const result = await service.getParticipationGraph(['Alice'], ['Olympics 2024']);

    expect(result).toEqual([
      {
        athlete: { name: 'Alice' },
        event: { name: 'Olympics 2024' },
        relationship: { type: 'PARTICIPATED_IN' }
      }
    ]);
    expect(sessionMock.close).toHaveBeenCalled();
  });

  it('computeEmbeddings processes graph embeddings', async () => {
    const sessionMock = {
      run: jest.fn()
        .mockResolvedValueOnce({ summary: { counters: { nodesCreated: 0 } } })
        .mockResolvedValueOnce({ summary: { counters: { propertiesSet: 100 } } }),
      close: jest.fn()
    };
    jest.spyOn(driver, 'session').mockReturnValue(sessionMock);

    const result = await service.computeEmbeddings({ dimensions: 64, iterations: 10 });

    expect(sessionMock.run).toHaveBeenCalledTimes(2);
    expect(sessionMock.run).toHaveBeenCalledWith(
      expect.stringContaining('gds.graph.project'),
      expect.any(Object)
    );
    expect(sessionMock.run).toHaveBeenCalledWith(
      expect.stringContaining('gds.node2vec'),
      expect.objectContaining({ dimensions: 64, iterations: 10 })
    );
  });

  it('getCommunities returns community detection results', async () => {
    const records = [
      {
        get: key => {
          if (key === 'communityId') return 1;
          if (key === 'members') return ['Alice', 'Bob'];
          return null;
        }
      },
      {
        get: key => {
          if (key === 'communityId') return 2;
          if (key === 'members') return ['Charlie', 'David'];
          return null;
        }
      }
    ];

    const sessionMock = {
      run: jest.fn().mockResolvedValue({ records }),
      close: jest.fn()
    };
    jest.spyOn(driver, 'session').mockReturnValue(sessionMock);

    const result = await service.getCommunities();

    expect(result).toEqual([
      { communityId: 1, members: ['Alice', 'Bob'] },
      { communityId: 2, members: ['Charlie', 'David'] }
    ]);
    expect(sessionMock.close).toHaveBeenCalled();
  });
});