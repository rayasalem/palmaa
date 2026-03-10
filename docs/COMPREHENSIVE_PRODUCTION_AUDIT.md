# Comprehensive Production Audit — Palma Marketplace

**Audit type:** Read-only production assessment  
**Scope:** Security, Performance, Scalability, Maintainability, Observability, Stress & Safe Testing  
**Constraints:** No modification of live data or users; no breaking changes to production.

---

## Executive Summary

| Area                | Score (1–10) | Summary                                                                                                                                                    |
| ------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**        | **7.5**      | Strong JWT/cookie/token_version, RBAC, MFA, rate limits, and validation; gaps: auth/comment limiters not Redis-backed, CORS `origin: true`, no CSRF token. |
| **Performance**     | **7.5**      | Compression, Redis cache, pagination, timeouts; catalog uses 2–3 queries (acceptable); payload limit 15MB.                                                 |
| **Scalability**     | **7.0**      | Stateless JWT, Redis for cache and most limiters, health/ready; auth and comment rate limiters are in-memory only — weak for multi-instance.               |
| **Maintainability** | **7.5**      | Admin split into scoped services, centralized Joi validation, OpenAPI doc; AdminView UI still monolithic.                                                  |
| **Observability**   | **8.0**      | Prometheus metrics (requests, latency histogram, errors, rate-limit hits, memory); SLO/alert docs exist; no distributed tracing.                           |

**Overall:** Production-ready with clear, actionable gaps. Priorities: (1) Redis for auth (and comment) rate limiters, (2) CORS hardening, (3) optional CSRF for state-changing endpoints, (4) stress/pen-test verification.

---

## 1. Security Review

### 1.1 JWT, Cookies, Token Storage

| Item                       | Status | Evidence / Risk                                                                                                      |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| JWT secret                 | ✅     | Required in production; length ≥32; no fallback in prod (`config/env.js`, `jwtService.js`).                          |
| Token storage              | ✅     | httpOnly cookie (same-origin); cross-origin uses Bearer from sessionStorage (no localStorage write in current flow). |
| Cookie options             | ✅     | `httpOnly`, `secure` in prod, `sameSite: 'none'` for cross-origin (Vercel↔Render); path `/`, 7d maxAge.              |
| Token version (logout-all) | ✅     | `ver` in JWT checked against DB `token_version` in `authMiddleware`; revocation works.                               |
| Token expiry               | ✅     | Configurable `JWT_EXPIRES_IN` (default 7d). No role-based expiry (e.g. shorter for ADMIN).                           |

**Risks:**

- SameSite=none allows cookie on cross-site requests → CSRF risk if CORS is bypassed or misconfigured.
- No CSRF token or double-submit cookie for state-changing requests.

**Recommendations:**

- Add CSRF token (or custom header) for POST/PATCH/DELETE when using SameSite=none; or restrict SameSite when frontend and API are same-origin.
- Consider shorter JWT expiry for ADMIN (e.g. 1d) via role in payload.

---

### 1.2 RBAC & MFA

| Item                   | Status | Evidence / Risk                                                                                                         |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| RBAC                   | ✅     | `requireRole(...)` on admin, merchant, broker, cart routes; 403 on role mismatch.                                       |
| MFA                    | ✅     | Optional; login returns `requiresMfa` + `mfaChallengeToken` when `mfa_enabled`; verify via POST `/api/auth/mfa/verify`. |
| MFA for high-privilege | ⚠️     | Not enforced for ADMIN/MERCHANT; plan exists in `LONG_TERM_SECURITY_IMPROVEMENT_PLAN.md`.                               |

**Recommendations:**

- Roll out mandatory MFA for ADMIN/MERCHANT per the long-term plan (grace period → enforce).
- Ensure MFA verify endpoint is always behind auth rate limiter (it is: `authLimiter()` on router).

---

### 1.3 Rate Limits

