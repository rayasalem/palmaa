# Palma Marketplace — Production System Analysis Report

**Scope:** Current production system. **No code changes** were made; analysis and recommendations only.  
**Date:** 2025

---

## 1. Security Assessment

### 1.1 Authentication

| Aspect                 | Finding       | Notes                                                                                                                                  |
| ---------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **JWT handling**       | **Strong**    | Tokens issued/verified server-side via `jwtService.js`; production requires `JWT_SECRET` (min 32 chars) and rejects dev fallback.      |
| **Token storage**      | **Strong**    | httpOnly cookie (`palma_token`) for same-origin; Bearer from sessionStorage only when cross-origin. JWT is not stored in localStorage. |
| **Cookie options**     | **Adequate**  | `secure` in production, `sameSite: 'none'` for cross-origin; `maxAge` 7 days.                                                          |
| **Session management** | **Stateless** | No server-side session store; no “logout from all devices” or token revocation list. Compromised token valid until expiry.             |

### 1.2 Authorization

| Aspect               | Finding        | Notes                                                                                                                                                                                 |
| -------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------- |
| **RBAC**             | **Clear**      | `authenticate`, `optionalAuth`, `requireRole('ADMIN'                                                                                                                                  | 'MERCHANT' | …)` applied consistently on routes. |
| **Protected routes** | **Correct**    | `/api/cart`, `/api/admin/*`, `/api/orders` (mutations), `/api/products` (create/update/delete), shipment, broker, notifications require auth and appropriate role.                    |
| **Public routes**    | **Explicit**   | `GET /api/products`, `GET /api/products/merchant/:id`, `GET /api/products/:id`, likes-count, comments are public; list endpoints support optional pagination.                         |
| **Order access**     | **Controlled** | `GET /api/orders/:id` uses `optionalAuth`; access limited to owner (customer/merchant), ADMIN, or valid `X-Order-Guest-Token` (UUID v4). `guest_access_token` stripped from response. |

### 1.3 Potential Vulnerabilities Under High Load

| Risk                                        | Severity  | Notes                                                                                                                                                                            |
| ------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No per-route rate limits on public APIs** | Medium    | `generalLimiter()` (200 req/15 min per IP) applies globally. `/api/products`, `/api/products/merchant/:id` have no stricter limit; catalog/listing could be scraped or DDoSed.   |
| **Auth brute-force**                        | Mitigated | `authLimiter()` (200/15 min default) on auth routes; configurable via `AUTH_RATE_LIMIT_MAX`.                                                                                     |
| **JWT theft / replay**                      | Medium    | No binding to IP or fingerprint; no revocation. Under high traffic, stolen cookie/token usable until expiry.                                                                     |
| **Sensitive data in responses**             | Low       | Logs avoid PII; `guest_access_token` not returned; service key only in server env.                                                                                               |
| **Input validation**                        | Gap       | No centralized Zod/Joi on most endpoints. Validation is ad hoc (e.g. UUID regex, `parseInt`). Invalid body/query can reach controllers and may cause 500 or unexpected behavior. |

### 1.4 Rate Limits (Current)

| Middleware         | Scope          | Default           | Config                |
| ------------------ | -------------- | ----------------- | --------------------- |
| `generalLimiter()` | All requests   | 200 / 15 min / IP | `RATE_LIMIT_MAX`      |
| `authLimiter()`    | Auth routes    | 200 / 15 min / IP | `AUTH_RATE_LIMIT_MAX` |
| `paymentLimiter()` | Payment routes | 20 / 1 min        | Fixed                 |
| `commentLimiter()` | Post comment   | 10 / 1 min        | Fixed                 |

**Gap:** Product list, health, and other public GETs share only the global limit; no per-endpoint tuning.

### 1.5 Input Validation and Sensitive Data

- **Validation:** Ad hoc (pagination via `parsePagination`, UUID checks in order controller). No schema-based validation (Zod/Joi) on request body/query for most APIs.
- **Sensitive data:** Env validation ensures `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`; production fails fast if missing. Supabase client is server-only; frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## 2. Scalability Assessment

### 2.1 Can the System Handle 10,000 Products per Merchant?

| Layer        | Assessment                 | Notes                                                                                                                                                                                                                                      |
| ------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Database** | **Yes, with caveats**      | Indexes on `products(merchant_id)`, `(is_active, status)`. List by merchant uses `parsePagination` (default 500, max 1000). 10k products per merchant is manageable with pagination and indexes.                                           |
| **API**      | **Yes**                    | `GET /api/products/merchant/:id` is paginated; response size bounded.                                                                                                                                                                      |
| **Frontend** | **Risky if not paginated** | If catalog or merchant page fetches all products and filters client-side, 10k items will hurt performance. Public catalog currently uses `productService.getAll()` then client-side filter — this will not scale to 10k products globally. |

