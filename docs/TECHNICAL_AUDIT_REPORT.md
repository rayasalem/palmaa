# Palma Marketplace — Full Technical Audit Report

**Date:** March 2025  
**Scope:** Code quality, stability, performance, scalability, database, security, Flashline integration, deployment readiness, load handling.

---

## 1. Code Quality

### Structure
- **Frontend:** React 18 + TypeScript, Vite, Tailwind. Root-level `components/`, `views/`, `services/`, `api/`, `store.ts`, `hooks/`. No `src/` folder; entry is `index.html` + `index.tsx`.
- **Backend:** Express in `server/`, plain JavaScript (not compiled by TS). Structure: `config/`, `controllers/`, `middlewares/`, `routes/`, `services/`, `validation/`, `utils/`.
- **Build:** Frontend: `vite build` → `dist/`. Backend: no build step for server JS; `build:for-render` copies `dist` into `server/public` for SPA serve.

### React + TypeScript
- **Positives:** Functional components, `lazy()` + `Suspense` for code splitting (PublicWebsite, PublicCatalog, CustomerView, MerchantView, AdminView, ProfileView, PublicProductDetails). Typed `types.ts`, API client in `api/client.ts`.
- **Issues:**
  - **Tailwind content:** `tailwind.config.js` includes `./src/**/*` but the project has no `src/` directory; styles still work because `./components/**`, `./views/**`, `./*.{js,ts,jsx,tsx}` cover the app. Consider removing `./src/**` to avoid confusion.
  - **Store facade:** `store.ts` (marketStore) mixes in-memory `db` with API calls; some components use `marketStore.getProducts()` (sync) while data is filled by `productService.getAll()`. This can cause stale or empty UI until async load completes. Prefer using API/context directly.
  - **Type safety:** Occasional `(user as any).companyName` in `store.ts`; some `(p as any).final_price` in views. Prefer proper interfaces.
  - **Duplicate logic:** Auth/session handling spread across App, authService, and api client; cart logic in both `useCart` and local cart state.

### Duplication & anti-patterns
- **Duplication:** Similar offer cards in PublicCatalog and CustomerShopTab; product card rendering repeated in several views. Consider shared `ProductCard` and `OfferCard` components.
- **Large components:** `App.tsx` and `PublicCatalog.tsx` are very large (1000+ and 1300+ lines). Splitting by route/feature would improve maintainability.
- **Prop drilling:** Deep prop passing (e.g. `lang`, `t`, `onViewProduct`) through multiple layers; a few context providers exist (Toast, Auth implied via state) but no global i18n or navigation context.

### Unsafe / runtime risk
- **Optional chaining:** Used in many places; good. Some `.payload` or nested access without guards could throw if API shape changes (e.g. `giveFreely.tsx` payload mentioned in past issues).
- **Backend:** `orderService` and cart/offer services use `Number(it.final_price ?? it.price)` and null checks; no `(as any)` in server (fixed previously). Service code is defensive with `|| []`, `|| null`.
- **Env fallback:** Server copies `VITE_SUPABASE_ANON_KEY` to `SUPABASE_SERVICE_KEY` when service key is missing—dangerous if anon key is used as service role in production. Document that `SUPABASE_SERVICE_KEY` must be set on server.

---

## 2. Stability

### UI
- **Error boundary:** `index.tsx` wraps the app in `ErrorBoundary`; it catches render errors and shows a fallback with a refresh button. Prevents full blank page from a single component throw.
- **Lazy loading:** All major views are lazy-loaded; if a chunk fails to load, the error can bubble to the boundary. No explicit retry or fallback for chunk load failures.
- **Suspense:** `PageLoader` used as fallback; no timeout or error state for slow chunks.
- **State:** Many `useState` in `App.tsx`; a single `setState` that throws (e.g. in a callback with wrong type) could still be caught by the boundary. No obvious infinite loops found in reviewed code.

### Backend
- **Process:** `uncaughtException` and `unhandledRejection` in `server.js` log and call `process.exit(1)`. Prevents silent hangs but any unhandled rejection kills the process (e.g. missing await in a route).
- **Validation:** Joi used on key routes (admin, orders, products, etc.); invalid body/query can return 400 without crashing.
- **DB:** Supabase client used with `.single()`, `.maybeSingle()`; code checks `error` and handles null. Missing env (e.g. no Supabase URL) causes routes to fail at runtime; `validateEnv()` only requires `JWT_SECRET` and warns on missing Supabase.

