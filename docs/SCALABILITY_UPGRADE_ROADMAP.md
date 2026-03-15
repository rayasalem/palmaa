# Palma Marketplace — Scalability Upgrade Roadmap

**Objective:** Support 1,000 merchants, 10M products, 100K daily visitors, 10K orders/day without breaking production.

**Principles:** Backup first; non-breaking changes first; optional new behavior (cursor, workers) before removing old behavior.

---

## Phase 0 — Backup (Do First)

1. **Commit and push current code**
   ```bash
   git add .
   git commit -m "Backup before scalability upgrade"
   git push origin main
   ```
2. **Verify production** (health, login, one order, one product list) before any deploy of new changes.
3. **Tag release** (optional): `git tag pre-scalability-upgrade && git push origin pre-scalability-upgrade`

---

## Phase 1 — Database (Safe, Additive)

### 1.1 Composite index for catalog (no app change required)

- **Migration:** Add index on `products(is_active, status, created_at DESC)` so catalog list with `ORDER BY created_at DESC` uses the index.
- **File:** `supabase/migrations/021_products_catalog_index.sql` (created in this upgrade).
- **Risk:** Low. Index creation is additive; run with `CREATE INDEX CONCURRENTLY` to avoid locking.
- **After deploy:** Run migration in Supabase (SQL Editor or CLI). Then deploy app; no code change required for this step.

### 1.2 Cursor/keyset pagination (backend support, optional)

- **Goal:** Allow clients to request “next page” by cursor instead of `offset`, so deep pages stay fast.
- **Approach:** Keep existing `limit`/`offset` behavior. Add optional query params: `cursor_created_at` (ISO timestamp) and optionally `cursor_id` (for tie-break). When provided, backend uses `WHERE (created_at, id) < (cursor_created_at, cursor_id)` and `ORDER BY created_at DESC, id DESC LIMIT n`; response includes `next_cursor_created_at` and `next_cursor_id` for the next page.
- **Risk:** Low. Existing clients ignore cursor; new frontend can adopt cursor when ready.
- **Steps:**
  1. Add optional `cursor_created_at`, `cursor_id` to catalog list validation (allow null).
  2. In `productService.getActiveProducts`, when cursor is present, use keyset condition; otherwise keep current offset/limit.
  3. Return in response: `next_cursor_created_at`, `next_cursor_id` when there are more results (e.g. when returned length === limit).

### 1.3 Full-text search (later phase)

- **Option A (Postgres):** Add `tsvector` column and GIN index on `products` for `name`/`description`; add `search` or `q_fts` query param that uses `to_tsquery` instead of `ilike` when present.
- **Option B (external):** Integrate Meilisearch/Elasticsearch; backend calls search engine for `q` and maps result IDs to DB for full row fetch.
- **Recommendation:** Start with Option A for simplicity; move to Option B if Postgres FTS does not meet latency at 10M rows.
- **Risk:** Medium. New query path; keep existing `q` (ilike) as fallback if FTS param not sent.

### 1.4 Read replicas (infra)

- **Planning only:** Document that catalog read queries (product list, product by id) can be routed to a read replica when Supabase (or self-hosted Postgres) supports it. No code change until replica is available; then switch Supabase client for read-only operations to replica URL (e.g. via env `SUPABASE_READ_URL`).

---

## Phase 2 — Backend

### 2.1 Multiple instances + load balancer

- **Action:** Run 2+ Node.js instances behind a load balancer (e.g. Render multiple dynos, or AWS ALB + ECS).
- **Requirement:** Shared rate-limit and cache store so limits and cache are consistent across instances → use Redis (Phase 2.2).
- **Risk:** Low if Redis is already used for rate limit and cache; otherwise sessions are stateless (JWT), so no sticky session required.

### 2.2 Redis for cache and rate limits

- **Current state:** When `REDIS_URL` is set, `cacheMiddleware` and rate limiters use Redis; when not set, in-memory (single instance).
- **Action:** Set `REDIS_URL` in production and ensure all app instances use it. Verify rate limit store and cache middleware use Redis (already implemented).
- **Risk:** Low. No code change if already wired; only env and Redis instance (e.g. Upstash, Redis Cloud).

