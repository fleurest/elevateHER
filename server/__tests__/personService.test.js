import PersonService from '../services/PersonService';
import { driver } from '../neo4j';
import bcrypt from 'bcrypt';

jest.setTimeout(10000);

describe('PersonService', () => {
  let mockModel;
  let service;

  beforeEach(() => {
    mockModel = {
      findByUser: jest.fn(),
    };
    service = new PersonService(mockModel, driver);
  });

  afterAll(async () => {
    await driver.close();
  });

  test('authenticatePerson resolves for valid creds', async () => {
    const fakeRecord = { username: 'alice', password: 'hash', roles: ['user'] };
    mockModel.findByUser.mockResolvedValue(fakeRecord);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const { person, roles } = await service.authenticatePerson('alice', 'secret');
    expect(person).toEqual({ username: 'alice', roles: ['user'] });
    expect(roles).toEqual(['user']);
  });

  test('authenticatePerson returns null on bad creds', async () => {
    const fakeRecord = { username: 'alice', password: 'hash', roles: ['user'] };
    mockModel.findByUser.mockResolvedValue(fakeRecord);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const { person, roles } = await service.authenticatePerson('alice', 'wrong');
    expect(person).toBeNull();
    expect(roles).toEqual([]);
  });

  test('getTopUsers returns array of user properties', async () => {
    const sessionMock = {
      run: jest.fn().mockResolvedValue({
        records: [
          { get: () => ({ properties: { username: 'u1' } }) },
          { get: () => ({ properties: { username: 'u2' } }) },
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
    expect(result).toEqual([{ username: 'u1' }, { username: 'u2' }]);
    expect(sessionMock.close).toHaveBeenCalled();
  });
});