| Route / area            | Limiter            | Window | Max       | Redis store |
| ----------------------- | ------------------ | ------ | --------- | ----------- |
| General                 | generalLimiter     | 15 min | 200 (env) | ✅          |
| Auth (login, MFA, etc.) | authLimiter        | 15 min | 200 (env) | ❌          |
| Payment                 | paymentLimiter     | 1 min  | 20        | ✅          |
| Cart                    | cartLimiter        | 15 min | 150 (env) | ✅          |
| Products list           | productListLimiter | 15 min | 100 (env) | ✅          |
| Products by id          | productByIdLimiter | 15 min | 300 (env) | ❌          |
| Comments                | commentLimiter     | 1 min  | 10        | ❌          |

**Risks:**

- **Auth and comment limiters are in-memory.** With multiple Node instances behind a load balancer, each instance has its own counter → brute-force and comment spam can be distributed across instances and exceed intended limits.
- **productByIdLimiter** is in-memory → catalog-by-id can be stressed per instance.

**Recommendations:**

1. Add `...getStore()` to `authLimiter`, `commentLimiter`, and `productByIdLimiter` in `server/middlewares/security.js` so all limiters use Redis when `REDIS_URL` is set.
2. Optionally tighten auth limit (e.g. 50/15 min) and add a stricter MFA-verify sub-limiter (e.g. 10/min per IP).

---

### 1.4 Input Validation

| Area                                                       | Validation | Schema                         |
| ---------------------------------------------------------- | ---------- | ------------------------------ |
| Auth (login, register, verify-email, forgot/reset, resend) | ✅         | Joi in `auth` schemas          |
| Cart (add, update quantity)                                | ✅         | `cart` schemas                 |
| Orders (create)                                            | ✅         | `orders.create`                |
| Products (list query, create, update)                      | ✅         | `products`, `catalogListQuery` |
| Product comment (add)                                      | ✅         | `productComment.add`           |
| MFA (verify-setup, verify)                                 | ✅         | `mfa` schemas                  |
| Admin (users, orders, products, settings)                  | ✅         | `admin` schemas                |

Validation uses centralized `validate(schema, 'body'|'query', source)` and `recordValidationFailure(source)` for metrics. No routes found that bypass validation for the same action.

**Recommendation:** Add query validation for GET `/api/orders` (e.g. limit/offset) if not already constrained by parsePagination.

---

### 1.5 Sensitive Keys & Logging

| Item             | Status |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Secrets in env   | ✅     | JWT, Supabase, Redis from env; no hardcoded secrets.                                                     |
| Logger redaction | ✅     | `sanitizeForLog()` redacts password, token, secret, authorization, cookie, otp, code, card, apikey, etc. |
| Rate-limit logs  | ✅     | 429 logged with `requestId`, `route`, `ipMasked` (maskIp).                                               |
| Error handler    | ✅     | No stack in production response; stack in logs.                                                          |

**Risk:** `/auth/check-key` exposes key type (service_role/anon) — ensure this route is not reachable in production or is behind IP allowlist.

**Recommendation:** In production, disable or protect `/auth/check-key` (e.g. remove or restrict to internal health checks).

---

### 1.6 CORS & Cookies (Deployment Origins)

| Item              | Status | Risk                                                                                                                                             |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Allowed origins   | ✅     | List in `corsMiddleware.js` + `FRONTEND_URL`; response sets single origin or first in list.                                                      |
| credentials: true | ✅     | Used for cookie; required for cross-origin.                                                                                                      |
| Second CORS layer | ⚠️     | `app.use(cors({ origin: true, credentials: true }))` in `server.js` — `origin: true` reflects any request origin and can weaken the strict list. |

**Recommendation:** Remove `cors({ origin: true, credentials: true })` and rely only on `corsMiddleware(getEnv('FRONTEND_URL'))` so only explicitly allowed origins receive credentials. Document each deployment origin in `DEPLOYMENT_ORIGINS.md`.

