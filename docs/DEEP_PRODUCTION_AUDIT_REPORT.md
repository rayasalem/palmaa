# Deep Production-Safe System Audit Report

**Scope:** Hidden scalability, performance, database, and DevOps bottlenecks.  
**Constraints:** Analysis and recommendations only; no API/schema changes; no breaking changes.  
**Goal:** Identify risks that may appear at 10k–1M users and provide a non-breaking improvement roadmap.

---

## 1. Frontend Performance Audit

### 1.1 Unnecessary Re-Renders & Memoization

| Finding                                                                | Location                                                                                         | Risk                                                       | Safe Fix                                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Inline handlers in list `.map()` create new function refs every render | MerchantView ~818–871: `onClick={() => handleToggleStatus(product)}`, `handleEditClick(product)` | Medium – list re-renders on any parent state change        | Pass stable `useCallback` with product id: `handleToggleStatus(id)`; wrap list item in `React.memo`         |
| Same pattern                                                           | CustomerView: `filteredShopProducts.map` with inline `onMouseEnter` prefetch                     | Low – prefetch is cheap                                    | Keep as-is or wrap in `useCallback` with product id                                                         |
| Same pattern                                                           | AdminView orders/withdrawals `.map`; BrokerView products/sharedMeta; ProfileView groupedProducts | Low–Medium                                                 | Use stable callbacks and memoized row components where missing                                              |
| `marketStore.getProducts().length` in useEffect deps                   | ProfileView ~82                                                                                  | Medium – store reference can change; may refetch too often | Depend on a stable “products version” or explicit ref; or remove from deps and refetch only on user.id/role |
| No memo on some list parents                                           | CustomerView order list, AdminView order table                                                   | Low                                                        | Wrap row subcomponents in `React.memo`; ensure callbacks are `useCallback`                                  |

**Already in place:** CustomerView uses `React.memo` on ShippingInputGroup, ShopProductCard, CartItemRow, CategoryPill; AdminView on UserRow, ProductRow; useMemo for filtered lists and totals; useCallback for cart/category handlers.

### 1.2 Heavy Components

| Component       | Approx. Lines | Observation                                                                     |
| --------------- | ------------- | ------------------------------------------------------------------------------- |
| CustomerView    | ~1,340        | Single file: shop, cart, orders, checkout form, modals. High re-render surface. |
| MerchantView    | ~1,110        | Products list + form, orders, shipments, invoices in one tree.                  |
| AdminView       | ~1,047        | Users, products, orders, withdrawals, platform in one file.                     |
| translations.ts | ~1,250        | Single module; no lazy load by locale – increases main bundle.                  |

**Safe improvement:** Extract tabs/sections into subcomponents (e.g. ShopTab, CartTab, CheckoutForm) with same props/state; no logic change.

### 1.3 Bundle & Large Files

- **Lazy loading:** PublicWebsite, PublicCatalog, CustomerView, MerchantView, AdminView, ProfileView, PublicProductDetails are `React.lazy` – good.
- **translations.ts:** Loaded synchronously; all three languages in one chunk. For scale, consider splitting by locale and lazy-loading the active language.
- **Vite:** No `manualChunks` – vendor (react, recharts, lucide, supabase) and app share default splitting. Optional: split recharts and/or translations to reduce initial load.
- **No behavior change:** Lazy-loading translations by locale is backward compatible.

### 1.4 Duplicate / Inefficient API Requests

| Pattern                     | Where                                                                                        | Impact                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **productService.getAll()** | App initApp, CustomerView mount, PublicWebsite mount + focus, PublicCatalog on filter change | Multiple calls for same data; no “load once per session” or shared cache guard. |
| **getAdminProducts()**      | AdminView when `activeTab === 'products'`                                                    | Every tab switch refetches; no in-session cache.                                |
| **PublicCatalog**           | `useEffect([fetchAndFilterProducts])` – fetchAndFilterProducts depends on all filter state   | Every filter/sort change triggers full `getAll()`; no debounce.                 |

**Safe improvements:**

- Frontend: Add a short-lived “products loaded at” timestamp or flag in App/store; CustomerView and PublicWebsite skip getAll if recent (e.g. &lt; 60s). No API change.
- AdminView: Cache products in state after first load; refetch only on explicit “Refresh” or after create/update/delete. No API change.
- PublicCatalog: Debounce filter changes (e.g. 300ms) before calling fetchAndFilterProducts; or use existing in-memory product list and filter client-side when data is already loaded. No API change.

### 1.5 Safe Optimizations Summary (No Behavior Change)

