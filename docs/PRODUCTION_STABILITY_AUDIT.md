# Palma Marketplace — Full Production Stability Audit

**Date:** March 2026  
**Scope:** Backend, database, frontend bundle, Redis, API response times, Supabase connection limits, memory, event loop, payment gateway.  
**Output:** Capacity estimates, bottlenecks, crash risks, scaling recommendations.

---

## 1. Backend

### Current setup
- **Runtime:** Single Node.js process; no built-in clustering (no `cluster` or PM2 workers).
- **Request timeout:** 15 s (`REQUEST_TIMEOUT_MS`); applies to all routes except Cybersource REST (15 s dedicated).
- **Rate limits (when Redis not used: per-instance in-memory):**
  - General: 200 req / 15 min (`RATE_LIMIT_MAX`).
  - Products list: 120 req/min + productListLimiter (100/15 min on routes).
  - Cart: 60 req/min + 150/15 min.
  - Orders: 30 req/min.
  - Payment: 20 req/min.
  - Merchant product create: 50/15 min per merchant.
- **Payload:** `express.json({ limit: '15mb' })` — large product payloads can increase memory per request.
- **Error handling:** `asyncHandler` on async routes; `uncaughtException` / `unhandledRejection` log and exit(1).
- **Graceful shutdown:** SIGTERM/SIGINT close server, 10 s force exit.

### Strengths
- Async handlers wrapped; global timeout; rate limits; Helmet, CORS, compression.
- Product list: pagination (default 24, max 1000), cursor support, 1000-row cap, slow-query logging (>800 ms).
- Order list: cursor pagination; cart/orders not cached.

### Gaps
- Single process: no horizontal scaling without external load balancer + multiple instances.
- 15 MB JSON body: a few concurrent large uploads can spike memory.
- No request queue or backpressure; under burst, connections queue in Node.

---

## 2. Database (Supabase / PostgreSQL)

### Schema and indexes (from migrations)
- **products:** `idx_products_merchant_id`, `idx_products_is_active_status`, `idx_products_catalog_list` (is_active, status, created_at DESC), `idx_products_created_at_desc`, `idx_products_price`, `idx_products_status_is_active_created_at_desc`, FTS GIN `idx_products_tsv`.
- **orders:** `idx_orders_customer_id`, `idx_orders_merchant_id`, `idx_orders_created_at_desc`.
- **order_items:** `idx_order_items_order_id`.
- **carts:** unique on `user_id`; **notifications:** `idx_notifications_user_id_created_at`.

### Query patterns
- Catalog: `WHERE is_active = true AND status IN ('active','APPROVED')` + optional category/q + `ORDER BY` + `LIMIT`/range or cursor — index-friendly.
- Product list by merchant: `merchant_id` + range — indexed.
- Orders by customer/merchant: cursor or range with limit — indexed.
- Product list does 1 products query + 1 suspended users + 1 getMerchantNamesMap (users + merchant_profiles) — multiple round-trips per request.

### Supabase connection limits
- **Single shared client:** One `createClient(supabaseUrl, supabaseServiceKey)` per process; no explicit pool size.
- Supabase/PostgREST connection pool is determined by **Supabase plan** (e.g. free/pro: limited concurrent connections). Each Node process holds one HTTP client; connection reuse is inside Supabase’s pool.
- **Risk:** Many concurrent requests from one instance = many concurrent HTTP requests to PostgREST; if plan limit is low, 503s or queueing can occur. No connection-pool configuration in app code.

### Verdict (database)
- Indexes support catalog at 10M products and orders at high volume, with pagination and cursor.
- Limit 1000 rows per product list request; no unbounded scans.
- Main limits: **Supabase plan connection/concurrency** and **multiple round-trips per product list** (products + users + merchant_profiles).

---

## 3. Frontend Bundle

### Build output (Vite production)
- **Largest chunks:**  
  - `index-*.js` ~273 KB (gzip ~81 KB) — main app.  
  - `react-vendor-*.js` ~168 KB (gzip ~50 KB).  
  - `supabase-*.js` ~167 KB (gzip ~44 KB).  
- **Route chunks:** PublicWebsite ~44 KB, PublicCatalog ~38 KB, CustomerView ~23 KB, etc.
- **CSS:** ~91 KB (gzip ~14 KB).
- **Total JS (main + vendors + supabase):** ~608 KB (gzip ~175 KB). No chunk exceeds 500 KB; `chunkSizeWarningLimit: 600` and `manualChunks` (react, lucide, supabase, vendor) keep splits reasonable.