### Blank page / fatal scenarios
- **Blank page:** Possible if (1) root ErrorBoundary catches and fallback fails to render, (2) critical JS chunk fails to load (network), (3) auth/init logic throws before first paint. Current setup with one global boundary is acceptable; adding chunk error handling would improve robustness.
- **Backend fatal:** Unhandled rejection in middleware or in a route without try/catch can exit the process. Recommendation: ensure all async route handlers are wrapped or use a catch-all async wrapper.

---

## 3. Performance

### Rendering
- **Re-renders:** `App.tsx` holds a large state; any state change re-renders the whole tree. No React.memo on heavy children; no useMemo/useCallback on all list renderers. Customer/Merchant/Admin views receive many props and may re-render often.
- **Lists:** Product grids and offer lists often use `.map()` without virtualization. For 100+ products in one view this can be heavy; consider virtualized lists for large catalogs.
- **Code splitting:** Good use of `lazy()` for main views; reduces initial bundle. No route-based splitting beyond current chunks.

### Bundles
- **Vite:** Single entry; no manual vendor splitting. Recharts, Lucide, and Supabase client are likely in main or shared chunk. `build.sourcemap: false` keeps build smaller.
- **No analysis:** No `rollup-plugin-visualizer` or bundle report in the repo; recommend adding to detect large dependencies.

### Images & API
- **Images:** Some `loading="lazy"` on product images; not everywhere. No explicit image sizing or srcset; CDN/Cloudinary usage depends on env.
- **API:** Products list can return many rows; backend uses `parsePagination` (limit default 24–100). Caching: products 600s, offers 60s via cache middleware. No request deduplication on frontend for same product/list.
- **State:** Product list stored in memory (marketStore/db.products); refetches on focus in PublicWebsite. Cart uses hook + API; no obvious over-fetch.

---

## 4. Scalability

### User capacity (rough)
- **Backend:** Single Node process; no clustering. With 1 process, typical Express + Supabase can handle hundreds of concurrent requests depending on DB and external APIs (payment, shipment).
- **Database:** Supabase (Postgres); connection pool and plan limits apply. All access is via single Supabase client; no connection pooling configuration visible in repo.
- **Bottlenecks:** (1) Single server instance, (2) no Redis/session store (in-memory only), (3) heavy product list endpoints without cursor pagination on very large tables, (4) LogesTechs/shipment API synchronous in request path.

### Database
- **Indexes:** `setup.sql` and `010_add_performance_indexes.sql` add indexes on users (role, status, email), products (merchant_id, category, is_active, status), orders (customer_id, merchant_id, created_at, delivery_id), order_items (order_id, product_id), carts (user_id), cart_items (cart_id, product_id), notifications, etc. Good for common filters and joins.
- **Tables:** No partitioning; no read replicas. For “thousands of users” and growing orders/products, consider (1) cursor-based pagination everywhere, (2) archiving old orders, (3) read replicas if Supabase plan allows.

### Supabase
- **Tables and relations:** users (UUID), merchant_profiles (user_id FK), products (TEXT id, merchant_id UUID), orders (TEXT id, customer_id, merchant_id UUID), order_items (order_id, product_id), carts (UUID, user_id), cart_items (cart_id, product_id), shipments handled via orders.delivery_id and external API. Relations are consistent (FKs and indexes).
- **Optimization:** Ensure migration 010 (and add_indexes_safe if used) is applied. Consider composite indexes for frequent filters (e.g. orders by status + created_at).

---

## 5. Database

### Schema
- **users:** UUID id, email, name, role, status, password, verification fields, subscription fields, deleted_at. Consistent.
- **merchant_profiles:** user_id UUID FK, business details. One-to-one with users.
- **products:** id TEXT (PRD-xxx), merchant_id UUID FK. name, price_ils, price, category, stock, status, images, discount fields, condition, etc.
- **orders:** id TEXT (ORD-xxx), customer_id, merchant_id UUID, total_amount, status, shipping_*, delivery_id, order_reference (ORD-8hex), guest_access_token UUID, destination_city_id, destination_village_id, etc.
- **order_items:** id TEXT (ITM-xxx), order_id TEXT FK, product_id TEXT FK, quantity, price.
- **carts:** id UUID, user_id UUID UNIQUE.
- **cart_items:** cart_id UUID FK, product_id TEXT FK, quantity, price, UNIQUE(cart_id, product_id).
- **Shipments:** No dedicated shipments table; delivery_id and delivery_status on orders; external LogesTechs API.

