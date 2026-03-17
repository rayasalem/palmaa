/**
 * API tests: GET /api/health, GET /api/status
 * Requires server running (TEST_API_PORT=5001 npm run start:server then npm run test:api).
 */
import { getRequest } from './helpers.js';

describe('GET /api/health', () => {
  const request = getRequest();

  it('returns 200', async () => {
    const res = await request.get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/status', () => {
  const request = getRequest();

  it('returns 200 with ok and database', async () => {
    const res = await request.get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok');
    expect(res.body).toHaveProperty('database');
  });
});