### 2.3 Async queue for shipment (and payment callbacks)

- **Goal:** Remove synchronous LogesTechs (and optional payment) calls from the request path so that 50 concurrent checkouts do not block or timeout.
- **Steps:**
  1. Introduce a job queue (e.g. Bull/BullMQ with Redis, or Render background workers, or SQS).
  2. On “create shipment” or “after payment success,” push a job (orderId, payload) to the queue instead of calling LogesTechs in the request.
  3. Worker process(es) consume the job, call LogesTechs, update `orders.delivery_id` / `delivery_status`; on failure, retry with backoff and alert.
  4. API response to client: “Order confirmed; shipment will be created shortly” (e.g. 202 Accepted or 200 with `shipment_status: 'pending'`).
- **Risk:** Medium. Client and merchant UIs must not assume immediate `delivery_id`; show “processing” until worker updates the order. Keep idempotency (same orderId not processed twice).

### 2.4 Circuit breakers for external APIs

- **Goal:** Avoid blocking the process when LogesTechs or payment gateway is slow/down.
- **Action:** Wrap external HTTP calls (shipment, payment, address APIs) in a circuit breaker (e.g. `opossum` or custom: after N failures or timeout rate, open circuit and fail fast; half-open after cooldown). Return clear error to client and log for alerting.
- **Risk:** Low. Improves stability; no change to success-path contract.

---

## Phase 3 — Frontend

### 3.1 Server-side paginated catalog (stop “load all then filter”)

- **Current:** Frontend calls `GET /api/products` with no params → receives 24 products; filtering and pagination are client-side on that set.
- **Target:** Frontend uses `GET /api/products?limit=24&offset=0` (or cursor) and passes `category`, `q`, `sort` as query params; displays only the current page; “next” requests new page (offset or cursor).
- **Steps:**
  1. Add catalog API params: `category`, `q`, `sort` (e.g. newest, price_asc, price_desc), `limit`, `offset` (and optionally `cursor_created_at`, `cursor_id`). Backend already supports limit/offset/category/q; add sort if missing.
  2. Frontend: Remove single `getAll()` on catalog load. Instead, call list API with current page and filters; store only current page (and optionally next cursor) in state.
  3. Filters (category, search, price, sort) trigger new API request with updated params and page 1 (or cursor reset).
  4. Pagination (next/prev) triggers request with offset or cursor.
- **Risk:** Medium. This changes catalog UX to “one page at a time”; ensure “back” and deep links still work (e.g. persist filters in URL).

### 3.2 Virtualization for long lists

- **When:** If any view (e.g. merchant product list, admin product list) renders hundreds of rows in one page, use a virtual list (e.g. `react-window`, `@tanstack/react-virtual`) so only visible rows are in the DOM.
- **Risk:** Low. Add only where list length is large; keep pagination as primary.

### 3.3 Lazy-load images and code split

- **Current:** Some components use `loading="lazy"`; major views are lazy-loaded.
- **Action:** Ensure all product/offer images use `loading="lazy"` and explicit dimensions where possible; keep route-level code splitting for heavy views. Optional: image CDN and responsive srcset for thumbs.

---

## Phase 4 — Merchant Flow

### 4.1 Bulk product upload / queue

- **Option A:** New endpoint `POST /api/products/bulk` (auth MERCHANT) accepting an array of product payloads (e.g. max 100 per request). Backend validates and enqueues jobs; worker inserts products in batches; returns `job_id`. Frontend polls `GET /api/products/bulk/:job_id` for status and errors.
- **Option B:** CSV/Excel upload: same idea, backend parses and enqueues insert jobs.
- **Risk:** Medium. Rate-limit bulk endpoint; validate payload size and row count; ensure worker does not overload DB (batch size, throttle).

### 4.2 Dashboard with 10K products