---

## 2. Performance Assessment

### 2.1 API Latency & Middleware Chain

- **Request path:** requestId → healthRoutes (no limiter) → generalLimiter → requestLogger → metricsMiddleware → requestTimeout (15s default) → sanitizeErrorResponse → routes.
- **Compression:** Enabled (compression middleware).
- **Metrics:** Every request recorded with duration; histogram buckets support p50/p95/p99 in Prometheus.

**Bottlenecks:**

- DB round-trips dominate; no evidence of slow synchronous work in middleware.
- Request timeout (15s) prevents hung requests from holding resources.

---

### 2.2 DB Queries & N+1

| Endpoint / flow             | Queries                                                                                  | N+1 risk                                           |
| --------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| GET /api/products (catalog) | Products (1) + suspended users (1) + merchant names (users + merchant_profiles, batched) | ✅ No N+1; merchant IDs batched.                   |
| GET /api/products/:id       | Product (1) + merchant names for 1 id                                                    | ✅ No N+1.                                         |
| GET /api/orders (customer)  | Orders with order_items (1, Supabase embed)                                              | ✅ No N+1.                                         |
| Admin list orders           | Orders with order_items (1)                                                              | ✅ No N+1.                                         |
| orderService.createOrder    | Insert order + insert order_items; getProductById for first item (merchant_id)           | ✅ Acceptable; single extra query for merchant_id. |

**Recommendation:** Ensure DB indexes exist on: `products(merchant_id, status, category, created_at)`, `orders(customer_id, created_at)`, `orders(merchant_id)`, `order_items(order_id)`. Add index on `users(status)` for suspended check if needed.

---

### 2.3 Caching

- **Catalog:** GET /api/products uses `cacheMiddleware(600)`; when Redis is configured, response is cached by full URL (path+query); invalidation via `invalidateProductsCache()` on product create/update/delete.
- **No cache without Redis:** If `REDIS_URL` is not set, cache middleware skips caching (no in-memory fallback for products).

**Recommendation:** For single-instance staging, consider short TTL in-memory cache when Redis is absent; in production, Redis is required for shared cache and rate-limit consistency.

---

### 2.4 Pagination & Payloads

- **Catalog:** `limit` 1–100 (default 24), `offset`; validated via `products.listQuery` (Joi).
- **Admin lists:** `parsePagination(opts, 0, 1000)`; admin schemas allow limit up to 1000.
- **Body size:** `express.json({ limit: '15mb' })` — acceptable for product images as URLs or moderate base64; monitor payload sizes if allowing large uploads.

**Recommendation:** Cap admin list limit (e.g. 100) for orders/products/users to avoid large responses; keep 1000 only for explicit export if needed.

---

### 2.5 Frontend Lazy Loading

- **App.tsx:** PublicWebsite, PublicCatalog, CustomerView, MerchantView, AdminView, ProfileView, PublicProductDetails loaded via `React.lazy` with Suspense.
- **CustomerView / MerchantView:** Tab-level lazy (CustomerShopTab, CustomerCartTab, CustomerOrdersTab; MerchantDashboardTab, MerchantProductsTab, MerchantOrdersTab).
- **AdminView:** Single lazy entry; tabs are not lazy-loaded (documented in `views/admin/README.md`).

**Recommendation:** Split AdminView into lazy tab components (Users, Orders, Products, Treasury, Platform) when refactoring; use AdminViewContext to avoid prop drilling.

---

## 3. Scalability Readiness

### 3.1 Target: >10k Concurrent Users, >10k Products per Merchant

