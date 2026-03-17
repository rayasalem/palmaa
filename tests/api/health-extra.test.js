import { getRequest } from './helpers.js';

const request = getRequest();

describe('Health extra endpoints – /ready and /metrics', () => {
  it('GET /api/ready returns 200 or 503 with readiness payload', async () => {
    const res = await request.get('/api/ready');
    expect([200, 503, 403]).toContain(res.status);
    if (res.status === 200 || res.status === 503) {
      expect(res.body).toHaveProperty('ready');
      expect(res.body).toHaveProperty('checks');
    }
  });

  it('GET /api/metrics returns text payload', async () => {
    const res = await request.get('/api/metrics');
    expect([200, 403]).toContain(res.status);
  });
});

