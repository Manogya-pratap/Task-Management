const request = require('supertest');
const app = require('../../server/index');

describe('Health Check Endpoint', () => {
  test('GET /api/health should return OK status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('message', 'Daily Activity Tracker API is running');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /api/nonexistent should return 404', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(response.body).toHaveProperty('message', 'Route not found');
  });
});