# Palma Marketplace — Full Scalability & Capacity Analysis

**Date:** March 2026  
**Scope:** Architecture, database, API, frontend, and infrastructure. **No code or schema changes** — analysis only.

**Target scenario:**
- 1,000 merchants, up to 10,000 products each → **10,000,000 products**
- 50,000 daily visitors, 5,000 registered customers
- 500–1,000 orders/day; 100 concurrent catalog users; 50 concurrent checkouts

---

## 1. Backend Capacity (Node.js + Express)

### Current setup
- **Process model:** Single Node.js process; no clustering (e.g. no `cluster` or PM2 workers).
- **Request timeout:** 15 s (`REQUEST_TIMEOUT_MS`).
- **Rate limits (per IP, 15 min unless noted):**
  - General: 200 req (configurable via `RATE_LIMIT_MAX`).
  - Auth: 200 req.
  - Product list GET: 100 req (`RATE_LIMIT_PRODUCTS_LIST`).
  - Product by ID GET: 300 req.
  - Cart: 150 req.
  - Payment: 20 req/min.
- **Optional Redis:** When `REDIS_URL` is set, rate limit and cache use Redis (shared across instances). Without it, limits and cache are in-memory (single instance only).
- **Payload:** `express.json({ limit: '15mb' })` for product images/base64.

### Estimated capacity (single instance)
- **Concurrent requests:** ~100–200 before latency grows (depends on DB and external APIs). Node is non-blocking I/O; bottleneck is DB and external calls.
- **Safe concurrent users (browsing + light API):** ~50–100. Above that, queueing and 429s from rate limits become likely.
- **Bottlenecks:**
  1. **Synchronous external APIs:** LogesTechs (shipment) and payment (Cybersource) are called in the request path. Slow or failing APIs block the request until timeout (e.g. 20 s for shipment).
  2. **Heavy product list:** `getActiveProducts()` runs several steps: products query (with optional search/category), suspended users check, `getMerchantNamesMap()` (users + merchant_profiles). With 10M products, the initial products query (see §2) becomes the main bottleneck.
  3. **No connection pooling config:** Supabase client is used as-is; effective pool size is determined by Supabase plan and client defaults.
  4. **Blocking / memory:** No obvious CPU-heavy sync work; memory grows with request payloads (e.g. 15 MB JSON) and in-memory cache when Redis is not used.

### Verdict (backend)
- Single instance is suitable for **low hundreds** of concurrent users and **hundreds of orders/day**.
- For **1,000 orders/day** and **100 concurrent catalog + 50 concurrent checkouts**, one instance will be stressed; rate limits and timeouts (shipment/payment) will be hit under peak load.

---

## 2. Database Capacity (Supabase / PostgreSQL)

### Schema (relevant tables)
- **products:** `id` (TEXT), `merchant_id` (UUID FK), `category`, `is_active`, `status`, `created_at`, etc.
- **orders:** `id` (TEXT), `customer_id`, `merchant_id`, `created_at`, etc.
- **order_items:** `order_id`, `product_id`, `quantity`, `price`.
- **carts / cart_items:** per-user cart and items.
- **users, merchant_profiles, shop_offers, merchant_offers:** supporting tables.

### Indexes (from migrations and setup)
- **products:**  
  `idx_products_merchant_id`, `idx_products_is_active_status`, `idx_products_merchant_status`, `idx_products_category_active`, `idx_products_condition`.
- **orders:**  
  `idx_orders_customer_id`, `idx_orders_merchant_id`, `idx_orders_created_at_desc`.
- **order_items:**  
  `idx_order_items_order_id`.
- **carts:**  
  unique on `user_id`.
- **notifications:**  
  `idx_notifications_user_id_created_at`.

**Missing for catalog at scale:**
- No index on `products(created_at)` or composite `(is_active, status, created_at DESC)`.  
  Catalog list uses `ORDER BY created_at DESC` and filter `status.eq.active, is_active.eq.true`. With 10M rows, the planner can use `idx_products_is_active_status` to reduce rows but still must sort by `created_at` on a large set; **query time can reach several seconds** and will not scale.
- No full-text or dedicated search index on `products(name, description)`; search uses `ilike` with leading `%`, which cannot use a B-tree index effectively.

