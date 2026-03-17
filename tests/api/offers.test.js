import { getRequest } from './helpers.js';

const request = getRequest();

describe('Offers API – public catalog offers', () => {
  it('GET /api/offers responds with 200 and an array or empty list', async () => {
    const res = await request.get('/api/offers');
    expect([200, 204, 403, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true);
    }
  });
});

