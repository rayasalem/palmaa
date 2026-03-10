# Palma Marketplace – Post-Improvement Audit Report

**Audit date:** 2025-02-23  
**Scope:** Backend modules, API endpoints, frontend flows, refactors, caching, pagination, logging, health checks, env validation.  
**Method:** Static/code analysis only; no production data modified.

---

## Summary Table

| Module/Endpoint                                        | Check Performed                                              | Status   | Notes                                                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server bootstrap**                                   |                                                              |          |                                                                                                                                                                                  |
| `server.js`                                            | validateEnv() called before app listen                       | **Pass** | `validateEnv()` is invoked at top level; missing required env throws and prevents startup.                                                                                       |
| `server.js`                                            | requestId → requestLogger → metricsMiddleware order          | **Pass** | Middleware order: generalLimiter, requestIdMiddleware, requestLogger, metricsMiddleware.                                                                                         |
| `config/env.js`                                        | Required env: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET | **Pass** | All three required; empty string fails validation. Fail-fast on missing.                                                                                                         |
| **Health & observability**                             |                                                              |          |                                                                                                                                                                                  |
| GET `/health`                                          | Liveness response shape                                      | **Pass** | Returns `{ ok: true, timestamp }`; no DB check.                                                                                                                                  |
| GET `/ready`                                           | Readiness + DB check                                         | **Pass** | Returns `{ ready, timestamp, checks: { database, payment } }`; 503 if DB unreachable.                                                                                            |
| GET `/metrics`                                         | Prometheus format + Cache-Control                            | **Pass** | `Content-Type: text/plain`, `Cache-Control: no-store, no-cache, must-revalidate`; uses getPrometheusText().                                                                      |
| `utils/metrics.js`                                     | Request count, latency histogram, errors                     | **Pass** | recordRequest() with method, normalized route, status; 4xx/5xx counted in errorCount.                                                                                            |
| `middlewares/requestId.js`                             | UUID per request, x-request-id header                        | **Pass** | Sets req.id; forwards incoming or generates randomUUID(); sets response header.                                                                                                  |
| `middlewares/requestLogger.js`                         | requestId, userId, orderId, productId in meta                | **Pass** | getRouteIds() used; meta includes requestId, optional userId, orderId, productId (no PII).                                                                                       |
| `middlewares/errorHandler.js`                          | Structured error log with route IDs                          | **Pass** | Imports getRouteIds; adds orderId/productId to meta; response shape unchanged.                                                                                                   |
| **Order API**                                          |                                                              |          |                                                                                                                                                                                  |
| GET `/api/orders/:id`                                  | optionalAuth + access control                                | **Pass** | Route uses optionalAuth; controller allows customer_id, merchant_id, ADMIN, or valid X-Order-Guest-Token.                                                                        |
| GET `/api/orders/:id`                                  | UUID v4 validation for id and guest token                    | **Pass** | 400 for invalid order id; 403 for invalid guest token format; no info leak.                                                                                                      |
| GET `/api/orders/:id`                                  | Response shape (guest_access_token stripped)                 | **Pass** | `const { guest_access_token: _, ...orderForClient } = data`; client never receives token.                                                                                        |
| GET `/api/orders` (listMyOrders)                       | Optional limit/offset; response shape                        | **Pass** | Parses limit/offset; passes to getOrdersByCustomerId; response `{ success, orders }` unchanged.                                                                                  |
| POST `/api/orders`                                     | createOrder body + guest_access_token for guest              | **Pass** | orderService.createOrder sets guest_access_token when !customer_id; response shape unchanged.                                                                                    |
| **Product API**                                        |                                                              |          |                                                                                                                                                                                  |
| GET `/api/products`                                    | Optional limit/offset; response shape                        | **Pass** | productController.list passes opts; getActiveProducts uses parsePagination (default 500); response `{ success, products }` unchanged.                                            |
| GET `/api/products/merchant/:merchantId`               | Optional limit/offset; response shape                        | **Pass** | listByMerchant passes opts; response `{ success, products }` unchanged.                                                                                                          |
| GET `/api/products/:id`                                | Response shape                                               | **Pass** | Unchanged; returns `{ success, product }`.                                                                                                                                       |
| cacheMiddleware (products)                             | Applied to productRoutes only                                | **Pass** | server.js: `app.use('/api/products', cacheMiddleware(600), productRoutes)`.                                                                                                      |
| **Admin API**                                          |                                                              |          |                                                                                                                                                                                  |
| GET `/api/admin/users`                                 | Pagination + response shape                                  | **Pass** | getUsers passes limit/offset; adminService.listUsers applyPagination; response `{ success, users }` unchanged.                                                                   |
| GET `/api/admin/orders`                                | Pagination support                                           | **Fail** | adminController.getOrders does not pass limit/offset to listOrders; listOrders(opts) would support it if controller passed opts. Backward compatible (returns all when no opts). |
| GET `/api/admin/products`                              | Pagination + response shape                                  | **Pass** | getProducts passes limit/offset; response `{ success, products }` unchanged.                                                                                                     |
| **Notifications API**                                  |                                                              |          |                                                                                                                                                                                  |
| GET `/api/notifications`                               | Optional limit/offset; response shape                        | **Pass** | notificationController.list passes opts; listByUserId uses parsePagination; response `{ success, notifications }` unchanged.                                                     |
| **Cart API**                                           |                                                              |          |                                                                                                                                                                                  |
| Cart service getCartWithItems                          | N+1 fix (batch product fetch)                                | **Pass** | Single batch query for all product_ids; productMap; itemsWithProduct built in memory. No per-item DB round trip.                                                                 |
| **Backend services**                                   |                                                              |          |                                                                                                                                                                                  |
| orderService.createOrder                               | guest_access_token UUID v4                                   | **Pass** | randomUUID() when !customer_id.                                                                                                                                                  |
| orderService.getOrdersByCustomerId                     | parsePagination + range                                      | **Pass** | Default limit 500, max 1000; .range(offset, offset + limit - 1).                                                                                                                 |
| orderService.getOrdersByMerchantId                     | parsePagination + range                                      | **Pass** | Same pattern.                                                                                                                                                                    |
| productService (backend) getActiveProducts             | parsePagination + range                                      | **Pass** | Default 500, max 1000.                                                                                                                                                           |
| productService (backend) getProductsByMerchantId       | parsePagination + range                                      | **Pass** | Same.                                                                                                                                                                            |
| notificationService.listByUserId                       | parsePagination + range                                      | **Pass** | Same.                                                                                                                                                                            |
| notificationService batch inserts                      | notifyAdminComment / notifyBrokersSharedProductComment       | **Pass** | Single insert(rows) per method (verified in conversation summary).                                                                                                               |
| **Logging**                                            |                                                              |          |                                                                                                                                                                                  |
| Core controllers (order, product, admin, notification) | logger.error instead of console.error                        | **Pass** | Controllers use logger.error('tag', { message }).                                                                                                                                |
| Some server services                                   | console.log/error/warn still present                         | **Warn** | profitService, authService, paymentService, emailService, shipmentService, transactionService, etc. still have console usage; intentional in server.js for fatal handlers.       |
| **Frontend**                                           |                                                              |          |                                                                                                                                                                                  |
| CustomerView                                           | Lazy-loaded tabs (Shop, Cart, Orders)                        | **Pass** | React.lazy for CustomerShopTab, CustomerCartTab, CustomerOrdersTab; Suspense with t.common.loading fallback.                                                                     |
| CustomerView                                           | Same props/handlers passed to tabs                           | **Pass** | State and callbacks remain in CustomerView; tab components receive same data/handlers; no API change.                                                                            |
| CustomerView                                           | productsFetchedRef guard                                     | **Pass** | productsFetchedRef prevents duplicate getAll() in useEffect.                                                                                                                     |
| productService (frontend)                              | getAll/getByMerchantId TTL cache                             | **Pass** | 60s TTL; returns cached result when fresh; on error returns lastGetAllResult or getByMerchantCache fallback.                                                                     |
| CustomerShared + customer tabs                         | UI structure and behavior                                    | **Pass** | ShippingInputGroup, ShopProductCard, CartItemRow, CategoryPill in CustomerShared; tabs render same JSX as before.                                                                |
| **Security & config**                                  |                                                              |          |                                                                                                                                                                                  |
| GET /api/orders/:id                                    | No PII in logs                                               | **Pass** | Only orderId (UUID) in meta; no customer/merchant names in request/error logs.                                                                                                   |
| Env validation                                         | Fail-fast on missing required                                | **Pass** | validateEnv() throws Error; process exits on uncaught; no server.listen if env invalid.                                                                                          |
| **Performance & N+1**                                  |                                                              |          |                                                                                                                                                                                  |
| cartService.getCartWithItems                           | Single batch product query                                   | **Pass** | productIds batch; one .in('id', productIds); no N+1.                                                                                                                             |
| adminService.listProducts                              | Merchant names batch                                         | **Pass** | merchantIds batch; single users + merchant_profiles query.                                                                                                                       |
| **Request timeouts**                                   |                                                              |          |                                                                                                                                                                                  |
| Global request timeout                                 | Express-level timeout                                        | **Fail** | No global request timeout middleware found. External calls (shipment, email, payment) have their own timeouts.                                                                   |
| **Docker / orchestration**                             |                                                              |          |                                                                                                                                                                                  |
| docker-compose backend healthcheck                     | Uses /ready                                                  | **Pass** | test: wget http://localhost:5000/ready; traffic only when healthy.                                                                                                               |