### Query analysis at target scale

| Scenario | Table sizes | Query / behavior | Expected performance |
|--------|-------------|-------------------|----------------------|
| Product list (catalog) | 10M products | `SELECT * FROM products WHERE (status, is_active) ORDER BY created_at DESC LIMIT 24` (+ suspended filter, merchant names) | **Slow (seconds)** without composite index on (is_active, status, created_at DESC). |
| Product by ID | 10M products | PK lookup | **Fast.** |
| Product list by merchant | 10K/products per merchant | `merchant_id` + range, indexed | **OK** (indexed). |
| Orders by customer | 1M orders | `idx_orders_customer_id` + `created_at` | **OK** with limit. |
| Orders by merchant | 1M orders | `idx_orders_merchant_id` | **OK** with limit. |
| Order + items | 5M order_items | `idx_order_items_order_id` | **OK** per order. |
| Cart get/add | — | carts by user_id, cart_items by cart_id | **OK** (indexed). |

### Pagination
- **Backend:** `parsePagination(opts, 24, 100)` for products (default 24, max 100). Uses `offset`/`limit`.
- **Offset at 10M:** e.g. `OFFSET 5000000 LIMIT 24` forces a large skip; **performance degrades** with increasing page number. Cursor/keyset pagination (e.g. `WHERE created_at < ? ORDER BY created_at DESC LIMIT 24`) is not implemented.

### Joins and extra round-trips
- Product list: after fetching products, separate queries for suspended users and for `getMerchantNamesMap(users + merchant_profiles)`. So **multiple round-trips per list request**; at scale this amplifies latency.

### Verdict (database)
- **1M orders, 5M order_items:** Current indexes are sufficient for order and order_items access patterns.
- **10M products:**  
  - Listing by merchant (10K each): fine.  
  - **Global catalog list and search will not remain fast** without: (1) composite index (e.g. `(is_active, status, created_at DESC)`), (2) server-side search (full-text or search engine), (3) cursor-based pagination.
- **No partitioning or read replicas** in the current design; all load hits the primary DB.

---

## 3. Merchant Load

### Product creation
- **Flow:** Auth → `subscriptionService.canAddProducts(merchantId)` → single `products` INSERT.
- **Payload:** Up to 15 MB JSON (images as URLs or base64).
- **Concurrency:** No per-merchant rate limit on product create; general and DB connection limits apply.
- **1,000 merchants × 10,000 products:** 10M single-row inserts. No batch API; each product is one HTTP request and one INSERT. Feasible over time, but **simultaneous uploads** (e.g. many merchants at once) will hit:
  - Rate limit (200/15 min per IP; if each merchant has distinct IP, 200 creates per 15 min per merchant).
  - DB connections and Supabase write throughput.
- **Image uploads:** Stored as URLs or base64 in JSON; no dedicated binary upload flow in this analysis. Large payloads increase memory and latency.

### Merchant dashboard
- **Product list:** `GET /api/products/merchant/:merchantId` with pagination; indexed by `merchant_id`. For 10K products per merchant, paginated requests (e.g. 100 per page) are **acceptable**.
- **Offers, orders, etc.:** Same as elsewhere; indexed and paginated where applicable.

### Verdict (merchant)
- **1,000 merchants** and **10K products each** are supportable from a schema and API design perspective.
- **Simultaneous product uploads** are limited by single-instance throughput, rate limits, and DB; for heavy parallel uploads, a queue or batch API would be needed (not in current design).

---

## 4. Catalog Performance

### Backend
- **List:** `getActiveProducts(opts)` with default `limit=24`, `max=100`. No `limit`/`offset` from frontend in the critical path (see below) → backend returns **24 products** by default.
- **Search:** `q` and `category` applied in SQL; search uses `ilike` with `%term%` → not index-friendly at 10M rows.
- **Caching:** Product list response cached 600 s (Redis or in-memory). With many distinct query params (q, category, page), cache key variety grows; cache hit rate for “first page” can be good, deep pages and rare searches worse.

