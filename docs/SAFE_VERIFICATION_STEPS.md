# Safe Verification Steps — Backend Audit

Run these in **staging or test** environment only. Do not run brute-force or stress against production without approval.

## 1. Validation (400)

- **POST /api/auth/login** with body `{ "email": "x", "password": "y" }` (invalid email) → expect **400** and Joi message.
- **POST /api/orders** with missing required fields → expect **400**.
- **GET /api/orders?limit=-1** (invalid query) → expect **400** after validation.
- **GET /api/admin/users?limit=500** → expect **400** (admin list cap 100).

**Metrics:** `palma_http_validation_failures_total` should increment; logs should include `requestId` and `source`.

## 2. Rate limit (429)

- **GET /api/products** from same IP: send 101+ requests within 15 minutes → expect **429** after limit (default 100/15min).
- **POST /api/auth/login** (invalid credentials): send 201+ requests within 15 minutes → expect **429**.
- **POST /api/auth/mfa/verify** (invalid token): same auth limiter applies.

**Logs:** `rate_limit_429` with `requestId`, `route`, `ipMasked` (no raw IP).

## 3. Brute-force auth (safe)

- Script: 100× POST /api/auth/login with wrong password from one IP.
- Expect: 429 after configured auth limit; no password or token in logs; `sanitizeForLog` and `maskIp` applied.

## 4. Catalog load (k6)

- Run: `k6 run scripts/load/k6-catalog-rate-limit.js` (or with `-e BASE_URL=<staging>`).
- Verifies: catalog returns 200 under load; 429 when exceeding product list limit; login invalid body returns 400.

## 5. Health and readiness

- **GET /health** → 200, `{ ok: true }`.
- **GET /ready** → 200 when DB is up, 503 when DB is down; body includes `checks.database`.

## 6. Metrics

- **GET /metrics** (no auth, before general limiter) → Prometheus text with `palma_http_requests_total`, `palma_http_request_duration_seconds_bucket`, `palma_process_resident_memory_bytes`, `palma_process_cpu_user_seconds`.

## 7. CORS

- Request from allowed origin (e.g. FRONTEND_URL) → `Access-Control-Allow-Origin: <that origin>`.
- Request from disallowed origin → `Access-Control-Allow-Origin` should be first allowed origin, not the request origin (browser will block script access to response when credentials are sent).

## 8. /auth/check-key

- In production with default: **GET /api/auth/check-key** → **404** (disabled).
- With `ALLOW_AUTH_CHECK_KEY=true`: returns key type (use only in trusted environments).