- Wrap MerchantView product row in a memoized component with stable callbacks by product id.
- Add optional “products loaded at” / refetch interval to avoid duplicate getAll on mount (CustomerView, PublicWebsite).
- Debounce PublicCatalog filter-driven fetch or filter client-side when products already in memory.
- Consider lazy-loading translation JSON by locale to reduce initial bundle (same UI strings).

---

## 2. Backend Performance & Bottlenecks

### 2.1 Express Middleware Chain

Order is appropriate: CORS → helmet → compression → cookieParser → json → generalLimiter → requestLogger → sanitizeErrorResponse → routes → static → 404 → errorHandler. No blocking or heavy sync work in middleware.

### 2.2 Slow Endpoints & N+1

| Endpoint / Code                                  | Issue                                                                                            | Safe Fix                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **GET /api/cart** (cartService.getCartWithItems) | N+1: for each cart item, one Supabase query to load product. 10 items = 1 + 10 = 11 round-trips. | Single query: load all cart items, collect product_ids, then `products.select().in('id', productIds)` once; join in memory. Same response shape. |
| **GET /api/admin/products**                      | No limit; full table scan as products grow.                                                      | Add optional `?limit=100&offset=0`; default limit 100. Backward compatible if client does not send params (return first 100).                    |
| **GET /api/admin/orders**, **listUsers**         | No limit.                                                                                        | Same: optional pagination with defaults; keep existing behavior when no query params.                                                            |
| **GET /api/products** (getActiveProducts)        | No limit.                                                                                        | Optional limit (e.g. 500) or pagination; cache already limits repeated DB hit.                                                                   |

### 2.3 Supabase Usage Patterns

- **List endpoints:** `select('*')` or `select('*, order_items(*)')` with `.eq()` / `.or()` / `.order()` but no `.limit()` or `.range()` – will return unbounded rows as data grows.
- **Single-row:** `.single()` or `.limit(1)` used correctly.
- **Safe improvement:** Add `.limit(N)` or `.range(offset, offset+limit-1)` to list endpoints with conservative defaults; document query params for future clients. No schema change.

### 2.4 Caching (NodeCache)

- **Current:** In-memory NodeCache for GET `/api/products` (TTL 600s). Invalidation on product create/update/delete (single process).
- **Multi-instance:** Each instance has its own cache; invalidation in one instance does not clear others – stale product list on other instances until TTL expires.
- **Safe improvement:** Document that multi-instance deployment may show stale product list for up to 10 minutes on other instances. Future: introduce Redis (or similar) as shared cache and call invalidate on product mutations; keep same API and response shape.

---

## 3. Database Scalability

### 3.1 Query Patterns

- **Filter columns:** status, merchant_id, customer_id, user_id, order_id, product_id, cart_id, broker_id, email, created_at.
- **Order:** Often `created_at desc` on lists.
- **No pagination:** listUsers, listOrders, listProducts, getActiveProducts return full result set.

### 3.2 Recommended Indexes (No Query Change)

Suggested indexes (create via Supabase SQL; no code change to queries):

| Table       | Index                                           | Reason                                            |
| ----------- | ----------------------------------------------- | ------------------------------------------------- |
| users       | (status), (email)                               | Filter by status (e.g. PENDING); lookup by email. |
| products    | (merchant_id), (status) or (is_active, status)  | List by merchant; filter active.                  |
| orders      | (customer_id), (merchant_id), (created_at desc) | List by customer/merchant; sort by date.          |
| order_items | (order_id)                                      | Join orders with items.                           |
| cart_items  | (cart_id), (cart_id, product_id)                | Cart lookup; upsert by cart+product.              |
| carts       | (user_id) unique                                | getOrCreateCart.                                  |

### 3.3 Tables That May Grow Large

- **orders**, **order_items:** Grow with transactions; add pagination and indexes above.
- **products:** Can be large; product list already cached; add index and optional limit.
- **notifications:** May grow per user; consider TTL or pagination by user.

---

## 4. Caching Strategy

### 4.1 Current State

- **NodeCache:** Product list GET only; TTL 600s; invalidation on product write in same process.
- **No distributed cache:** Multiple backend instances do not share cache; invalidation does not propagate.

### 4.2 Failure Under Multiple Instances

- **Scenario:** 2+ instances behind a load balancer. User creates product on instance A; cache invalidated on A. Next GET /api/products hits instance B; B still has old list for up to 600s.
- **Impact:** Stale product list for a short window; no correctness bug if DB is source of truth.

### 4.3 Recommended Distributed Cache (Non-Breaking)

- **Option A:** Introduce Redis (or managed equivalent). Cache layer: on GET /api/products check Redis; on miss query DB, store in Redis with TTL 600, return. On product create/update/delete, delete Redis key (or key pattern). Same API and response.
- **Option B:** Keep NodeCache; document that with multiple instances, product list can be stale up to TTL; accept for current scale.
- **Option C:** Shorten TTL (e.g. 60s) when moving to multi-instance to reduce staleness; more DB load.