### Frontend (critical)
- **Data loading:** `productService.getAll()` calls `GET /api/products` **with no query params** → backend returns **24 products** (default limit).
- **Storage:** Response is stored in `db.products` and in a 60 s client cache (`lastGetAllResult`).
- **Filtering and pagination:** All filtering (search, category, price, etc.) and pagination (PAGE_SIZE = 12) are done **client-side** on this in-memory list (see `marketStore.getFilteredProducts` and `productService.filter`).
- **Implication:** With the current frontend, the catalog **never shows more than 24 (or at most 100 if limit is passed)** products in total. It does **not** load 10M or even 10K products; it loads one page worth from the API and treats that as the full dataset.

### At 10M products (if frontend were changed to server-side)
- If the frontend were to request paginated, server-side filtered lists (e.g. by category, search, sort), then:
  - **Listing:** Would require the composite index and cursor pagination discussed in §2 to stay fast.
  - **Search:** `ilike` on 10M rows would be slow; full-text or external search would be necessary.
  - **Filters:** Category and other attributes would need proper indexing and possibly materialized/aggregate strategies for facets.

### Verdict (catalog)
- **Current behavior:** Catalog is effectively capped at **24–100 products** per “universe” (one initial load). It does not scale to 10M products without **architectural changes**: server-side filtering, pagination, and search.
- **If those changes existed:** Backend and DB would still need index and pagination improvements (§2) to support 10M products with good latency.

---

## 5. Order System

### Order creation
- **Flow:** Insert `orders` → update `order_reference` → bulk insert `order_items`. No transaction wrapper in the reviewed code; partial failure can leave order without items.
- **Per order:** 1 order INSERT + 1 UPDATE + 1 batch INSERT for items. With indexes, this is **fine** at 1M orders and 5M order_items.

### Cart
- **addItem:** getOrCreateCart → get product → `getApplicableOffersForProduct` + `getApplicableMerchantOffersForProduct` (in parallel) → upsert cart_items. Multiple DB and optional offer lookups per add; **acceptable** for tens of concurrent users, can add up under 50 concurrent checkouts.

### Shipment (LogesTechs)
- **Create shipment:** Called synchronously in request path (e.g. after payment or explicit create). 20 s timeout. Under **50 concurrent checkouts** that trigger shipment, 50 concurrent external calls can exhaust timeouts and slow the whole instance.

### Verdict (orders)
- **1,000 orders/day:** Order and order_items volume and current indexes are **supportable**.
- **50 concurrent checkouts:** Possible only if shipment (and payment) are not all synchronous in the same moment; otherwise timeouts and failures will increase. Moving shipment (and optionally payment callbacks) to a queue/worker would be required for robust behavior at that concurrency.

---

## 6. Frontend Performance

### React architecture
- **Code splitting:** Main views (PublicWebsite, PublicCatalog, CustomerView, MerchantView, AdminView, ProfileView, PublicProductDetails) are lazy-loaded; reduces initial bundle.
- **State:** Large state in `App.tsx`; no global store (e.g. Redux). `marketStore` + `db.products` hold product list in memory (small today: 24–100 items).
- **Lists:** Product grids use `.map()` without virtualization. With **12–24 items per page** (PAGE_SIZE 12, data set 24), this is fine. If the client ever held thousands of products, **virtualization** would be needed.
- **Bundle:** Single main chunk (~605 KB minified reported in audit); no route-level vendor splitting. Large deps (e.g. Recharts, Lucide) can bloat the bundle; no bundle analysis in repo.

### At scale (if catalog showed many products)
- If the frontend were to request and render many pages (e.g. infinite scroll with 100s of products in DOM), **virtualization** (e.g. react-window) would be needed to keep the UI responsive.
- **Lazy loading:** Already in place for views; images use `loading="lazy"` in some components.

### Verdict (frontend)
- **Current catalog (24–100 products):** UI remains responsive; no change required for current behavior.
- **Large catalogs (thousands in memory/DOM):** Would require server-driven pagination, optional virtualization, and controlled client-side state to avoid jank and high memory.

---

## 7. Infrastructure (Current vs Required)

### Current (inferred)
- **App:** Single Node process (e.g. one Render dyno).
- **Database:** Supabase (PostgreSQL); plan limits apply (connections, compute, storage).
- **Cache:** Optional Redis (`REDIS_URL`); otherwise in-memory (single instance).
- **CDN:** Not mandated; static can be served from same host or separate host.
- **Load balancing:** Not in place (single instance).

