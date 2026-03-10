# Principal Engineering Audit — Architecture, Security, Scalability & Reliability

**Role:** Principal Software Architect & Production Security Auditor  
**Constraint:** Live production system — **no breaking changes**; identify risks that could appear as the system scales.  
**Date:** 2025

---

## 1. ARCHITECTURE REVIEW

### 1.1 Service Boundaries

| Layer           | Responsibility                                                                               | Assessment                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Routes**      | HTTP method + path; mount auth/rate-limit per route                                          | Clear. Admin, order, product, cart, auth, payment, shipment, notification, chat, broker, merchant, health. |
| **Controllers** | Parse request, validate input, call service, set status/response                             | Thin; consistent try/catch and JSON response shape.                                                        |
| **Services**    | Business logic; single Supabase client; no HTTP                                              | Well separated. Cart, order, product, admin, notification, auth, JWT, payment, shipment, etc.              |
| **Middleware**  | CORS, helmet, rate limit, requestId, requestLogger, sanitizeErrorResponse, auth, requireRole | Order is correct; auth and RBAC applied at route level.                                                    |

**Verdict:** Service boundaries are clear. No business logic in middleware; controllers do not bypass services.

### 1.2 Module Separation

- **Backend:** `server/` — config, middlewares, routes, controllers, services, utils, modules (e.g. payments). No circular dependency observed; services import config/supabase only.
- **Frontend:** Views, components, services, api client, store facade. Some very large view files (CustomerView, MerchantView, AdminView) mix many concerns in one module; refactor would be structural only (no behavior change).
- **Shared:** Types and constants (e.g. product categories) live in frontend; backend owns DB schema. Acceptable for current scope.

### 1.3 API Layer Design

- **Style:** REST; JSON in/out; success/error shape consistent (`{ success, ... }` or `{ success: false, error }`).
- **Auth:** JWT via cookie (`palma_token`) or `Authorization: Bearer`; `authenticate` and `requireRole('ADMIN'|'MERCHANT'|...)` on protected routes.
- **Public endpoints:** GET products (list, by id, by merchant), GET product comments/likes count, GET order by id (see Security), health/ready.
- **Idempotency:** Not enforced; POST create endpoints are non-idempotent. Acceptable for current use; document if adding retries.

### 1.4 Database Access Patterns

- **Client:** Single Supabase client (service role) in `server/config/supabaseClient.js`. All DB access via services.
- **Patterns:** Single-row by id (`.single()` or `.limit(1)`); lists with `.order()`; cart items + products now batched (N+1 fixed). Admin list endpoints support optional `limit`/`offset`.
- **Unbounded lists still present:**
  - `productService.getActiveProducts()` — no limit.
  - `orderService.getOrdersByCustomerId()` / `getOrdersByMerchantId()` — no limit.
  - `notificationService.listByUserId()` — no limit.
  - `productService.getProductsByMerchantId()` — no limit.  
    These can return large result sets as data grows.

### 1.5 Caching Layer

- **Implementation:** In-memory NodeCache in `server/middlewares/cacheMiddleware.js`; applied to GET `/api/products` (product list) with TTL 600s.
- **Key:** `req.originalUrl` (path + query). Merchant-scoped paths (`/merchant/`) are excluded so merchants see fresh data.
- **Invalidation:** `invalidateProductsCache()` called after product create/update/delete (productController, adminController). Clears keys that do not contain `/merchant/`.
- **Multi-instance:** Each process has its own cache. Invalidation on one instance does not clear others — stale product list on other instances for up to TTL.

### 1.6 Deployment Structure

- **Containers:** Backend Dockerfile (Node 20 Alpine); frontend Dockerfile builds static assets. docker-compose defines frontend, backend, postgres, redis, nginx.
- **Production (typical):** Backend on Render/equivalent; frontend on Vercel/equivalent; DB on Supabase. Compose postgres/redis are for dev/parity; production may use Supabase + optional Redis.
- **Health:** Backend exposes `/health` (liveness) and `/ready` (DB + optional payment). Docker/Compose/K8s use `/ready` for readiness so traffic is only routed to fully ready backend instances; `/health` is used for liveness where two probes are supported (e.g. K8s).

### 1.7 Scaling Readiness

| Scale          | Architecture assessment                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **10k users**  | Viable. Optional admin pagination and cart N+1 fix already applied. Unbounded product/order/notification lists may start to show latency.                 |
| **100k users** | Gaps: unbounded list endpoints, single-instance cache, no DB indexes documented in code. Recommend: add limits/indexes, consider Redis for product cache. |
| **1M users**   | Requires: pagination (or hard limits) on all list endpoints, distributed cache, DB indexing and possibly read replicas, rate-limit and timeout tuning.    |

