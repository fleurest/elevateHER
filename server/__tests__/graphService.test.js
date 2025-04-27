import GraphService from '../GraphService';
import { driver } from '../neo4j';

jest.setTimeout(10000);

describe('GraphService.getSimilar', () => {
  let service;

  beforeEach(() => {
    const mockModel = { driver };
    service = new GraphService(mockModel);
  });

  afterAll(async () => {
    await driver.close();
  });

  it('returns names & scores from Neo4j', async () => {
    const records = [
      { get: key => (key === 'name' ? 'Alice' : 0.9) },
      { get: key => (key === 'name' ? 'Bob'   : 0.8) }
    ];
    const sessionMock = {
      run: jest.fn().mockResolvedValue({ records }),
      close: jest.fn(),
    };
    jest.spyOn(driver, 'session').mockReturnValue(sessionMock);

    const result = await service.getSimilar('Alice', 2);
    expect(result).toEqual([
      { name: 'Alice', score: 0.9 },
      { name: 'Bob',   score: 0.8 }
    ]);
    expect(sessionMock.close).toHaveBeenCalled();
  });
});