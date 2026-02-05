const request = require('supertest');
const app = require('../src/app');

describe('Auth endpoints (basic validation)', () => {
  test('POST /api/v1/auth/login without body returns 400', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('POST /api/v1/auth/register missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@x.com' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