### 1.8 Structural Bottlenecks

1. **Single DB and single cache per process** — no horizontal cache coherence.
2. **Unbounded list queries** — product list (and order/notification lists) can grow response size and memory.
3. **No request/query timeouts** — long-running DB or external calls can hold connections.
4. **Heavy view components on frontend** — large re-render surface; optimization is optional and non-breaking.

---

## 2. DATABASE PERFORMANCE AUDIT

### 2.1 N+1 and Sequential Patterns

| Location                                                  | Pattern                                                                                | Status / Suggestion                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **cartService.getCartWithItems**                          | One query per cart item for product                                                    | **Fixed:** Single batch query by `product_ids`; map in memory.                              |
| **notificationService.notifyAdminComment**                | Loop: `create(admin.id, ...)` per admin                                                | N sequential inserts. Safe improvement: batch insert (single `insert(rows)`). Same outcome. |
| **notificationService.notifyBrokersSharedProductComment** | Loop: `create(brokerId, ...)` per broker                                               | Same as above; batch insert.                                                                |
| **productService.getActiveProducts**                      | 1 products query + 1 suspended users + getMerchantNamesMap (users + merchant_profiles) | Two extra round-trips for enrichment; acceptable. No N+1.                                   |
| **orderService.getOrderById**                             | Order + order_items in two queries                                                     | Normal; no N+1.                                                                             |

### 2.2 Missing Indexes (Safe to Add via Supabase SQL)

Recommended indexes to improve list and filter performance without changing API behavior:

| Table         | Suggested index                                       | Rationale                                         |
| ------------- | ----------------------------------------------------- | ------------------------------------------------- |
| users         | `(status)`, `(email)`                                 | Filter by status (e.g. PENDING); lookup by email. |
| products      | `(merchant_id)`, `(status)` or `(is_active, status)`  | List by merchant; filter active.                  |
| orders        | `(customer_id)`, `(merchant_id)`, `(created_at DESC)` | List by customer/merchant; sort by date.          |
| order_items   | `(order_id)`                                          | Join with orders.                                 |
| cart_items    | `(cart_id)`, `(cart_id, product_id)`                  | Cart lookup; upsert by cart+product.              |
| carts         | UNIQUE `(user_id)`                                    | getOrCreateCart.                                  |
| notifications | `(user_id)`, `(user_id, created_at DESC)`             | List by user; sort.                               |

### 2.3 Inefficient Joins and Large Scans

- **getActiveProducts:** Selects all active products (no limit), then filters by suspended merchants in memory. At scale, prefer filtering in DB (e.g. subquery or join) and adding a limit.
- **listByUserId (notifications):** No limit; full table scan for that user. Add optional `limit`/`offset` and index on `(user_id, created_at DESC)`.
- **getOrdersByCustomerId / getOrdersByMerchantId:** No limit; can return large sets. Add optional pagination (same pattern as admin lists).

### 2.4 Safe Optimizations (No API Contract Change)

1. **Add DB indexes** (above) via Supabase SQL.
2. **Batch notification inserts** in `notifyAdminComment` and `notifyBrokersSharedProductComment` (single `insert(rows)`).
3. **Optional limit on getActiveProducts** (e.g. default 500 or 1000) or add optional `?limit=`; document.
4. **Optional pagination for** `getOrdersByCustomerId`, `getOrdersByMerchantId`, `listByUserId`, `getProductsByMerchantId` (query params; default behavior unchanged when params absent).

---

## 3. LOAD & SCALABILITY ANALYSIS

### 3.1 Simulated Load

| Concurrent users | Expected behavior                                                                                                                                                                                                                                    | Bottlenecks                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **100**          | System should handle. Rate limit 200/15 min ≈ 0.22 req/s per IP; well above. Cart and admin lists already optimized or paginated.                                                                                                                    | None critical.                                           |
| **1000**         | General rate limit (200/15 min per IP) may start to block aggressive clients or shared IPs (e.g. NAT). Unbounded product/order/notification lists increase latency and memory. Single Node process can become CPU-bound on many concurrent requests. | Rate limit; list endpoint response size; single process. |
| **5000**         | Same as above, amplified. Unbounded lists risk timeouts and high memory. Without multiple instances or limits, one process may not sustain throughput.                                                                                               | List endpoints; memory; single instance; rate limit.     |

### 3.2 Slow Endpoints (Under Load)