---

## 1. API response identity (pre- vs post-improvement)

- **Orders:** GET `/api/orders/:id` response shape is `{ success: true, order }` with `guest_access_token` always stripped. List endpoints still return `{ success, orders }` with same structure; optional limit/offset do not change keys or types.
- **Products:** List and get-by-id responses remain `{ success, products }` / `{ success, product }`; pagination only affects how many items are in the array.
- **Admin:** users/products responses unchanged; admin orders list response shape unchanged (pagination not wired in controller).
- **Notifications:** `{ success, notifications }` unchanged; limit/offset only affect length of array.

**Conclusion:** All checked API response shapes remain identical; pagination is additive (optional query params, same JSON keys).

---

## 2. Frontend UI and flows

- **CustomerView:** Tabs (shop, cart, orders) are implemented as lazy-loaded components with the same props and state owned by the parent. Modals (checkout, cancel order, cancel shipment) and ConfirmModal remain in CustomerView. No change to user-visible flows or UI structure.
- **CustomerShared:** Reusable components (ShippingInputGroup, ShopProductCard, CartItemRow, CategoryPill) preserve the same markup and behavior as the original inline components.

**Conclusion:** Frontend UI and flows are unchanged from a user perspective.

---

## 3. New refactors, caching, pagination, logging

- **Refactors:** CustomerView split into CustomerShopTab, CustomerCartTab, CustomerOrdersTab; shared components in CustomerShared; lazy loading with Suspense. All verified in code.
- **Caching:** Backend product routes use cacheMiddleware(600) with Redis when REDIS_URL is set; invalidateProductsCache() clears product keys. Frontend productService uses in-memory TTL (60s) for getAll and getByMerchantId.
- **Pagination:** Backend list endpoints (products, orders by customer/merchant, admin users/products, notifications) use limit/offset with safe defaults and max limits; admin orders controller does not yet pass opts (behavior unchanged: returns all).
- **Logging:** requestId, requestLogger (with getRouteIds), and errorHandler (with orderId/productId in meta) are in place; core controllers use logger; some services still use console for non-fatal paths.

