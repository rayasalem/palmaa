/**
 * k6 load script: catalog and rate-limit verification (read-only, safe).
 * Run: k6 run scripts/load/k6-catalog-rate-limit.js
 * Option: k6 run -e BASE_URL=https://palmaa.onrender.com scripts/load/k6-catalog-rate-limit.js
 *
 * Verifies:
 * - GET /api/products returns 200 and gets rate-limited (429) after exceeding limit.
 * - Invalid body on POST /api/auth/login returns 400 (validation).
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
  scenarios: {
    catalog_ok: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      startTime: '0s',
      exec: 'catalogGet',
    },
    catalog_rate_limit: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      startTime: '35s',
      exec: 'catalogExceedLimit',
    },
    auth_validation: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      startTime: '40s',
      exec: 'authValidation400',
    },
  },
  thresholds: {
    http_req_duration: ['p95<3000'],
    http_req_failed: ['rate<0.1'],
  },
};

export function catalogGet() {
  const res = http.get(`${BASE_URL}/api/products?limit=24&offset=0`);
  check(res, { 'catalog status 200': (r) => r.status === 200 });
  sleep(0.5);
}

export function catalogExceedLimit() {
  // Product list default limit 100/15min per IP; send 101 requests to trigger 429
  let lastStatus = 0;
  for (let i = 0; i < 105; i++) {
    const res = http.get(`${BASE_URL}/api/products?limit=24&offset=0`);
    lastStatus = res.status;
    if (res.status === 429) break;
    sleep(0.1);
  }
  check(lastStatus, (s) => s === 429, 'eventually 429');
}

export function authValidation400() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'not-an-email',
      password: 'short',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, { 'login invalid returns 400': (r) => r.status === 400 });
}
