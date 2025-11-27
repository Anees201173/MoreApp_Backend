const request = require('supertest');
const app = require('../src/app');

describe('Auth endpoints (basic validation)', () => {
  test('POST /api/auth/login without body returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('POST /api/auth/register missing fields returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@x.com' });
    expect(res.statusCode).toBe(400);
  });
});