### Strengths
- Code splitting by route; lazy-loadable views; React.memo and lazy loading on ProductCard/OfferCard.
- Catalog uses server-side pagination (`getCatalogPage`), not full client-side list.

### Notes
- Supabase client in main bundle; first load carries auth and realtime stack even if not used on first paint.
- Dynamic import of `cloudinaryService` in store while also static in storageService — dynamic chunk may not split as intended (Vite warning).

---

## 4. Redis Usage

### Where Redis is used
- **Cache:** `cacheMiddleware` — GET /api/products (and GET /api/offers) cached 60 s; key = `originalUrl` (path + query). Product keys tracked in set for invalidation on create/update/delete.
- **Rate limiting:** When `REDIS_URL` is set, `getRateLimitStore()` supplies a Redis store for all limiters so limits are **shared across instances**.

### Behavior
- **If Redis unavailable:** Cache falls back to in-memory Map (per instance); rate limiters fall back to in-memory (per instance). No crash; requests continue.
- **Client:** Single `ioredis` client per process; maxRetriesPerRequest 3; retry strategy up to 3 times; errors logged.

### Limits
- No TTL or max keys on in-memory cache — under heavy traffic without Redis, memory can grow.
- Redis used only for cache and rate-limit store; no session store or job queue in code.

---

## 5. API Response Times

### Instrumentation
- **requestLogger:** Logs every request; `api_timing` for GET /api/products, /api/cart, /api/orders with `durationMs`, `status`, `requestId`.
- **productService:** Logs `slow_query` when product list or merchant list query > 800 ms (`getActiveProducts`, `getProductsByMerchantId`).
- **requestTimeoutMiddleware:** 15 s global; responds 503 if exceeded.

### Factors that affect latency
- **Catalog:** DB query + suspended users + getMerchantNamesMap (2 extra round-trips). With cache hit, response is fast; cache miss at scale depends on indexes and FTS/ILIKE.
- **Cart:** getOrCreateCart + items + optional offer lookups — several DB round-trips.
- **Orders:** Cursor/range list or single order + items — indexed; typically low latency unless offset very large.
- **Payment (Cybersource):** External authorize + capture; 15 s timeout; no circuit breaker in app (only timeout).

### Expected (with indexes and cache)
- GET /api/products (cached): &lt; 50 ms.
- GET /api/products (uncached, first page): ~100–500 ms depending on DB and FTS.
- GET /api/cart, GET /api/orders (paginated): ~50–200 ms.
- POST payment: 1–5 s when Cybersource is healthy; up to 15 s on slow response.

---

## 6. Supabase Connection Limits

- **App side:** One Supabase client per Node process; no explicit pool. Each request that hits DB uses the same client (connection reuse is inside Supabase/PostgREST).
- **Supabase side:** Connection and concurrency limits are per **project/plan** (e.g. free tier: limited connections and API requests). Not visible in code.
- **Recommendation:** Check Supabase Dashboard (Settings / API / usage) and plan limits. For multiple Node instances, total concurrent requests to Supabase = sum across instances; stay under plan’s concurrent connection/request limits.

---

## 7. Memory Usage

- **Per request:** Up to 15 MB JSON body possible; large product create/update can spike RSS.
- **In-memory cache (no Redis):** `memoryCache` Map + `memoryProductKeys` Set; unbounded key count; can grow with many distinct product list URLs.
- **Circuit breaker:** In-process Map (key → state); small.
- **Rate limit (in-memory):** Store keeps counters per key; grows with distinct IPs/users.
- **No streaming:** Large responses (e.g. product list) built in memory then sent.
- **Risk:** Many concurrent 15 MB posts or a long-lived process with no Redis and many cache keys can increase heap; no explicit limits or eviction in code.

---

## 8. Node Event Loop Blocking

- **Sync work:** No heavy CPU in request path. Minor sync: `escapeForLike`, `applyDiscount`, JWT decode, validation. No `readFileSync` or large `JSON.parse` of user input in hot path; cache middleware parses cached JSON (size bounded by stored response).
- **Logging:** Logger is sync (e.g. `JSON.stringify(meta)`); under very high request rate could add latency; not a primary blocker.
- **Event loop:** DB and HTTP (Supabase, Redis, Cybersource, LogesTechs) are async; event loop is not blocked by long-running sync code. Timeouts (15 s request, 8 s shipment/address, 15 s Cybersource) prevent hung requests from occupying resources indefinitely.

---

## 9. Payment Gateway Stability

