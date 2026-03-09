# Load Testing – Read-Only GET Endpoints

**Purpose:** Measure p95/p99 latency, success rate, and timeout behavior for key GET endpoints.  
**Constraint:** Read-only; no production data or endpoints modified.

## Prerequisites

- Backend running (e.g. `npm run start:server` from project root or `cd server && node server.js`)
- Optional: Install a load tool (e.g. `npm install -g autocannon` or use the provided Node script)

## Endpoints to Test

| Endpoint | Auth | Notes |
|----------|------|--------|
| GET /health | No | Liveness |
| GET /ready | No | Readiness + DB |
| GET /api/products | No* | *May be cached; product list |
| GET /api/orders | Yes | List customer orders |
| GET /api/cart | Yes | Cart with items |
| GET /api/admin/users | Admin | Paginated |
| GET /api/admin/orders | Admin | Paginated |
| GET /api/admin/products | Admin | Paginated |
| GET /api/notifications | Yes | Notifications list |

## Using the Script (Node)

From project root with server running on default port 5000:

```bash
node scripts/load-test-get.mjs
```

The script sends concurrent GET requests to `/health`, `/ready`, and optionally `/api/products` (no auth), collects latencies, and prints p50/p95/p99 and success %. For authenticated or admin endpoints, set env vars or add tokens in the script.

## Manual / External Tools

- **autocannon:** `autocannon -c 10 -d 30 http://localhost:5000/health`
- **k6:** Define a small script hitting GET /health, /ready, /api/products and use `k6 run script.js`
- **Artillery:** YAML scenario with GET only

## What to Report

- **p95 / p99 latency** (ms) per endpoint
- **Request success %** (200 vs 4xx/5xx/503 timeout)
- **Timeout behavior:** Requests exceeding 15s should receive 503 and be logged by requestTimeout middleware
- **Recommendations:** If p99 > 5s for list endpoints, consider stronger caching or pagination defaults

## Safety

- Only GET requests; no data modification.
- Run against staging or a copy of production if possible; avoid hammering live DB with high concurrency without approval.