- **GET /api/products** (cache miss): `getActiveProducts()` with no limit — can be slow and heavy with many products.
- **GET /api/admin/orders** (no pagination params): Returns full list; slow with large tables.
- **GET /api/admin/users** / **GET /api/admin/products** (no params): Same.
- **GET /api/orders** (customer): `getOrdersByCustomerId` — unbounded.
- **GET /api/orders/merchant** (merchant): `getOrdersByMerchantId` — unbounded.
- **GET /api/notifications**: `listByUserId` — unbounded.

Admin endpoints support `?limit=&offset=`; others do not.

### 3.3 Memory Pressure

- Large JSON responses (unbounded lists) increase heap usage and GC.
- NodeCache holds full response bodies for product list; one entry per distinct URL (e.g. query string). Acceptable if key space is small.
- No streaming for list endpoints; entire result set in memory.

### 3.4 API Throughput Limits

- **General:** 200 requests per 15 minutes per IP (configurable via `RATE_LIMIT_MAX`).
- **Auth:** 200 (or 50) per 15 min per IP.
- **Payment:** 20/min.
- **Comment:** 10/min.

At high concurrency, per-IP limits may reject legitimate traffic (e.g. corporate NAT). Consider per-user or higher limits with monitoring.

---

## 4. SECURITY AUDIT

### 4.1 Authentication Flow

- **Login:** Credentials to auth route; server validates, issues JWT via `jwtService.sign()`, sets httpOnly cookie (when applicable) and returns token.
- **Subsequent requests:** `authMiddleware` reads token from cookie or `Authorization: Bearer`; `verify()` validates signature and expiry.
- **Token storage (frontend):** `api/client.ts` stores JWT in both localStorage and sessionStorage for cross-origin and mobile. If the frontend is compromised (XSS), token can be stolen. httpOnly cookie is used when the server sets it; Bearer is for contexts where cookie is not sent.

### 4.2 Authorization Rules

- **requireRole('ADMIN'):** Admin routes (users, orders, products, settings, platform earnings).
- **requireRole('MERCHANT'):** Product create/update/delete; merchant order list; merchant profile.
- **authenticate only:** Cart, orders (list my orders, cancel, invoice), notifications, etc.
- **optionalAuth:** Order create (customer_id optional); product like “is liked” check.
- **Public:** GET products, GET product by id, GET order by id (see below), GET comments/likes count, health/ready.

### 4.3 Token Validation

- **jwtService:** Uses JWT_SECRET (required at startup in env); production throws if secret missing or &lt; 32 chars.
- **Expiry:** Configurable (`JWT_EXPIRES_IN`, default 7d).
- **Cookie:** httpOnly, secure in production, sameSite 'none' for cross-origin. No double-submit or CSRF token observed; reliance on SameSite and CORS.

### 4.4 API Exposure

- **GET /api/orders/:id** — **unauthenticated.** Any client can fetch any order by UUID. If IDs are predictable or leaked (e.g. in links), order details (recipient, address, amount, etc.) can be exposed. **Recommendation:** Require `optionalAuth` and restrict to owner (customer_id or merchant_id) or to a short-lived token for guest tracking; or document as intentional and ensure IDs are non-guessable (UUID v4).

### 4.5 Input Validation

- **Order create:** recipient_name, address, city, phone, amount, weight validated (required, amount/weight &gt; 0).
- **Product create/update:** Controller passes body to service; service maps to DB columns. No raw SQL; Supabase client parameterizes.
- **Admin:** Params (e.g. id, status) validated in controller.
- **Auth:** Login/register validated in auth layer.
- **General:** No explicit request size limit beyond express.json(15mb); body size limit is present.
- **Injection:** Supabase client uses parameterized queries; no concatenated SQL in reviewed code. Low injection risk for current patterns.

### 4.6 Rate Limiting

- Applied at app and route level (general, auth, payment, comment).
- Reduces brute-force and abuse; may need tuning for high-traffic or NAT scenarios.

### 4.7 Error Leakage

- **sanitizeErrorResponse** and **safeErrorForUser** strip technical messages (schema, PGRST, etc.) from JSON responses.
- **errorHandler** does not send stack in production.
- Logs may contain internal details; not sent to client. Good.

### 4.8 Privilege Escalation / Token Misuse

- Role stored in JWT and checked by `requireRole`. If JWT is forged or secret leaked, an attacker could assume roles. Secret is required and length-checked in production.
- No evidence of IDOR in reviewed controllers: admin actions use params; merchant product actions should validate ownership (recommend verifying productController update/delete enforce `merchant_id = req.auth.sub`).

### 4.9 Insecure Configuration