| Concern            | Status | Notes                                                                                                                 |
| ------------------ | ------ | --------------------------------------------------------------------------------------------------------------------- |
| Stateless API      | ✅     | JWT only; no server-side session store.                                                                               |
| Horizontal scaling | ✅     | Multiple Node instances behind LB supported; health/ready and trust proxy in place.                                   |
| Shared rate limit  | ⚠️     | general, payment, cart, productList use Redis; auth, comment, productById do not.                                     |
| Shared cache       | ✅     | Product list cache in Redis when REDIS_URL set.                                                                       |
| DB connection pool | ⚠️     | Supabase client usage is standard; ensure Supabase connection pool limits and DB max_connections suit instance count. |
| Catalog at scale   | ✅     | Pagination and server-side filter/search (q, category); index recommendations above.                                  |

**Risks:**

- Auth rate limit per-instance allows 200×N attempts per 15 min across N instances.
- Without Redis, product list cache is per-instance (if added in-memory) or missing.

**Recommendations:**

1. Use Redis for all limiters (see 1.3).
2. Run load tests (e.g. k6 or artillery) for 500–1000 concurrent users on login and catalog to validate latency and 429 behavior.
3. For >10k products per merchant, ensure GET /api/products/merchant/:merchantId is paginated and indexed; current code uses parsePagination.

---

### 3.2 Redis & Load Balancer

- **Redis:** Used for cache and (where applied) rate-limit store; single client in `redisClient.js`; `rateLimitStore.js` and `cacheMiddleware` use it.
- **Load balancer:** Health on `/health`, readiness on `/ready` (DB check); both mounted before generalLimiter.
- **Trust proxy:** Set to 1 in production for correct client IP.

**Recommendation:** Add Redis to readiness check (optional): if REDIS_URL is set, ping Redis in `/ready` and set `checks.redis`; do not fail ready if Redis is optional.

---

## 4. Maintainability & Code Structure

### 4.1 Backend Services

- **Admin:** Split into adminUsersService, adminOrdersService, adminProductsService, adminPlatformService; adminService re-exports for backward compatibility.
- **Auth, order, product, cart, MFA:** Clear separation; product and order use shared pagination and Supabase.
- **Validation:** Single `validation/schemas.js` and `validate` middleware; consistent pattern.

**Recommendation:** Keep admin facade; ensure any new admin feature is added in the appropriate scoped service.

---

### 4.2 Frontend & Admin Panels

- **AdminView:** One large component; context and README describe future tab split.
- **Customer/Merchant:** Tab-based and lazy per tab.

**Recommendation:** Implement lazy-loaded admin tabs (Users, Orders, Products, Treasury, Platform) per README when scheduling allows.

---

### 4.3 Service Size & Validation

- No single service is excessively large; admin split keeps files focused.
- Validation coverage is broad; restoreUser and deleteProduct have no body validation (id in path only) — acceptable.

---

## 5. Observability

### 5.1 Metrics (Prometheus)

| Metric                                                | Type      | Labels / Notes                           |
| ----------------------------------------------------- | --------- | ---------------------------------------- |
| palma_http_requests_total                             | counter   | method, route, status                    |
| palma_http_errors_total                               | counter   | method, route, status                    |
| palma_http_request_duration_seconds                   | histogram | method, route, status; buckets 0.005–10s |
| palma_http_rate_limit_hits_total                      | counter   | route                                    |
| palma_http_validation_failures_total                  | counter   | source                                   |
| palma_http_mfa_failures_total                         | counter   | label                                    |
| palma_process_resident_memory_bytes                   | gauge     | RSS                                      |
| palma_process_heap_used_bytes / heap_total / external | gauge     | V8 heap                                  |

Route normalization replaces UUIDs/numeric ids with `:id` to keep cardinality low. p50/p95/p99 derivable from histogram in Prometheus.

---

### 5.2 Error Tracking & Latency

- **Errors:** Logged in errorHandler with requestId, userId, orderId, productId where available; no PII in response.
- **Latency:** Captured per request; histogram allows SLOs (e.g. p95 &lt; 2s).
- **SLO/Alert docs:** `SLO_AND_ALERTS.md` and `PRODUCTION_SCALING_AND_MONITORING.md` describe availability, latency, error rate, rate-limit hits, memory.

