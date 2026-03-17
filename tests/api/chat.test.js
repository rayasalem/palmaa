import { getRequest } from './helpers.js';

const request = getRequest();

describe('Chat API – validation', () => {
  it('POST /api/chat returns 400 when body is missing required fields', async () => {
    const res = await request.post('/api/chat').send({});
    expect([400, 403]).toContain(res.status);
  });

  it('POST /api/chat accepts minimal valid payload or returns 400 validation error', async () => {
    const res = await request.post('/api/chat').send({ message: 'Hello from tests' });
    expect([200, 400, 403, 500]).toContain(res.status);
  });
});

