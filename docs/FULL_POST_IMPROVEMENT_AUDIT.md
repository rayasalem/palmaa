# Palma Marketplace – Full Post-Improvement Audit Report

**Audit date:** 2025-02-23  
**Scope:** Code quality, API verification, performance & scalability, frontend, logging & observability, environment & configuration.  
**Method:** Static analysis and code review only; no production data or endpoints modified.

---

## Summary Table

| Module/Endpoint                             | Check Performed                                                          | Status   | Notes                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Code quality / clean architecture**    |                                                                          |          |                                                                                                                                                                            |
| Folder structure (server)                   | config, controllers, middlewares, routes, services, auth, utils, modules | **Pass** | Clear separation: routes → controllers → services; shared middlewares and config.                                                                                          |
| Folder structure (frontend)                 | views, components, services, hooks, api, store                           | **Pass** | views/ with customer/ subfolder for CustomerView tabs; services and api separated.                                                                                         |
| Duplication – pagination logic              | parsePagination / applyPagination in multiple services                   | **Warn** | orderService, productService, notificationService, adminService each define local pagination helpers; same pattern, could be shared util.                                  |
| Naming & modularity                         | Controllers vs services                                                  | **Pass** | Controllers handle HTTP; services handle DB/business logic. Naming consistent.                                                                                             |
| Separation of concerns                      | Routes → controller → service                                            | **Pass** | No business logic in routes; controllers thin.                                                                                                                             |
| Large components – CustomerView             | Refactored into tabs                                                     | **Pass** | CustomerShopTab, CustomerCartTab, CustomerOrdersTab in views/customer/; CustomerShared for shared UI.                                                                      |
| Large components – MerchantView             | Single file, no lazy tabs                                                | **Warn** | Single ~1100-line component; dashboard/products/orders tabs inline. Safe refactor: extract tabs + lazy load like CustomerView.                                             |
| Large components – AdminView                | Single file, no lazy tabs                                                | **Warn** | Single ~1000+ line component; UserRow/ProductRow memoized but tabs inline. Safe refactor: extract Admin\*Tab components + lazy load.                                       |
| **2. API verification**                     |                                                                          |          |                                                                                                                                                                            |
| GET /api/orders/:id                         | Response shape, optionalAuth, access control                             | **Pass** | Returns `{ success, order }`; guest_access_token stripped; optionalAuth; owner/admin/guest-token check.                                                                    |
| GET /api/orders (listMyOrders)              | limit/offset, response shape                                             | **Pass** | Optional limit/offset; response `{ success, orders }` unchanged.                                                                                                           |
| GET /api/products                           | limit/offset, response shape                                             | **Pass** | Optional limit/offset; response `{ success, products }` unchanged.                                                                                                         |
| GET /api/products/merchant/:id              | limit/offset, response shape                                             | **Pass** | Same pattern; `{ success, products }`.                                                                                                                                     |
| GET /api/admin/orders                       | limit/offset, default 500, response shape                                | **Pass** | Optional limit/offset; when provided default limit 500; response `{ success, orders }` unchanged.                                                                          |
| GET /api/admin/users                        | limit/offset, response shape                                             | **Pass** | `{ success, users }` unchanged.                                                                                                                                            |
| GET /api/admin/products                     | limit/offset, response shape                                             | **Pass** | `{ success, products }` unchanged.                                                                                                                                         |
| GET /api/notifications                      | limit/offset, response shape                                             | **Pass** | `{ success, notifications }` unchanged.                                                                                                                                    |
| Pagination behavior                         | No params vs with params                                                 | **Pass** | When no limit/offset: admin orders/users/products use {} (all or default per controller); products/orders/notifications use safe defaults in service. Backward compatible. |
| **3. Performance & scalability**            |                                                                          |          |                                                                                                                                                                            |
| cartService.getCartWithItems                | N+1 query check                                                          | **Pass** | Single batch query for products by id list; productMap; no per-item DB round trip.                                                                                         |
| orderService (backend)                      | N+1 in list flows                                                        | **Pass** | getOrdersByCustomerId / getOrdersByMerchantId use single query with range; no N+1.                                                                                         |
| productService (backend) getActiveProducts  | Batch merchant names                                                     | **Pass** | getMerchantNamesMap batch; attachMerchantNames; no N+1.                                                                                                                    |
| adminService.listProducts                   | Batch merchant lookup                                                    | **Pass** | Single products query + batch users for merchant names.                                                                                                                    |
| Cache – backend products                    | Redis + invalidateProductsCache                                          | **Pass** | cacheMiddleware(600) on product routes; Redis when REDIS_URL set; invalidateProductsCache() on create/update/delete.                                                       |
| Cache – frontend productService             | TTL 60s getAll / getByMerchantId                                         | **Pass** | lastGetAllAt/lastGetAllResult; getByMerchantCache Map; duplicate fetches avoided within TTL.                                                                               |
| Global request timeout                      | Middleware registered, 503 on timeout                                    | **Pass** | requestTimeoutMiddleware(15s) after metrics; clears on res finish/close; 503 + JSON body when timeout fires.                                                               |
| **4. Frontend verification**                |                                                                          |          |                                                                                                                                                                            |
| CustomerView tabs                           | Lazy-loaded                                                              | **Pass** | CustomerShopTab, CustomerCartTab, CustomerOrdersTab via React.lazy; Suspense with t.common.loading fallback.                                                               |
| MerchantView tabs                           | Lazy-loaded                                                              | **Fail** | No React.lazy; single component with inline dashboard/products/orders.                                                                                                     |
| AdminView tabs                              | Lazy-loaded                                                              | **Fail** | No React.lazy; single component with inline users/products/orders/treasury/platform.                                                                                       |
| Duplicate fetches – CustomerView            | productsFetchedRef guard                                                 | **Pass** | productsFetchedRef prevents duplicate getAll() on mount.                                                                                                                   |
| Duplicate fetches – frontend productService | TTL cache                                                                | **Pass** | 60s TTL reduces duplicate getAll/getByMerchantId calls.                                                                                                                    |
| UI behavior – CustomerView                  | Same props, state in parent                                              | **Pass** | Tab components receive same props/handlers; modals and ConfirmModal in parent; no change to flows.                                                                         |
| **5. Logging & observability**              |                                                                          |          |                                                                                                                                                                            |
| requestId                                   | Set per request, x-request-id header                                     | **Pass** | requestIdMiddleware sets req.id; res.setHeader('x-request-id', req.id).                                                                                                    |
| requestLogger                               | requestId, userId, orderId, productId in meta                            | **Pass** | getRouteIds(req); meta includes requestId, optional userId, orderId, productId (no PII).                                                                                   |
| errorHandler                                | requestId, userId, orderId, productId in meta                            | **Pass** | getRouteIds imported; meta extended with orderId/productId when applicable.                                                                                                |
| Error handling consistency                  | Controllers use logger.error                                             | **Pass** | orderController, productController, adminController, notificationController use logger.error('tag', { message }).                                                          |
| GET /health                                 | Liveness                                                                 | **Pass** | Returns `{ ok: true, timestamp }`; no DB.                                                                                                                                  |
| GET /ready                                  | Readiness + DB check                                                     | **Pass** | Checks Supabase users select limit 1; returns ready, checks; 503 if DB fail.                                                                                               |
| GET /metrics                                | Prometheus + Cache-Control                                               | **Pass** | text/plain; Cache-Control no-store; getPrometheusText() with requests_total, errors_total, duration histogram.                                                             |
| **6. Environment & configuration**          |                                                                          |          |                                                                                                                                                                            |
| validateEnv at startup                      | Required vars checked                                                    | **Pass** | validateEnv() called before app listen; required: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET.                                                                          |
| Fail-fast on missing env                    | Throw and exit                                                           | **Pass** | Throws Error with message; uncaughtException handler logs and process.exit(1).                                                                                             |