### Relations
- users ↔ merchant_profiles: 1:1.
- users ↔ orders: 1:N (customer_id, merchant_id).
- orders ↔ order_items: 1:N.
- products ↔ order_items: 1:N.
- users ↔ carts: 1:1.
- carts ↔ cart_items: 1:N.
- products ↔ cart_items: N:1.

All FKs and indexes align with these.

### Type consistency
- **UUID vs TEXT:** users.id, carts.id, cart_items.id are UUID; products.id, orders.id, order_items.id are TEXT (prefix + short id). Backend uses `isUuid()` and `order_reference` for order lookup; no mismatch in current code.
- **order_reference:** Migration 013 adds order_reference; orderService creates ORD-xxxxxxxx and updates it. Code supports both UUID and ORD-xxx for getOrderById.

### Suggested indexes
- Already present for main access paths. If you add analytics or admin filters (e.g. orders by date range + status), add composite indexes for those queries. Consider index on orders(created_at DESC) if not covered.

---

## 6. Security

### RLS
- **Tables:** RLS is **disabled** on all main tables (users, products, orders, order_items, merchant_profiles, carts, cart_items, etc.). Comment in setup: “Custom Auth via Table.” Access control is enforced in the backend (JWT + role checks). This is a valid pattern when the API is the only entry point to Postgres; ensure no direct Supabase client is used from the frontend with service role or with anon key against tables that should be restricted.
- **Storage:** RLS/policies on storage.objects for buckets `products` and `profiles`: public read, authenticated insert. Reasonable for public product images and profile images.