**Gap:** No distributed tracing (OpenTelemetry); optional for multi-service or deep debugging.

---

### 5.3 Rate-Limit Hits & CPU/RAM

- Rate-limit hits: `recordRateLimitHit(routeLabel)` and exposed in Prometheus.
- Process memory: RSS, heap used/total, external memory exposed.

**Recommendation:** Add optional CPU usage (e.g. process.cpuUsage()) if needed for capacity planning; document in SLO_AND_ALERTS.

---

## 6. Stress & Safe Testing (Verification Steps)

These are **read-only / safe** checks to run in staging or test environment.

### 6.1 Rate-Limit Bypass Simulation

| Step | Action                                                                                                    | Expected                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1    | Send 201+ requests to GET /api/products from same IP in 15 min.                                           | 201st returns 429; log has rate_limit_429 and requestId.                                          |
| 2    | Send 201+ requests to POST /api/auth/login (invalid body) from same IP in 15 min.                         | 429 after limit; auth limiter label.                                                              |
| 3    | With 2 instances (no Redis): send 200 requests to instance A and 200 to instance B (same logical client). | Currently both may succeed (auth not shared). After adding Redis store to auth: total 200 shared. |

**Verification:** Confirm Redis store is used when REDIS_URL is set (after applying recommendation).

---

### 6.2 Brute-Force Auth (Safe)

| Step | Action                                                                        | Expected                                                         |
| ---- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1    | Run script: POST /api/auth/login with wrong password, 100 times from same IP. | 429 after limit (e.g. 200); message "Too many auth attempts...". |
| 2    | Check logs: requestId and ipMasked present; no password or token in log.      | Sanitization and masking confirmed.                              |

---

### 6.3 Catalog Load Test (Safe)

| Step | Action                                                                        | Expected                                                          |
| ---- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1    | Use k6/artillery: 100 concurrent users, GET /api/products?limit=24 for 2 min. | No 5xx; p95 latency &lt; 2s (tune by env); 429 if limit exceeded. |
| 2    | Same with q= and category= to hit search/filter.                              | Same; verify indexes if slow.                                     |

---

## 7. Risks and Bottlenecks Summary

| Priority   | Risk / Bottleneck                                                             | Mitigation                                                             |
| ---------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **High**   | Auth (and comment) rate limiters not Redis-backed → weak under multi-instance | Add getStore() to authLimiter, commentLimiter, productByIdLimiter.     |
| **High**   | CORS `origin: true` can allow unintended origins with credentials             | Remove second cors() or restrict to same strict origin list.           |
| **Medium** | CSRF when SameSite=none and cross-origin                                      | Introduce CSRF token or custom header for state-changing requests.     |
| **Medium** | /auth/check-key exposes key type                                              | Disable or restrict in production.                                     |
| **Medium** | Admin list limit up to 1000                                                   | Cap to 100 (or 200) for GET lists; keep 1000 for explicit export only. |
| **Low**    | No mandatory MFA for ADMIN/MERCHANT                                           | Follow LONG_TERM_SECURITY_IMPROVEMENT_PLAN.md.                         |
| **Low**    | AdminView not split into lazy tabs                                            | Plan refactor per views/admin/README.md.                               |

---

## 8. Step-by-Step Roadmap (Safe Order)

### Phase A — No Behavior Change (Config & Code Quality)

1. **Document origins:** Fill `DEPLOYMENT_ORIGINS.md` with production and staging URLs and CORS/FRONTEND_URL.
2. **Harden CORS:** Remove `app.use(cors({ origin: true, credentials: true }))` in server.js; rely on corsMiddleware only.
3. **Protect /auth/check-key:** Remove in production or guard by IP/feature flag; do not expose key type publicly.

