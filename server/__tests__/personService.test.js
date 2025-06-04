import PersonService from '../services/PersonService';
import { driver } from '../neo4j';
import bcrypt from 'bcrypt';

jest.setTimeout(10000);

describe('PersonService (Updated)', () => {
  let mockModel;
  let service;

  beforeEach(() => {
    mockModel = {
      findByUser: jest.fn(),
      searchByName: jest.fn(),
      suggestSimilarNames: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };
    service = new PersonService(mockModel, driver);
  });

  afterAll(async () => {
    await driver.close();
  });

  test('authenticatePerson resolves for valid credentials', async () => {
    const fakeRecord = { username: 'alice', password: 'hashedpass', roles: ['athlete', 'user'] };
    mockModel.findByUser.mockResolvedValue(fakeRecord);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const { person, roles } = await service.authenticatePerson('alice', 'plainpass');
    expect(person).toEqual({ username: 'alice', roles: ['athlete', 'user'] });
    expect(roles).toEqual(['athlete', 'user']);
    expect(bcrypt.compare).toHaveBeenCalledWith('plainpass', 'hashedpass');
  });

  test('authenticatePerson returns null for invalid credentials', async () => {
    const fakeRecord = { username: 'alice', password: 'hashedpass', roles: ['user'] };
    mockModel.findByUser.mockResolvedValue(fakeRecord);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const { person, roles } = await service.authenticatePerson('alice', 'wrongpass');
    expect(person).toBeNull();
    expect(roles).toEqual([]);
  });

  test('searchAthletes returns formatted results', async () => {
    const mockResults = [
      { 
        identity: { toNumber: () => 1 },
        properties: { name: 'Alice', sport: 'Soccer', profileImage: 'alice.jpg' }
      },
      {
        identity: { toNumber: () => 2 },
        properties: { name: 'Bob', sport: 'Basketball', description: 'Great player' }
      }
    ];

    mockModel.searchByName.mockResolvedValue(mockResults);

    const result = await service.searchAthletes({ query: 'A', sport: 'Soccer' });

    expect(result.players).toEqual([
      { id: 1, name: 'Alice', sport: 'Soccer', profileImage: 'alice.jpg', description: null },
      { id: 2, name: 'Bob', sport: 'Basketball', profileImage: null, description: 'Great player' }
    ]);
    expect(mockModel.searchByName).toHaveBeenCalledWith({ query: 'A', sport: 'Soccer' });
  });

  test('searchAthletes returns suggestions when no results found', async () => {
    const mockSuggestions = [
      {
        identity: { toNumber: () => 3 },
        properties: { name: 'Alexandra', sport: 'Tennis' }
      }
    ];

    mockModel.searchByName.mockResolvedValue([]);
    mockModel.suggestSimilarNames.mockResolvedValue(mockSuggestions);

    const result = await service.searchAthletes({ query: 'Alex' });

    expect(result.players).toEqual([]);
    expect(result.suggestions).toEqual([
      { id: 3, name: 'Alexandra', sport: 'Tennis' }
    ]);
  });

  test('getTopUsers returns array of user properties', async () => {
    const sessionMock = {
      run: jest.fn().mockResolvedValue({
        records: [
          { get: () => ({ properties: { username: 'user1', sport: 'Soccer' } }) },
          { get: () => ({ properties: { username: 'user2', sport: 'Basketball' } }) },
        ]
      }),
      close: jest.fn(),
    };
    jest.spyOn(driver, 'session').mockReturnValue(sessionMock);

    const result = await service.getTopUsers(2);
    expect(sessionMock.run).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (p:Person)'),
      { limit: expect.any(Object) }
    );
    expect(result).toEqual([
      { username: 'user1', sport: 'Soccer' },
      { username: 'user2', sport: 'Basketball' }
    ]);
    expect(sessionMock.close).toHaveBeenCalled();
  });

  test('createOrUpdatePerson handles athlete creation', async () => {
    const athleteData = {
      name: 'Charlie',
      sport: 'Tennis',
      nationality: 'USA',
      roles: ['athlete'],
      gender: 'M'
    };

    const sessionMock = {
      run: jest.fn().mockResolvedValue({
        records: [
          { get: () => ({ properties: { ...athleteData, uuid: 'test-uuid' } }) }
        ]
      }),
      close: jest.fn()
    };
    jest.spyOn(driver, 'session').mockReturnValue(sessionMock);

    const result = await service.createOrUpdatePerson(athleteData);

    expect(sessionMock.run).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (p:Person {name: $name})'),
      expect.objectContaining(athleteData)
    );
    expect(result).toMatchObject(athleteData);
    expect(sessionMock.close).toHaveBeenCalled();
  });
});