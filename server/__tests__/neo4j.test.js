import { driver } from '../neo4j';

jest.setTimeout(10000);

describe('Neo4j Driver Connection', () => {
  afterAll(async () => {
    await driver.close();
  });

  it('should connect to Neo4j successfully', async () => {
    const session = driver.session();
    const result = await session.run('RETURN 1 AS number');
    const number = result.records[0].get('number').toNumber(); // ✅ Fix here
    expect(number).toBe(1);
    await session.close();
  });
});
