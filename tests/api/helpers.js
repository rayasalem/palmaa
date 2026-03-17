/**
 * API test base URL. Server must be running (e.g. npm run start:server in another terminal,
 * or use test:api:server which starts it on PORT=5001).
 * Set API_BASE_URL to override (e.g. in CI).
 */
const defaultPort = process.env.TEST_API_PORT || '5001';
export const API_BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${defaultPort}`;

/** For supertest: request against base URL. Use getRequest() in tests. */
export function getRequest() {
  return require('supertest')(API_BASE_URL);
}