---

## 1. Code Quality / Clean Architecture

### Folder and module structure

- **Backend:** `server/` contains `config/`, `controllers/`, `middlewares/`, `routes/`, `services/`, `auth/`, `utils/`, `modules/` (e.g. payments/cybersource). Routes mount controllers; controllers call services. Clear layering.
- **Frontend:** Root has `views/`, `components/`, `services/`, `hooks/`, `api/`, `store/`. `views/customer/` holds CustomerView tab components and shared types/props flow from CustomerView.

### Duplication and complexity

- **Pagination:** Each of orderService, productService, notificationService, and adminService implements its own `parsePagination` or `applyPagination` (limit/offset, max cap). Logic is repeated; a shared `server/utils/pagination.js` could normalize defaults and caps.
- **No unnecessary complexity** observed in critical paths; optional pagination and timeout are additive.

### Naming and modularity

- Controllers and services are consistently named (e.g. orderController, orderService). Middlewares are single-purpose (requestId, requestLogger, metrics, requestTimeout, errorHandler).

### Large components suitable for refactor

- **CustomerView:** Already split into CustomerShopTab, CustomerCartTab, CustomerOrdersTab with lazy loading and CustomerShared; state and handlers stay in parent. **No further change required for audit.**
- **MerchantView:** One large file (~1100 lines) with dashboard, products, and orders tabs rendered inline. Recommendation: extract MerchantDashboardTab, MerchantProductsTab, MerchantOrdersTab and load with React.lazy + Suspense (same pattern as CustomerView) to improve initial load and consistency.
- **AdminView:** One large file (1000+ lines) with users, products, orders, treasury, platform tabs inline; UserRow and ProductRow already memoized. Recommendation: extract tab content into Admin\*Tab components and lazy load.