- **Cybersource REST (POST /api/payments/cybersource/rest/process):**  
  - **Timeout:** 15 s (`CYBERSOURCE_REQUEST_TIMEOUT_MS`); on timeout returns 503.  
  - **No circuit breaker** in app: every request hits Cybersource; repeated failures do not open a circuit.  
  - Flow: authorize → capture → update order; any failure returns error to client; no retry in code.
- **Shipment (LogesTechs):** Wrapped in `withCircuitBreaker('shipment', …, 8s)`; after 3 failures circuit opens ~30 s; avoids hammering a down API.
- **Address (cities/villages):** Same: `withCircuitBreaker('address', …, 8s)`.
- **Risk:** If Cybersource is slow or down, many concurrent checkouts will hold connections up to 15 s each and may hit rate limits or timeouts; no circuit breaker to fail fast.

---

## Output Summary

### 1. Maximum merchants supported
- **~1,000–2,000 merchants** with current design (product list by merchant indexed; 10K products/merchant paginated).
- Constraint: not merchant count per se but **total products**, **product create rate** (50/15 min per merchant), and **Supabase/Redis capacity**. With 1K merchants × 10K products = 10M products, catalog is supported with current indexes and pagination; merchant dashboard list is indexed and capped.

### 2. Maximum products supported
- **~10 million products** with current indexes (composite catalog, FTS, merchant_id, etc.) and **pagination + 1000-row cap** and cursor where used.
- Constraint: **search** (FTS or ILIKE) and **category filter** under load; **Supabase plan** (connections, CPU, I/O); **cache hit rate** for product list (60 s TTL).

### 3. Maximum concurrent users
- **~50–150 concurrent users** (browsing + cart + checkout) on a **single Node instance** with current timeouts and rate limits.
- Limits: general 200/15 min, products 120/min, cart 60/min, orders 30/min; 15 s request timeout; DB and external APIs (Cybersource, LogesTechs) become bottlenecks. With **Redis** and **multiple instances** behind a load balancer, concurrent users scale with instance count and Supabase/Redis capacity (e.g. 2–3× per added instance if DB is not the bottleneck).

### 4. Bottlenecks
1. **Single process:** No clustering; one instance handles all requests.
2. **Supabase connection/concurrency:** Plan limit and multiple round-trips per product list (products + users + merchant_profiles).
3. **Cybersource in request path:** No circuit breaker; slow/down gateway holds connections up to 15 s.
4. **Large JSON body (15 MB):** Few concurrent large uploads can increase memory.
5. **In-memory cache/rate limit without Redis:** Unbounded growth and per-instance limits when Redis is down or not set.
6. **Product list latency:** Multiple DB round-trips; cache reduces this for repeated queries.

### 5. Crash risks
1. **uncaughtException / unhandledRejection:** Both trigger exit(1); any unhandled async rejection or thrown sync error can bring down the process.
2. **Memory:** High traffic with 15 MB bodies or large in-memory cache without Redis can push RSS up; OOM possible in extreme cases.
3. **Supabase/PostgREST 5xx:** If DB is unavailable, many routes fail; no fallback; errors returned to client (no crash unless unhandled).
4. **Redis reconnect:** ioredis retries 3 times then gives up; getRedis() still returns the client; subsequent calls can keep failing; no crash but cache/rate-limit may be ineffective.

### 6. Scaling recommendations
1. **Horizontal scaling:** Run 2+ Node instances behind a load balancer; use **Redis** for cache and rate-limit store so limits and cache are shared.
2. **Supabase:** Use a plan that matches expected concurrent connections and requests; consider connection pooling (e.g. PgBouncer) if Supabase exposes it; monitor usage.
3. **Payment:** Add a **circuit breaker** around Cybersource (or queue checkout to a worker) so repeated failures don’t hold connections; consider moving payment to a background job and returning “processing” to the client.
4. **Product list:** Reduce round-trips (e.g. single query with join or view for merchant name, or materialized data) to cut latency and DB load.
5. **Memory:** Cap in-memory cache size or TTL when Redis is not used; consider rejecting or limiting body size for very large payloads (e.g. 15 MB only for specific routes).
6. **Monitoring:** Use `api_timing` and `slow_query` logs for SLOs and alerting; track Supabase and Redis errors; add metrics for circuit breaker state and payment timeouts.
7. **Frontend:** Ensure Supabase/large deps are lazy-loaded where possible; fix dynamic/static import of cloudinaryService to avoid redundant chunks.

---

*This audit is based on the codebase and configuration as of the audit date. Actual capacity depends on Supabase plan, Redis, and hosting (e.g. Render) limits.*