---

## 5. Security Hardening

### 5.1 XSS

- **Rendering:** No `dangerouslySetInnerHTML` in app code; user content (product name, description, comments) rendered as React children – escaped by default. Low XSS risk from content.

### 5.2 CSRF

- **Auth:** JWT in cookie (httpOnly possible) and/or Bearer in header. SameSite cookie and CORS limit CSRF; no explicit CSRF token. For strict hardening, consider CSRF token for state-changing operations if cookie-based auth is primary.

### 5.3 Token Storage

- **Risk:** JWT in localStorage and sessionStorage (api/client). If XSS occurs, token can be stolen. Documented for cross-origin/mobile.
- **Safe improvement:** Prefer httpOnly cookie for web when same-origin; keep Bearer for mobile/cross-origin. No API contract change; backend already accepts both.

### 5.4 Sensitive Routes

- **Protected:** Admin, broker, cart, product write, orders, shipment, notifications, follow – use authenticate and/or requireRole. No sensitive route found without auth.
- **Public by design:** GET products, product by id, merchant public profile.

### 5.5 Data Exposure

- **Error messages:** sanitizeErrorResponse and userFacingError reduce leakage of stack and DB details in responses. Continue to avoid exposing internal errors to clients.

---

## 6. DevOps & Production Stability

### 6.1 Deployment

- **Docker:** Frontend (Node build + nginx), backend (Node server), postgres, redis, nginx in docker-compose. Backend healthcheck uses `/ready` so traffic is only routed when DB (and optional deps) are up.
- **CI/CD:** Build and audit in GitHub Actions; deploy steps placeholder. Safe improvement: wire deploy to staging/production with same build artifacts; no app logic change.

### 6.2 Logging

- **Winston:** Level by env; timestamp, level, message, meta; service name. Request logger logs method, url, status, duration, ip on finish.
- **Gaps:** No request ID or correlation ID; harder to trace a single request across logs. Safe: add middleware that sets `req.id = uuid()` and logs it in requestLogger; include in errorHandler. No behavior change.

### 6.3 Observability

- **Missing:** No metrics (e.g. request rate, latency percentiles, error rate); no APM; no centralized log aggregation in code.
- **Safe:** Add a minimal metrics endpoint (e.g. /metrics with request count and latency buckets) or integrate Prometheus/OpenTelemetry later; keep health/ready as-is.

### 6.4 Health Checks

- **/health:** Returns 200 + timestamp – liveness only.
- **/ready:** Checks DB (Supabase select limit 1) and optionally payment env; returns 503 if DB unreachable. Good for readiness.
- **Safe:** Ensure load balancer/orchestrator uses /ready for routing; document that /health is liveness, /ready is readiness.

---

## 7. Failure Scenarios & Mitigations

| Scenario                    | Current Behavior                                                               | Mitigation (Non-Breaking)                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database slowdown**       | Queries block; request backlog; timeouts possible.                             | Add query timeouts in Supabase client if supported; add response timeout middleware (e.g. 30s) and return 503; scale DB or add read replicas.                       |
| **API timeout**             | Client may hang or fail after long wait.                                       | Frontend: set AbortController timeout on fetch (e.g. 25s); show “Request timed out” and retry option. Backend: timeout middleware.                                  |
| **Payment gateway failure** | Cybersource down or slow.                                                      | Return 503 or 502 from payment route; frontend shows “Payment temporarily unavailable”; retry button. Add circuit breaker in backend for payment calls (optional).  |
| **High traffic spike**      | Rate limit (200/15min general) may reject; DB and single process may saturate. | Increase rate limit or make it configurable; scale horizontally (multiple instances); add Redis for product cache and session if needed; DB connection pool tuning. |

---

## 8. Scaling Simulation

| Users (approx.) | Expected Behavior                                                                                                                               | Where It May Fail                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **1,000**       | Current design can handle. Product list cached; cart N+1 noticeable but small (e.g. 5 items = 6 queries).                                       | Few hot spots.                                                                                          |
| **10,000**      | List endpoints (admin users, orders, products) return more rows – slower response and more memory. Cart N+1 and unbounded lists become visible. | Admin list endpoints; GET /api/products if cache miss; cart with many items.                            |
| **100,000**     | Unbounded lists and N+1 cart can cause timeouts and high DB load. Single NodeCache per instance; no horizontal cache coherence.                 | DB CPU and connections; list endpoint response size; cart endpoint; cache incoherence across instances. |

**Summary:** System will start showing strain at **~10k users** on list and cart endpoints; at **~100k** users, list pagination, cart N+1 fix, indexes, and distributed cache become necessary to avoid failures.