---

## 4. Errors, warnings, unexpected behavior

- **Intentional console usage:** server.js keeps console.error for uncaughtException/unhandledRejection (fatal); env.js uses console.warn when PALMA_SHOW_ENV_WARNINGS is set. Other console usages in services (e.g. authService, emailService) could be migrated to logger for consistency.
- **Admin getOrders:** Does not pass limit/offset; listOrders supports opts but controller does not send them. Result: no regression; admin orders still return full list.

---

## 5. Performance-sensitive paths and N+1

- **Cart getCartWithItems:** N+1 fixed; single batch query for products by id list.
- **Product list (backend):** getActiveProducts and getProductsByMerchantId use single range query plus batch merchant name resolution.
- **Admin listProducts:** Single products query + batch merchant lookup; no N+1.

---

## 6. Health checks, timeouts, metrics

- **Health:** `/health` (liveness) and `/ready` (readiness with DB check) implemented; docker-compose backend healthcheck uses `/ready`.
- **Metrics:** `/metrics` returns Prometheus text; metricsMiddleware records count, duration, and errors; route normalized to avoid high cardinality.
- **Request timeouts:** No global Express request timeout; only per-service timeouts (e.g. shipment, email, payment). Recommendation: consider a global timeout middleware for long-running requests.

---

## 7. Environment variable validation and fail-fast

- **Required:** SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET must be non-empty; validateEnv() throws if any missing.
- **Startup:** validateEnv() is called before app creation/listen; throw prevents server from starting.
- **Optional:** Optional-but-recommended vars are only warned when NODE_ENV=production and PALMA_SHOW_ENV_WARNINGS=true.

**Conclusion:** Env validation and fail-fast behavior are correct for required variables.

---

## Recommendations (no changes applied)

1. **Admin orders pagination:** Add limit/offset parsing in adminController.getOrders and pass opts to adminService.listOrders for consistency with other list endpoints.
2. **Global request timeout:** Add a timeout middleware (e.g. 30s) for all API routes to avoid hanging requests.
3. **Logger consistency:** Replace remaining console.log/error/warn in server services with the centralized logger where appropriate.

---

_This report was generated by static analysis only; no production data was modified._