### For target scale (1,000 merchants, 10M products, 50K daily visitors, 1K orders/day, 100 concurrent catalog, 50 concurrent checkouts)
- **Backend:** Multiple app instances (e.g. 2–4) behind a load balancer; shared Redis for rate limit and cache; async/queue for shipment (and optionally payment) to avoid blocking requests.
- **Database:** Supabase tier with enough connections and CPU; composite index on `products(is_active, status, created_at DESC)`; cursor pagination and possibly read replica for catalog reads.
- **Search:** Full-text (Postgres) or external (e.g. Elasticsearch/Meilisearch) for product search at 10M rows.
- **CDN:** For static assets and, if applicable, cached list/search responses.
- **Monitoring:** APM and alerts on DB, external APIs, and queue depth.

---

## 8. Current System Capacity (Estimate)

| Metric | Conservative estimate | Notes |
|--------|------------------------|--------|
| **Merchants supported** | 50–200 | Limited by single instance and DB; no multi-tenant optimizations. |
| **Products supported** | 1,000–10,000 | Catalog list and search slow above this without index and pagination changes; frontend only uses 24–100 per load. |
| **Daily visitors** | 2,000–5,000 | Rate limits and single instance; 50K would require scaling and Redis. |
| **Concurrent users (catalog)** | 30–80 | Before latency and 429s increase; product list and cache hit rate matter. |
| **Concurrent checkouts** | 10–20 | Shipment (and payment) in request path; 50 concurrent would need queue/workers. |
| **Orders per day** | 200–500 | DB and single instance; 1K/day possible with more instances and async shipment. |

---

## 9. Required Changes for Large Scale

To approach:

- **1,000 merchants**
- **10,000,000 products**
- **100,000 daily visitors**
- **10,000 orders/day**

the following are **required** (no code written here; analysis only):

1. **Backend**
   - Multiple app instances behind a load balancer.
   - Redis for rate limit and cache (already supported when `REDIS_URL` is set).
   - Async/queue for LogesTechs (and optionally payment) so request path does not wait on external APIs.
   - Stricter timeouts and circuit breakers for external calls.

2. **Database**
   - Composite index on `products(is_active, status, created_at DESC)` (or equivalent) for catalog list.
   - Cursor/keyset pagination for product and order lists (no large `OFFSET`).
   - Full-text or external search for product search at 10M rows.
   - Consider read replica for catalog reads; connection pooling tuned to plan.

3. **API / catalog**
   - Catalog API: server-side filtering, sort, and search with cursor pagination; no “return default 24 and let client filter.”
   - Frontend: remove “load all then filter locally”; use paginated, server-filtered list and optional infinite scroll with virtualization.

4. **Merchant**
   - Optional: batch or bulk product import API and/or queue for large uploads to smooth load.

5. **Infrastructure**
   - Supabase (or DB) tier sufficient for 10M products and 1M+ orders (connections, CPU, storage).
   - CDN for static and optionally for cached list/search.
   - Monitoring and alerting on DB, API latency, and queue depth.

---

## 10. Final Verdict

### Scalability score: **4/10** (for the target scenario)

- **Reasons:**
  - Single instance and no horizontal scaling.
  - Catalog is effectively limited to 24–100 products by current frontend and API usage; no path to 10M products without redesign.
  - Product list and search at 10M rows would be slow (missing index, offset pagination, `ilike` search).
  - Shipment (and payment) in request path limit concurrent checkouts and resilience.
  - No queue, no read replica, no full-text/external search.

### What would be needed to reach **10/10** (for the same target)

1. **Horizontal scaling:** Multiple app instances, load balancer, shared Redis.
2. **Database:** Composite index on products for catalog, cursor pagination, full-text or external search; optional read replica and partitioning for very large tables.
3. **Catalog:** Server-side filtering, sort, search, and cursor pagination; frontend consumes paginated API only (no “load all then filter”).
4. **Async operations:** Shipment (and optionally payment) via queue/workers; no long-running external calls in request path.
5. **Frontend:** Virtualization for long lists if needed; bundle and state tuned for large catalogs.
6. **Infrastructure:** DB tier and CDN sized for 10M products and 100K daily visitors; monitoring and alerting in place.

---

*End of Scalability & Capacity Analysis. No code or schema was modified.*