- **Env:** SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET required at startup.
- **JWT:** No fallback in production; 32-char minimum.
- **CORS:** Configured for frontend origin; not overly permissive in reviewed code.

---

## 5. CACHING STRATEGY REVIEW

### 5.1 Cache Usage

- **Scope:** GET `/api/products` only (and variants with query string). TTL 600s.
- **Excluded:** Paths containing `/merchant/` so merchants see up-to-date lists.
- **Storage:** In-memory (NodeCache). No distributed cache.

### 5.2 Cache Invalidation

- **Trigger:** Product create, update, delete (productController and adminController) call `invalidateProductsCache()`.
- **Scope:** Current process only. Keys not containing `/merchant/` are deleted.

### 5.3 Stale Data Risks

- **Single instance:** After a product is created/updated/deleted, next list request sees fresh data.
- **Multiple instances:** Write may happen on instance A; list request may hit instance B, which still has old data for up to 600s. Staleness is bounded by TTL.

### 5.4 Multi-Instance Consistency

- **Inconsistency:** Yes — invalidation is local.
- **Mitigation (non-breaking):** Introduce Redis (or similar) as shared cache; on product mutation delete the relevant key(s) in Redis; keep same API and response shape. Alternatively, shorten TTL when running multiple instances.

---

## 6. OBSERVABILITY & OPERATIONS

### 6.1 Logging Quality

- **Winston:** Level from env (e.g. info in prod, debug in dev); timestamp, level, message, meta; service name.
- **requestLogger:** Logs requestId, method, url, status, durationMs, ip on response finish.
- **errorHandler:** Logs requestId, message, status, url; stack only in non-production.
- **cacheMiddleware:** Debug logs for hit/store include requestId.
- **Gap:** Some services still use `console.error` (e.g. productService, orderService, notificationService). Prefer shared logger for consistency and level control.

### 6.2 Request Tracing

- **Request ID:** Set by middleware (header or generated); propagated in logs. Response header `x-request-id` returned. Adequate for correlating logs per request.

### 6.3 Monitoring Capability

- **Metrics:** No /metrics or Prometheus/OpenTelemetry in code. No request rate, latency percentiles, or error rate exposed.
- **Health:** /health (liveness), /ready (DB + optional payment). Sufficient for orchestrator probes.

### 6.4 Failure Visibility

- Uncaught errors and unhandled rejections log and exit process.
- Request failures logged with requestId.
- No centralized alerting or on-call integration in repo; to be added in operations.

### 6.5 Suggestions for Debugging Production Incidents

1. **Use requestId:** Support can ask for `x-request-id`; grep logs for that id.
2. **Standardize on logger:** Replace remaining `console.error` with logger in services.
3. **Add /metrics:** Simple counters/histograms for request count, status, duration; optional integration with Prometheus.
4. **Structured fields:** Ensure critical identifiers (userId, orderId, productId) are in log meta where relevant (without PII in plain text if needed for compliance).

---

## 7. DEPLOYMENT & INFRASTRUCTURE

### 7.1 Containerization

- **Backend:** Node 20 Alpine; npm ci/install --omit=dev; optional payment module build; CMD node server.js.
- **Frontend:** Build step in Dockerfile.frontend; static assets served (e.g. via nginx in compose).
- **Compose:** frontend, backend, postgres, redis, nginx; env and healthcheck for backend.

### 7.2 Environment Configuration

- **Required at startup:** SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET (validated in config/env.js). Process throws and exits if missing.
- **Optional:** FRONTEND_URL, PORT, JWT_EXPIRES_IN, RATE_LIMIT_MAX, etc.
- **No .env committed:** Secrets expected via env_file or orchestrator.

### 7.3 Secrets Handling

- **Server:** Secrets from environment; no hardcoded credentials in reviewed code.
- **Frontend:** API base URL and Supabase anon key (if used) from build-time env; no server secrets in client bundle.

### 7.4 Service Dependencies

- **Backend:** Depends on Supabase (DB + auth). Optional: payment module, Cybersource.
- **Startup:** validateEnv() runs first; if required vars missing, process exits. No DB migration in app startup; schema assumed applied.

### 7.5 Safe Repeated Deployment

- **Idempotent:** Same image and env produce same behavior.
- **Healthcheck:** Compose and Docker use /ready for the backend healthcheck; K8s uses liveness=/health and readiness=/ready. Traffic is only routed to instances that pass the readiness check.
- **Graceful shutdown:** SIGTERM/SIGINT close server and exit after timeout; in-flight requests may be cut; acceptable for current design.

---

## OUTPUT SUMMARY

### 1. Overall Architecture Score: **7.5 / 10**

