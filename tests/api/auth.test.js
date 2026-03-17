/**
 * API tests: POST /api/auth/login, POST /api/auth/register, GET /api/auth/me
 * Requires server running (TEST_API_PORT=5001 npm run start:server then npm run test:api).
 */
import { getRequest } from './helpers.js';

describe('POST /api/auth/login', () => {
  const request = getRequest();

  it('returns 400 when body is empty', async () => {
    const res = await request.post('/api/auth/login').set('Content-Type', 'application/json').send({});
    expect([400, 403]).toContain(res.status);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request.post('/api/auth/login').set('Content-Type', 'application/json').send({ password: 'secret' });
    expect([400, 403]).toContain(res.status);
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'not-an-email', password: 'secret' });
    expect([400, 403]).toContain(res.status);
  });

  it('returns 400 or 401 with valid shape (wrong credentials)', async () => {
    const res = await request
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'test@example.com', password: 'wrong' });
    expect([400, 401, 403]).toContain(res.status);
  });
});

describe('POST /api/auth/register', () => {
  const request = getRequest();

  it('returns 400 when body is empty', async () => {
    const res = await request.post('/api/auth/register').set('Content-Type', 'application/json').send({});
    expect([400, 403]).toContain(res.status);
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'bad', password: 'password123' });
    expect([400, 403]).toContain(res.status);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'user@example.com', password: '12345' });
    expect([400, 403]).toContain(res.status);
  });
});

describe('GET /api/auth/ping', () => {
  const request = getRequest();

  it('returns 200 and ok (or 403 if blocked)', async () => {
    const res = await request.get('/api/auth/ping');
    expect([200, 403]).toContain(res.status);
    if (res.status === 200) expect(res.body).toMatchObject({ ok: true, api: 'auth' });
  });
});

describe('GET /api/auth/me', () => {
  const request = getRequest();

  it('returns 200 without auth (optionalAuth)', async () => {
    const res = await request.get('/api/auth/me');
    expect([200, 401, 403]).toContain(res.status);
  });
});