- **Backend:** Already supports paginated `GET /api/products/merchant/:merchantId?limit=&offset=` (or cursor). Ensure default page size is reasonable (e.g. 50) and that list by merchant uses index on `merchant_id`.
- **Frontend:** Merchant dashboard product list must use server-side pagination (and optional virtualization for the current page if many rows shown). No “load all my products” in one call.

---

## Phase 5 — Infrastructure & Monitoring

### 5.1 Database tier

- **Action:** Upgrade Supabase (or DB) plan so that connection count, CPU, and storage support 10M products and 1M+ orders. Monitor slow queries and add indexes as needed (composite index in Phase 1 is the main one for catalog).

### 5.2 CDN

- **Static:** Serve frontend static assets (JS, CSS, images) from CDN (e.g. Vercel Edge, Cloudflare, or Render’s CDN if available).
- **Optional:** Cache product list responses at CDN or API gateway for anonymous catalog (e.g. short TTL by query key). Coordinate with existing Redis cache TTL to avoid confusion.

### 5.3 Monitoring and alerts

- **Metrics:** DB connection pool usage, query latency (P95, P99), API latency per route, queue depth and worker failure count.
- **Alerts:** High error rate, queue backlog, external API (shipment/payment) failure rate, DB CPU or connection exhaustion.
- **Tools:** Supabase dashboard, Render metrics, plus optional APM (e.g. Datadog, New Relic) or self-hosted Prometheus + Grafana.

---

## Implementation Order (Minimal Production Risk)

| Order | Layer      | Step                                      | Breaks prod? | Deploy after        |
|-------|------------|-------------------------------------------|-------------|---------------------|
| 1     | Backup     | Commit + push + tag                       | No          | —                   |
| 2     | Database   | Run migration 021 (composite index)       | No          | Migration run       |
| 3     | Backend    | Add optional cursor params to catalog API | No          | Deploy server       |
| 4     | Backend    | Implement keyset path in getActiveProducts | No          | Same deploy         |
| 5     | Infra      | Set REDIS_URL; scale to 2+ instances      | No          | Env + LB            |
| 6     | Backend    | Circuit breakers for external APIs        | No          | Deploy server       |
| 7     | Backend    | Queue + worker for shipment               | Careful     | Deploy + worker     |
| 8     | Frontend   | Catalog uses server-side pagination only  | UX change   | Deploy frontend     |
| 9     | Frontend   | Virtualization where needed               | No          | Deploy frontend     |
| 10    | Merchant   | Bulk upload API + worker                  | No          | Deploy both         |
| 11    | DB         | Full-text search (Postgres or external)   | No          | Deploy server       |
| 12    | Infra      | CDN, monitoring, alerts                   | No          | Config              |

---

## Performance & Stability Recommendations

1. **Always use Redis in production** when running more than one instance (rate limit and cache).
2. **Do not remove offset/limit** until all clients use cursor; then deprecate offset for catalog.
3. **Shipment and payment:** Prefer queue-based processing and return 202/200 with “pending” so the request path stays under 2–3 s.
4. **Catalog:** Rely on composite index and cursor pagination for 10M products; add FTS or external search for search-heavy traffic.
5. **Merchant 10K products:** Rely on paginated list and optional virtualization; avoid “load all” in dashboard.
6. **Monitoring:** Track DB and API latency, queue depth, and external API errors so you can scale or fix before users are impacted.

---

## Deliverables Checklist

- [x] Step-by-step implementation plan (this roadmap).
- [x] Ordered steps per layer (DB, backend, frontend, merchant, infra).
- [x] Non-breaking order: backup → index → optional cursor → Redis/instances → queue → frontend pagination → bulk → FTS → CDN/monitoring.
- [x] Performance and stability recommendations with minimal production risk.
- [x] Migration `021_products_catalog_index.sql` added (see repo).
- [x] Backend cursor support: optional `cursor_created_at` / `cursor_id` query params; response includes `next_cursor_created_at` and `next_cursor_id` when more results exist.

---

*End of Scalability Upgrade Roadmap. Run Phase 0 (backup) before applying any change.*