**Verification:** Deploy to staging; confirm frontend (allowed origin) still works; confirm 429 and validation behavior unchanged.

---

### Phase B — Rate Limit Consistency (Multi-Instance Safe)

4. **Redis for all limiters:** In `server/middlewares/security.js`, add `...getStore()` to `authLimiter`, `commentLimiter`, and `productByIdLimiter`.
5. **Optional:** Stricter auth sub-limit for POST login (e.g. 50/15 min) via dedicated limiter if desired.

**Verification:** With REDIS_URL set, run 250 login attempts from one IP across 2 instances; expect 429 after 200 total (or configured max). Check Prometheus for rate_limit_hits.

---

### Phase C — Security Hardening (Optional, Planned)

6. **CSRF:** Design CSRF token or custom header (e.g. X-Requested-With: XMLHttpRequest as supplement) for POST/PATCH/DELETE; apply when SameSite=none.
7. **MFA for high-privilege:** Implement grace period then enforcement for ADMIN/MERCHANT per LONG_TERM_SECURITY_IMPROVEMENT_PLAN.md.

**Verification:** Pen-test scenarios from PENTEST_SCENARIOS_CHECKLIST.md (CSRF, XSS, JWT theft) in staging.

---

### Phase D — Performance & Scale (As Needed)

8. **DB indexes:** Add/compute indexes for products (merchant_id, status, category, created_at), orders (customer_id, merchant_id, created_at), order_items(order_id).
9. **Admin list cap:** Reduce default max limit for admin GET users/orders/products to 100 in schemas and parsePagination.
10. **Readiness:** Optionally add Redis ping to /ready when REDIS_URL is set.

**Verification:** Load test catalog and admin list with 500+ concurrent users; confirm p95 and no errors.

---

### Phase E — Observability & Maintainability

11. **SLO dashboards:** Implement Grafana panels from SLO_AND_ALERTS.md (availability, p95 latency, error rate, rate-limit hits, memory).
12. **AdminView tabs:** Refactor AdminView into lazy-loaded tab components when scheduling allows.

**Verification:** Run stress tests; confirm alerts fire as expected and dashboards reflect traffic.

---

## 9. Incremental Rollout Plan for Production

| Step | Change                                                | Rollout                                                     | Rollback                                    |
| ---- | ----------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| 1    | CORS: remove `cors({ origin: true })`                 | Deploy; test from production frontend origin only           | Revert commit; redeploy                     |
| 2    | Disable /auth/check-key in prod                       | Feature flag or env (e.g. NODE_ENV=production skip route)   | Re-enable route                             |
| 3    | Add getStore() to auth, comment, productById limiters | Deploy with REDIS_URL already set                           | Revert; limiters fall back to in-memory     |
| 4    | Admin list limit cap 100                              | Deploy; frontend already paginates                          | Revert schema/default                       |
| 5    | CSRF (if implemented)                                 | Feature flag; enable for one origin first                   | Disable flag                                |
| 6    | MFA enforcement for ADMIN/MERCHANT                    | Grace period (warn only) first; then enforce after deadline | Extend grace period or revert enforce logic |

**General:** One change per deployment window; run staging tests and health/ready checks after each deploy; keep feature flags for sensitive changes (CORS, CSRF, MFA enforce).

---

## 10. Document References

- **Security long-term:** `docs/LONG_TERM_SECURITY_IMPROVEMENT_PLAN.md`
- **Deployment origins:** `docs/DEPLOYMENT_ORIGINS.md`
- **Pen-test checklist:** `docs/PENTEST_SCENARIOS_CHECKLIST.md`
- **Scaling & monitoring:** `docs/PRODUCTION_SCALING_AND_MONITORING.md`
- **SLOs & alerts:** `docs/SLO_AND_ALERTS.md`
- **Admin refactor:** `views/admin/README.md`
- **OpenAPI:** `docs/openapi.yaml`

---

_End of Comprehensive Production Audit._