---

## 2. API Verification

### Response shapes (unchanged)

- **GET /api/orders/:id:** `{ success: true, order }` (order without guest_access_token). optionalAuth; access for owner, admin, or valid X-Order-Guest-Token.
- **GET /api/orders (listMyOrders), GET /api/orders/merchant:** `{ success, orders }`.
- **GET /api/products, GET /api/products/merchant/:id:** `{ success, products }`.
- **GET /api/admin/orders, users, products:** `{ success, orders }` / `{ success, users }` / `{ success, products }`.
- **GET /api/notifications:** `{ success, notifications }`.

### Optional pagination

- All listed list endpoints accept optional `limit` and `offset`. When not provided, behavior is backward compatible (admin getOrders uses `opts = {}` for “all” or applies defaults when params are present; other endpoints use service-level defaults). Response keys and types unchanged; only array length may change when pagination is used.

---

## 3. Performance & Scalability

### N+1

- **cartService.getCartWithItems:** Collects product_ids from items, one `.in('id', productIds)` query, builds productMap, maps items in memory. **No N+1.**
- **orderService:** List methods use single Supabase query with `.range()`. **No N+1.**
- **productService (backend):** getActiveProducts / getProductsByMerchantId use one query plus batch getMerchantNamesMap. **No N+1.**
- **adminService.listProducts:** One products query, batch merchant names. **No N+1.**

### Caching

- **Backend:** Product routes use cacheMiddleware(600). When REDIS_URL is set, Redis is used; invalidateProductsCache() clears product keys on create/update/delete. When Redis is not set, middleware passes through (no in-memory fallback for product cache).
- **Frontend:** productService.getAll and getByMerchantId use 60s TTL in-memory cache; duplicate requests within TTL return cached data.

### Global request timeout

- requestTimeoutMiddleware is registered in server.js after metricsMiddleware. Default 15s (configurable via REQUEST_TIMEOUT_MS). Timer cleared on res `finish` and `close`. On timeout, responds with 503 and `{ success: false, error: 'Request timeout' }` and logs requestId, url, method, timeoutMs. **Functioning as intended.**

### Latency

- No runtime load tests were run. Structurally: pagination limits result set size; cart and list endpoints avoid N+1; product list is cacheable; timeout prevents runaway requests. Recommendation: add targeted load tests or APM for key endpoints (e.g. GET /api/products, GET /api/orders, GET /api/cart) to measure p95/p99 under typical load.

---

## 4. Frontend Verification

### Lazy-loaded tabs

- **CustomerView:** Shop, Cart, and Orders tabs are lazy-loaded (React.lazy + Suspense); fallback uses `t.common.loading`. **Verified.**
- **MerchantView:** Tabs are not lazy-loaded; entire view is one component. **Gap.**
- **AdminView:** Tabs are not lazy-loaded; entire view is one component. **Gap.**

### Duplicate fetches and caching

- CustomerView uses productsFetchedRef so the initial products fetch runs once. Frontend productService TTL (60s) avoids duplicate getAll/getByMerchantId within the window. **No duplicate fetch issues identified.**

### UI behavior

- CustomerView tab components receive the same props and callbacks as before; state remains in CustomerView; checkout and cancel modals unchanged. **UI behavior unchanged.**

---

## 5. Logging & Observability

- **requestId:** Set by requestIdMiddleware; attached to res as x-request-id.
- **requestLogger:** Logs on res finish with requestId, method, url, status, durationMs, ip; adds userId when req.auth.sub exists; adds orderId/productId via getRouteIds (IDs only).
- **errorHandler:** Logs with requestId, userId, orderId, productId where applicable; no PII in meta.
- **Health:** /health (liveness), /ready (readiness with DB), /metrics (Prometheus) implemented and wired; docker-compose backend healthcheck uses /ready.

---

## 6. Environment & Configuration

- **validateEnv()** runs at startup (before app.listen). Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET (non-empty).
- On missing required var, validateEnv throws; uncaughtException handler logs and exits. **Fail-fast behavior correct.**

---

## Recommendations (no changes applied)

1. **Pagination helper:** Add `server/utils/pagination.js` (e.g. parsePagination(opts, defaults)) and use it in order, product, notification, and admin services to remove duplication and standardize caps.
2. **MerchantView / AdminView:** Extract tab content into separate components and load with React.lazy + Suspense (mirror CustomerView) to improve bundle splitting and consistency.
3. **Latency and load:** Add automated or manual load tests (or APM) for GET /api/products, GET /api/orders, GET /api/cart, and GET /api/admin/\* to establish baseline latency and verify behavior under load.
4. **Logger in frontend productService:** Replace remaining console.error in frontend productService.getAll/getByMerchantId with a shared logger or leave as-is if frontend has no logger; document decision.

---

_This audit was performed by static analysis only; no production data or endpoints were modified._
