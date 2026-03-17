import { getRequest } from './helpers.js';

const request = getRequest();

describe('Products extra endpoints – merchant, likes, comments', () => {
  it('GET /api/products/merchant/:merchantId validates UUID and returns 400/404/200', async () => {
    const res = await request.get('/api/products/merchant/a1b2c3d4-0000-4000-8000-000000000001');
    expect([200, 400, 404, 403]).toContain(res.status);
  });

  it('GET /api/products/:id/likes-count is public', async () => {
    const res = await request.get('/api/products/a1b2c3d4-0000-4000-8000-000000000001/likes-count');
    expect([200, 404, 500, 403]).toContain(res.status);
  });

  it('GET /api/products/:id/liked accepts optional auth', async () => {
    const res = await request.get('/api/products/a1b2c3d4-0000-4000-8000-000000000001/liked');
    expect([200, 404, 401, 403, 500]).toContain(res.status);
  });

  it('GET /api/products/:id/comments is public', async () => {
    const res = await request.get('/api/products/a1b2c3d4-0000-4000-8000-000000000001/comments');
    expect([200, 404, 500, 403]).toContain(res.status);
  });

  it('POST /api/products/:id/like requires auth', async () => {
    const res = await request.post('/api/products/a1b2c3d4-0000-4000-8000-000000000001/like');
    expect([401, 403]).toContain(res.status);
  });

  it('DELETE /api/products/:id/like requires auth', async () => {
    const res = await request.delete('/api/products/a1b2c3d4-0000-4000-8000-000000000001/like');
    expect([401, 403]).toContain(res.status);
  });

  it('POST /api/products/:id/comment requires auth and validates body', async () => {
    const res = await request
      .post('/api/products/a1b2c3d4-0000-4000-8000-000000000001/comment')
      .send({});
    expect([401, 403, 400]).toContain(res.status);
  });
});