### Secrets
- **Frontend .env.example:** Contains `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public by design), `VITE_CLOUDINARY_*`, `VITE_SENDGRID_API_KEY`, `VITE_SENDER_EMAIL`, `VITE_FLASHLINE_API_URL`, `VITE_API_URL`. Sending SendGrid from the browser is explicitly warned (CORS/proxy). No backend secrets in frontend example.
- **Server:** JWT_SECRET, SUPABASE_SERVICE_KEY, COOKIE_SECRET, payment/shipment credentials in server env. validateEnv() requires JWT_SECRET; Supabase is optional with warning. Ensure production sets SUPABASE_SERVICE_KEY (not anon key) and never commits .env.

### Environment
- **Server:** Reads PALMA_ENV_FILE, then `../.env`, then `server/.env` (override: false). No secrets in repo; .env.example documents variables. Good.

---

## 7. Flashline (LogesTechs) Integration

### Logic
- **Service:** `server/services/shipmentService.js` uses LogesTechs API (SHIPMENT_API_BASE, company-id, email/password from env). getOrderById supports UUID and ORD-xxx. buildShipmentPayload builds destination/origin, COD, weight, etc. from order + request body.
- **Controller:** `shipmentController.js` validates orderId, recipient_name, addressLine1, cityId, villageId, phone, weight, cod, quantity; checks order access (customer/merchant/ADMIN); calls service; updates order with delivery_id and delivery_status.

### Payload
- **Structure:** destinationAddress (addressLine1, cityId, villageId, regionId), originAddress, pkg (cod, notes, invoiceNumber, sender/receiver names and phones), email/password for API auth. Matches Postman/docs. Optional toCollectFromReceiver for SWAP/BRING.

### Error handling
- **API errors:** Axios errors caught; response message or err.message returned; logged with logger. Service returns `{ data: null, error: { message } }`.
- **Missing credentials:** logConfigStatus() logs at startup if LOGESTECHS_EMAIL/PASSWORD missing; create still runs and will fail at API call with clear error. No crash.
- **Timeouts:** 20000 ms on axios. Good.

---

## 8. Deployment Readiness

### Production
- **Server:** Helmet, CORS (allowed origins list + FRONTEND_URL), compression, cookie parser, JSON limit 15mb, rate limiters (general, payment, cart), request timeout (15s default), error handler, sanitize error response. Health and /api/status before general limiter. Static serves server/public (and copy of dist when using build:for-render). Good for production.
- **Frontend:** Build outputs to dist; no CDN or env-specific base URLs in audit; VITE_API_URL and VITE_SUPABASE_* are build-time. Suitable for deployment behind same host or separate CDN.

### Environment
- **Required:** JWT_SECRET (enforced). Supabase (warned if missing). FRONTEND_URL used for CORS.
- **Optional but recommended:** SUPABASE_URL, SUPABASE_SERVICE_KEY, FRONTEND_URL, ENCRYPTION_KEY, REDIS_URL. Production checklist should include these.
- **Missing:** No single “deployment checklist” file; README and RUN_AND_DEPLOY / DEPLOY_COMMANDS mention env. Recommend a DEPLOYMENT.md with required and optional vars per environment.

### Tailwind
- **Setup:** tailwind.config.js in project root; content includes components, views, root tsx. PostCSS and Tailwind are in devDependencies; no CDN. Build uses Vite + PostCSS; Tailwind is compiled in build. No issue.

### CORS
- **Middleware:** corsMiddleware(FRONTEND_URL) allows a fixed list (palma.ps, palmaa.onrender.com, Vercel, localhost variants) plus any origin from FRONTEND_URL (comma-separated). Credentials true; methods and headers set. OPTIONS returns 204. Unlisted origins get the first allowed origin (could be wrong). Recommend logging rejected origins in dev and ensuring production FRONTEND_URL is set.

---

## 9. Load Handling

### 100 users
- **Estimate:** Comfortable. Single Node + Supabase free/small tier can handle 100 concurrent users for typical catalog, cart, and order flows. Rate limiters may kick in only under abuse.

### 1,000 users
- **Estimate:** Possible with one instance if traffic is spread; may see latency spikes on product list and order creation. DB connections and Supabase plan limits become relevant. Recommend (1) ensure indexes applied, (2) paginate all list endpoints, (3) consider horizontal scaling (multiple instances behind load balancer). Session: no shared store; each instance has its own memory; JWT is stateless so OK.

### 10,000 users
- **Estimate:** Single instance and single DB will be a bottleneck. Need (1) multiple app instances, (2) DB connection pooling / Supabase scaling, (3) Redis or similar for cache/session if needed, (4) CDN for static/frontend, (5) async or queue for shipment/payment callbacks where possible. Product and order list endpoints should use cursor pagination and strict limits.

### Bottlenecks
- **App:** Single process; no clustering.
- **DB:** All writes/reads through one Supabase client; connection pool size and Supabase plan.
- **External APIs:** Payment (Cybersource) and shipment (LogesTechs) called synchronously in request path; failures or slowness affect response time.
- **Frontend:** Large initial or lazy chunks; no service worker or aggressive caching beyond browser default.

---

## 10. Final Report

### Scores (1–10)

| Area         | Score | Notes                                                                 |
|-------------|-------|-----------------------------------------------------------------------|
| **Stability**   | 7/10  | Error boundary and process handlers in place; chunk/async errors could be better handled. |
| **Performance** | 6/10  | Code splitting good; re-renders and large lists not optimized; no bundle analysis.         |
| **Scalability**| 5/10  | Single instance, in-memory state; indexes and pagination help but no horizontal scaling.  |
| **Security**   | 7/10  | Env validation, CORS, Helmet, JWT; RLS off (backend-only access); document service key usage. |

### Critical issues
1. **SUPABASE_SERVICE_KEY vs anon key:** If server falls back to VITE_SUPABASE_ANON_KEY as service key, permissions and security are wrong. Always set SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in server env.
2. **Unhandled promise rejections:** Any unhandled rejection in server exits the process. Audit async routes and add a global async error wrapper or ensure try/catch in all async handlers.
3. **No dedicated shipments table:** Shipment state lives in orders; if LogesTechs is down or slow, order creation/update can be affected. Consider decoupling (e.g. background job or queue).

### Medium issues
1. **Large components:** Split App.tsx and PublicCatalog.tsx into smaller modules and route-level components.
2. **Tailwind content:** Remove or fix `./src/**` in tailwind.config.js (project has no src).
3. **marketStore sync/async mix:** Prefer direct API/context usage and deprecate sync getProducts() where it can show stale data.
4. **Frontend env:** Avoid using SendGrid from browser; use server or Edge for email.
5. **Chunk load errors:** Add error boundary or retry for lazy-loaded chunks.
6. **Bundle size:** Add rollup-plugin-visualizer (or similar) and trim heavy dependencies if needed.

### Recommended improvements
1. **Deployment:** Add DEPLOYMENT.md with required/optional env and steps for Render/Vercel.
2. **Pagination:** Use cursor/keyset pagination for orders and products where applicable.
3. **Caching:** Consider Redis for product/offer cache if running multiple instances.
4. **Monitoring:** Add health checks and logging for shipment/payment failures; consider APM for production.
5. **Tests:** Increase coverage for order, cart, and payment flows; add integration tests for critical paths.
6. **Types:** Replace remaining `as any` with proper types; ensure server and client share DTOs where useful (e.g. order shape).

---

*End of Technical Audit Report*