**Verdict:** Backend can support 10k products per merchant with pagination. Frontend catalog and any “all products” flow need server-side filtering/pagination to scale.

### 2.2 Can the System Support 10,000 Active Users Simultaneously?

| Layer        | Assessment         | Notes                                                                                                                                                                         |
| ------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**  | **Single process** | One Node process; no horizontal scaling in code. With 15s request timeout and global rate limit, a single instance will hit CPU/connection limits under 10k concurrent users. |
| **Database** | **Adequate**       | Supabase (Postgres); connection pool and indexes. Cart, orders, notifications are per-user and paginated.                                                                     |
| **Caching**  | **Optional Redis** | Cache middleware supports Redis via `REDIS_URL`; product cache and invalidation documented. Without Redis, each instance has its own in-memory cache.                         |
| **Sessions** | **Stateless**      | No server-side session store; JWT only. Scaling to multiple instances does not require session replication.                                                                   |

**Verdict:** Architecture is stateless and DB-ready, but **single-instance** backend will not handle 10k simultaneous users. Need horizontal scaling (multiple instances + load balancer) and, ideally, Redis for shared cache and possibly rate-limit store.

### 2.3 Bottlenecks and Resource Constraints

- **CPU/Memory:** One Node process; JSON parsing (e.g. 15mb body limit), logging, and middleware add overhead under high RPS.
- **Database:** Connection pool size and long-running queries (e.g. admin list without pagination) can block. Pagination and indexes mitigate.
- **Network:** Large responses (e.g. big product list in one response) and missing compression on some paths could increase latency and bandwidth.
- **Rate limiting:** Global limit is per-IP; under many users behind few IPs (NAT, corporate) legitimate traffic could be throttled.

---

## 3. Performance Assessment

### 3.1 API and DB Efficiency

| Area               | Finding       | Notes                                                                                                                                                           |
| ------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pagination**     | **Good**      | Shared `parsePagination`; list endpoints use `limit`/`offset` and cap (e.g. 500 default, 1000 max). Admin list can use 0 default for “no limit” where intended. |
| **N+1 / batching** | **Addressed** | Cart service batches product fetch; product/admin services use batch merchant lookups where applicable.                                                         |
| **Indexes**        | **Present**   | Migrations add indexes on users, products, orders, order_items, carts, notifications. Safe, concurrent creation.                                                |
| **Caching**        | **Present**   | Product routes use cache middleware (TTL 600s); Redis used if `REDIS_URL` set; invalidation on product create/update/delete.                                    |

### 3.2 Frontend Efficiency

- **Lazy loading:** Customer and Merchant views use lazy-loaded tab components (e.g. CustomerShopTab, MerchantDashboardTab) with Suspense.
- **Product fetch:** Frontend product service has TTL cache (60s) for `getAll` and per-merchant list to avoid duplicate calls.
- **Catalog:** Public catalog still loads all products then filters locally — main performance risk as product count grows.

### 3.3 Possible Performance Issues Under Heavy Load

- **Request timeout:** 15s global timeout (configurable) prevents runaway requests but may not be tuned per endpoint.
- **Large payloads:** `express.json({ limit: '15mb' })` allows big bodies; abuse could consume memory.
- **Logging/metrics:** Every request logs and updates in-memory metrics; under very high RPS this could add CPU and memory pressure.
- **No CDN mentioned:** Static assets and, if any, public API responses are not explicitly offloaded to a CDN.

---

## 4. Maintainability and Code Extensibility

### 4.1 Backend Structure

| Aspect             | Finding      | Notes                                                                                                                                             |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layering**       | **Clear**    | Routes → controllers → services → Supabase/DB. Auth and RBAC in middlewares.                                                                      |
| **Modularity**     | **Good**     | Auth, payment (Cybersource, Arabic Bank), health, metrics in separate modules. Shared utils (pagination, logger).                                 |
| **Technical debt** | **Moderate** | Some services (e.g. adminService) are large and could be split (users, orders, products, platform). No shared request validation layer (Zod/Joi). |

### 4.2 Frontend Structure

