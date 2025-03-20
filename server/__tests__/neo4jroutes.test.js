const request = require('supertest');
const app = require('../index');

describe('GET /api/nodes', () => {
  it('should return list of nodes', async () => {
    const res = await request(app).get('/api/nodes');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.nodes)).toBe(true);
    expect(res.body.nodes.length).toBeGreaterThanOrEqual(0);
  });
});