---

## 9. Top 10 Hidden Production Risks

1. **Cart N+1 queries** – One DB round-trip per cart item; large carts and concurrent users multiply load. Fix: batch product fetch by product_ids.
2. **Unbounded list endpoints** – listUsers, listOrders, listProducts, getActiveProducts return full table; at scale cause slow response and OOM risk. Fix: add limit/pagination with backward-compatible defaults.
3. **Duplicate product getAll()** – Multiple components call productService.getAll() on mount or focus without shared “recently loaded” guard; redundant network and DB. Fix: centralize load or short TTL “products fresh” flag.
4. **In-memory product cache with multiple instances** – Invalidation only on the instance that handled the write; other instances serve stale list up to TTL. Fix: document; later add Redis (or similar) and invalidate globally.
5. **No request correlation ID** – Hard to trace a request across logs and services. Fix: add req.id in middleware and log it everywhere.
6. **Env validation not enforced** – required list empty; app can start without SUPABASE\_\* or JWT_SECRET. Fix: add required vars and validateEnv() so process exits early with clear message.
7. **Translations in main bundle** – Large single module; all locales loaded. Fix: lazy-load per locale to reduce initial bundle.
8. **Heavy views re-render on any state change** – CustomerView, MerchantView, AdminView are single large components; any state update can re-render large trees. Fix: split into subcomponents and memoize where appropriate.
9. **Payment gateway not in /ready** – Optional; if payment is critical, readiness should reflect it. Fix: document; optionally enable HEALTH_CHECK_PAYMENT and fail ready when gateway unreachable.
10. **No query or response timeouts** – Long-running DB or external calls can hold connections. Fix: add timeouts (Supabase/client and/or Express) and return 503 on timeout.

---

## 10. Non-Breaking Improvement Roadmap

**Target:** Evolve from current ~6–7/10 to production-grade ~8–9/10 without breaking the live system.

### Phase A – Quick Wins (Weeks 1–2)

| #   | Action                                                                                                 | Breaking?                                         |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| A1  | Add request ID middleware and log req.id in requestLogger and errorHandler                             | No                                                |
| A2  | Env: add required list (e.g. SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET); validateEnv() at startup | No (only fails if missing)                        |
| A3  | Backend: fix cart N+1 – batch product fetch in getCartWithItems; same response shape                   | No                                                |
| A4  | Backend: add optional `?limit=&offset=` to admin list endpoints with default limit 100                 | No (clients that don’t send params get first 100) |

### Phase B – Frontend & Caching (Weeks 2–4)

| #   | Action                                                                                                            | Breaking? |
| --- | ----------------------------------------------------------------------------------------------------------------- | --------- |
| B1  | Reduce duplicate getAll: “products loaded at” in App or store; CustomerView/PublicWebsite skip getAll if &lt; 60s | No        |
| B2  | AdminView: cache products in state; refetch only on Refresh or after create/update/delete                         | No        |
| B3  | PublicCatalog: debounce filter-driven fetch or filter client-side when products already loaded                    | No        |
| B4  | Lazy-load translations by locale (e.g. import(`./translations.${lang}.ts`)); same keys                            | No        |

### Phase C – Database & Backend (Weeks 4–6)

| #   | Action                                                                                             | Breaking? |
| --- | -------------------------------------------------------------------------------------------------- | --------- |
| C1  | Add recommended indexes (users, products, orders, order_items, cart_items, carts) via Supabase SQL | No        |
| C2  | getActiveProducts and product list: add default .limit(500) or .range(0,499); document             | No        |
| C3  | Add response timeout middleware (e.g. 30s) and return 503 on timeout                               | No        |
| C4  | Document multi-instance cache behavior; optionally shorten product cache TTL when scaling out      | No        |

### Phase D – Observability & Hardening (Weeks 6–8)

| #   | Action                                                                                         | Breaking? |
| --- | ---------------------------------------------------------------------------------------------- | --------- |
| D1  | Add /metrics endpoint (request count, latency) or integrate Prometheus                         | No        |
| D2  | Frontend: AbortController timeout (e.g. 25s) for API calls; show timeout message and retry     | No        |
| D3  | Optional: Redis for product cache; invalidate on product write; same API                       | No        |
| D4  | Memoize MerchantView product row and pass stable callbacks; optional same for other list views | No        |

### Phase E – Optional (Later)

- Split CustomerView/MerchantView/AdminView into smaller components (same behavior).
- CSRF token for cookie-based state-changing requests if needed.
- Circuit breaker for payment gateway calls.
- Centralized log aggregation and alerting.

---

**Report end.** All recommendations are intended to be implementable gradually without API or schema changes and without removing or breaking existing functionality.