| Aspect        | Finding        | Notes                                                                                                                                 |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Views**     | **Split**      | CustomerView and MerchantView use lazy tab components; PublicCatalog, PublicProductDetails, AdminView, etc. are separate.             |
| **AdminView** | **Monolithic** | Single large component; tabs (users, products, orders, treasury, platform) not extracted to lazy components like Merchant/Customer.   |
| **Reuse**     | **Good**       | Shared components (e.g. CustomerShared, ConfirmModal, ProductConditionBadge); services (productService, cartApi, authService) reused. |
| **State**     | **Mixed**      | marketStore used as facade in places; newer code uses hooks (useCart) and services directly.                                          |

### 4.3 Safe to Scale and Extend?

- **Scale:** Safe to scale **with** operational changes: multiple backend instances, load balancer, Redis for cache/rate-limit, and ensuring no single endpoint returns unbounded data. Current code does not assume single process.
- **Extend:** Safe to extend; structure supports new routes, controllers, and services. Adding new features is straightforward. Main risks: large AdminView and lack of centralized validation, which can be improved incrementally without breaking production.

---

## 5. Recommendations

### 5.1 Short-Term (Weeks)

| Priority | Action                            | Rationale                                                                                                                                                                             |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Per-route rate limits**         | Add stricter limits for public catalog/listing endpoints (e.g. `/api/products`, `/api/products/merchant/:id`) to reduce abuse and scraping without affecting normal users.            |
| 2        | **Centralized input validation**  | Introduce Zod or Joi schemas and a small validation middleware for critical payloads (auth, cart, order create, product create/update) to fail fast with 400 and consistent messages. |
| 3        | **Split AdminView**               | Extract admin tabs into lazy-loaded components (e.g. AdminUsersTab, AdminOrdersTab) to improve maintainability and bundle behavior; no API or behavior change.                        |
| 4        | **Catalog server-side filtering** | Add (or use existing) API support for filtering/sorting with pagination so the public catalog does not rely on loading all products and filtering on the client.                      |

### 5.2 Medium-Term (Months)

| Priority | Action                           | Rationale                                                                                                                                                      |
| -------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **MFA and session invalidation** | Optional MFA for high-privilege roles; “logout from all devices” via token version or revocation list to reduce impact of token theft.                         |
| 2        | **Horizontal scaling**           | Run multiple backend instances behind a load balancer; use Redis for product cache and, if needed, rate-limit store so limits are consistent across instances. |
| 3        | **Observability**                | Connect `/metrics` to Prometheus/Grafana; define SLOs (e.g. p95 latency, error rate) and alerts.                                                               |
| 4        | **Refine services**              | Split large services (e.g. adminService) by domain; keep routes and controllers thin.                                                                          |

### 5.3 Long-Term (Quarters)

| Priority | Action                       | Rationale                                                                                                               |
| -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1        | **API contract and clients** | Document API (OpenAPI); use contract for backend and frontend/mobile to avoid breaking changes and ease evolution.      |
| 2        | **Security hardening**       | Consider MFA mandatory for ADMIN (and optionally MERCHANT); review CORS and cookie policies for all deployment origins. |
| 3        | **Frontend consistency**     | Prefer direct service/hook usage over marketStore for new features; gradually migrate where it reduces coupling.        |

---

## 6. Summary Table

| Area                   | Status                                                      | Safe to scale?     | Safe to extend?                  |
| ---------------------- | ----------------------------------------------------------- | ------------------ | -------------------------------- |
| **Authentication**     | Strong (JWT, httpOnly, prod checks)                         | Yes                | Yes                              |
| **Authorization**      | Clear RBAC and route protection                             | Yes                | Yes                              |
| **Rate limiting**      | Global + auth/payment/comment; no per-route for public APIs | Yes, add per-route | Yes                              |
| **Input validation**   | Ad hoc; no schema layer                                     | Yes                | Yes, add validation              |
| **Secrets**            | Server-only; env validated                                  | Yes                | Yes                              |
| **DB / queries**       | Indexes, pagination, batching in place                      | Yes                | Yes                              |
| **Caching**            | Product cache; Redis optional                               | Yes                | Yes                              |
| **Backend structure**  | Layered; some large services                                | Yes                | Yes                              |
| **Frontend structure** | Lazy tabs for Customer/Merchant; AdminView monolithic       | Yes                | Yes                              |
| **Session management** | Stateless; no revocation                                    | Yes                | Improve with token version / MFA |

**Overall:** The production system is **safe to scale and extend** provided rate limits and validation are tightened, catalog moves to server-side filtering/pagination, and scaling is done via multiple instances and Redis where appropriate. No breaking changes are required for these improvements; they can be introduced incrementally.
