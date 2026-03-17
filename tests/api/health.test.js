/**
 * API tests: GET /api/health, GET /api/status
 * Requires server running (TEST_API_PORT=5001 npm run start:server then npm run test:api).
 */
import { getRequest } from './helpers.js';

describe('GET /api/health', () => {
  const request = getRequest();

  it('returns 200 (or 403 if middleware blocks)', async () => {
    const res = await request.get('/api/health');
    expect([200, 403]).toContain(res.status);
    if (res.status === 200) expect(res.body).toHaveProperty('ok');
  });
});

describe('GET /api/status', () => {
  const request = getRequest();

  it('returns 200 with ok and database (or 403 if blocked)', async () => {
    const res = await request.get('/api/status');
    expect([200, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('ok');
      expect(res.body).toHaveProperty('database');
    }
  });
});