- Clear boundaries and layering; optional admin pagination and cart N+1 fix in place.
- Deductions: unbounded list endpoints, single-instance cache, no request/query timeouts, some very large frontend modules.

### 2. Security Risk Score: **6.5 / 10**

- Strong: JWT validation, required secrets, role checks, error sanitization, rate limiting.
- Risks: GET /api/orders/:id unauthenticated (information disclosure); JWT in localStorage/sessionStorage (XSS token theft); no CSRF token (mitigated by SameSite/CORS).

### 3. Scalability Score: **6 / 10**

- Positive: Cart N+1 fixed; admin lists paginated; request ID and env validation.
- Gaps: Unbounded product/order/notification lists; no limits on public product list; single-process cache; no DB indexes documented in app; rate limit may be tight for high concurrency.

### 4. Top 10 Production Risks

| #   | Risk                                   | Impact                                                        | Mitigation (non-breaking)                                                           |
| --- | -------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | **GET /api/orders/:id without auth**   | Order data exposure if ID is known or guessable               | Add optionalAuth + restrict to owner or guest token; or document and ensure UUID v4 |
| 2   | **Unbounded getActiveProducts**        | Latency and memory at scale                                   | Optional ?limit= or default limit (e.g. 500); document                              |
| 3   | **Unbounded order/notification lists** | Slow responses and memory                                     | Optional pagination (limit/offset); keep default behavior when params absent        |
| 4   | **Multi-instance cache incoherence**   | Stale product list on other instances                         | Redis (or similar) + invalidate on write; or shorten TTL                            |
| 5   | **JWT in localStorage/sessionStorage** | Token theft if XSS                                            | Prefer httpOnly cookie where possible; keep Bearer for cross-origin/mobile          |
| 6   | **No response/query timeout**          | Hung connections under load                                   | Add response timeout middleware (e.g. 30s) and/or Supabase timeout; document        |
| 7   | **Sequential notification inserts**    | Slower notifyAdminComment / notifyBrokersSharedProductComment | Batch insert in notificationService; same API outcome                               |
| 8   | **Rate limit 200/15min per IP**        | Legit traffic blocked behind NAT at scale                     | Tune RATE_LIMIT_MAX or add per-user limit with auth                                 |
| 9   | **Readiness used in healthcheck**      | —                                                             | Resolved: /ready used for readiness; traffic only to ready instances                |
| 10  | **No DB indexes**                      | Slower list/filter as data grows                              | Add recommended indexes via Supabase SQL                                            |

### 5. Quick Wins (Safe Improvements)

- **/ready for readiness** is in place in Docker, Compose, K8s, and Render; traffic is only routed to ready instances.
- **Replace console.error with logger** in productService, orderService, notificationService, adminService (behavior unchanged).
- **Batch notification inserts** in notifyAdminComment and notifyBrokersSharedProductComment.
- **Add recommended DB indexes** in Supabase (no app change).
- **Optional pagination** for getOrdersByCustomerId, getOrdersByMerchantId, listByUserId, getProductsByMerchantId (query params; default unchanged).
- **Optional limit** for getActiveProducts (default or ?limit=; document).

### 6. Long-Term Architecture Improvements

- **Distributed cache:** Redis (or equivalent) for product list; invalidate on product mutations; same API.
- **Request/query timeouts:** Response timeout middleware; Supabase/client timeouts where supported.
- **Metrics:** /metrics or Prometheus/OpenTelemetry for rate, latency, errors.
- **Pagination and limits:** All list endpoints support optional limit/offset or default cap; document.
- **GET /api/orders/:id:** Require auth or token and restrict to owner/guest; or explicitly document public-by-design and ID policy.
- **Frontend:** Split large views into smaller components; “products loaded at” guard to reduce duplicate getAll(); lazy-load translations by locale.

### 7. What Will Break First as the System Scales

1. **Unbounded list endpoints** — Response time and memory for GET /api/products, GET /api/orders, GET /api/notifications, GET /api/orders/merchant as rows grow.
2. **Single process** — CPU and connection limit of one Node process under high concurrency.
3. **Rate limit** — 200/15 min per IP may block legitimate users behind same IP.
4. **Product list cache miss** — Full table scan and large payload when cache expires or is cold.
5. **DB connections and slow queries** — No connection pool tuning or query timeouts; one slow query can block.
6. **Stale product list** — With multiple instances, users may see outdated product list after changes.

---

**End of audit.** All recommendations are intended to be non-breaking and implementable gradually. No API contract or business behavior need change except where explicitly noted (e.g. securing GET /api/orders/:id or adding optional query parameters).
