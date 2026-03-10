# Palma Marketplace – Full Codebase Engineering Audit Report

**Date:** February 2026  
**Scope:** Frontend (React/TypeScript/Vite), Backend (Node.js/Express), state, API, security, performance, maintainability, and production readiness.

---

## 1. Clean Code Evaluation

### Strengths

- **Single responsibility in API layer:** `api/client.ts` centralizes base URL, auth headers, and JSON handling with clear comments.
- **Reusable UI:** `ConfirmModal`, `ToastProvider`, and `ProductConditionBadge` are shared; `React.memo` used on some list items (e.g. `CategoryPill`, `ShopProductCard`).
- **Consistent naming in backend:** Controllers call services; route files are named by domain (e.g. `productRoutes`, `authRoutes`).
- **Centralized translations:** `translations.ts` holds ar/en/he; keys are structured (common, auth, cart, etc.).

### Issues

| Issue                    | Location                                                                                                                                                                                          | Severity |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------- | ---- |
| **Duplicated logic**     | Many services use raw `fetch(getApiBase() + path, { ...getAuthHeaders(), credentials: 'include' })` and manual `res.json().catch(() => ({}))` instead of the shared `api()` in `api/client.ts`.   | Medium   |
| **Oversized components** | `CustomerView.tsx` (~1,340 lines), `MerchantView.tsx` (~1,110), `AdminView.tsx` (~1,047), `translations.ts` (~1,250), `RegisterMerchant.tsx` (~570), `CheckoutPage.tsx` (~606), `App.tsx` (~538). | High     |
| **Inline modals**        | Multiple “fixed inset-0” modal implementations in AdminView (delete user, delete product), MerchantView, CustomerView (checkout, cancel order) instead of a single modal primitive.               | Medium   |
| **Mixed API call style** | Some code uses `api()` from client; other code uses direct `fetch` with repeated patterns.                                                                                                        | Medium   |
| **Weak fallback**        | `CustomerView.tsx`: `user.password                                                                                                                                                                |          | 'password'` passed to shipment cancellation – unsafe default. | High |
| **Naming clarity**       | Generally good (PascalCase components, camelCase services). Some generic names (`handleInputChange`, `handleCityChange`) are clear only in context.                                               | Low      |

**Clean Code Score:** **6/10** – Good base and reuse in places; hurt by very large views, duplicated fetch logic, and a few unsafe patterns.

---

## 2. Architecture Review

### Frontend

- **Entry:** `index.html` → `index.tsx` → `App.tsx`.
- **Routing:** Hash-based only (`#/`, `#/catalog`, `#/product/:id`, `#/dashboard`, etc.). No React Router; `App.tsx` parses hash and sets `publicState` / `currentView` to choose what to render.
- **Layers:**
  - **UI:** `components/`, `views/` (presentation and page-level).
  - **State / orchestration:** `store.ts` (facade over services + `db`), `useCart`, `authService` + `user` in App.
  - **Data / API:** `services/*` (productService, authService, checkoutApi, adminApi, etc.), `api/client.ts`.
- **Modularity:** Services are split by domain (auth, product, order, cart, admin, broker, etc.). `store.ts` exists for backward compatibility; newer code can import services directly.

### Backend

- **Entry:** `server/server.js` (Express, ESM).
- **Layers:**
  - **Routes:** `server/routes/*` – mount under `/api/*` and delegate to controllers.
  - **Controllers:** `server/controllers/*` – validate request, call services, set status and JSON.
  - **Services:** `server/services/*` – business logic, Supabase, JWT, email, payments.
  - **Middleware:** auth (JWT from cookie or Bearer), requireRole, cache (product list), rate limit, helmet, CORS, error handler.
- **Database:** Supabase (PostgreSQL). Config in `server/config/supabaseClient.js`; no ORM.

### Separation of Concerns

- **UI vs logic:** Business logic lives in services and store; views still contain a lot of local state and handlers (especially in the large views).
- **Data layer:** Backend clearly separates controllers from services; frontend mixes data fetching inside views and in services.
- **Scalability:** Adding new features (e.g. new role, new API) is straightforward (new route + controller + service). Large monolithic views will become harder to extend.

**Architecture Score:** **7/10** – Clear backend layering and service-oriented frontend; routing and oversized views limit scalability.

---

## 3. Maintainability

### Positives

- **Structured repo:** Frontend at root, backend in `server/`; config files (Vite, Tailwind, Cypress) at root.
- **Documentation:** `docs/`, `server/README.md`, and various markdown files describe flows and deployment.
- **Types:** TypeScript on frontend with shared `types.ts`; backend is JavaScript with JSDoc in places.
- **i18n:** Single `translations.ts` with ar/en/he makes copy changes predictable.

### Challenges

- **Tightly coupled views:** CustomerView, MerchantView, and AdminView each handle routing state, API calls, forms, modals, and table logic in one file – hard to change one flow without touching many lines.
- **Implicit contracts:** Hash routing and `currentView`/`publicState` are not declared in one place; new developers must trace `App.tsx` and `routes.ts` to understand navigation.
- **Technical debt:** Token in both cookie and localStorage/sessionStorage (documented but adds complexity). No app-level Error Boundary. Inconsistent use of shared `api()`.
- **Testing:** Cypress present; no clear unit test suite for services or critical UI. Mock data and env (e.g. FLASHLINE mock credentials) need to be understood for tests.

**Maintainability Score:** **5/10** – Structure and i18n help; large views and implicit routing increase onboarding and change cost.

---

## 4. Scalability

### Can the system grow?

| Dimension         | Assessment                                                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **More users**    | Backend is stateless (JWT, Supabase). Horizontal scaling of Node is possible. Product list cache is in-memory (NodeCache) – would need a shared cache (e.g. Redis) for multiple instances. Rate limiting and helmet are in place. |
| **More features** | New routes and services are easy to add. Large views will need to be split (e.g. checkout flow, admin tabs) to avoid a single 1k+ line file per area.                                                                             |
| **More services** | Pattern of route → controller → service is repeatable. No service mesh or shared discovery; each service is called explicitly.                                                                                                    |

### Bottlenecks

- **Single product-list cache:** In-memory; not shared across instances; invalidated on product mutations (good) but not distributed.
- **Monolithic views:** Adding new tabs or steps in CustomerView/MerchantView/AdminView increases file size and merge conflicts.
- **No CDN/cache strategy for static assets** documented in code (Vite build outputs to `dist`; deployment may add CDN).
- **Hash routing:** Works but limits deep linking and SEO compared to server-side or history-based routing.

**Scalability Score:** **6/10** – Backend and API design support growth; in-memory cache and very large components are the main limits.

---

## 5. Performance

### Current behavior

- **Code splitting:** Main views (PublicWebsite, PublicCatalog, CustomerView, MerchantView, AdminView, ProfileView, PublicProductDetails) loaded via `React.lazy` with `<Suspense fallback={<PageLoader />}>`.
- **Prefetch:** `prefetch.ts` preloads lazy chunks and some API data (e.g. product by id, orders) on hover/tab or after login; avoids duplicate prefetches with a Set.
- **Backend cache:** GET `/api/products` cached 600s via `cacheMiddleware`; invalidated on product create/update/delete. Merchant-specific product paths are not cached.
- **Frontend cache:** `productService.getAll()` and store update in-memory `db.products`; no HTTP cache layer or service worker in code.

### Concerns

- **Unnecessary re-renders:** No project-wide audit of `useMemo`/`useCallback`/`React.memo`; large views with many state updates may re-render often.
- **Duplicate requests:** Possible if multiple components call the same API without a shared cache or hook (e.g. product by id).
- **Heavy initial bundle:** `translations.ts` is large (~1,250 lines); could be split by locale or lazy-loaded.
- **No image optimization** in code (e.g. responsive images, lazy loading beyond native `loading="lazy"`).

**Performance Score:** **6/10** – Lazy loading and prefetch help; caching and render optimization could be improved.

---

## 6. Security

### Authentication

- **Backend:** JWT in httpOnly cookie (primary) and support for `Authorization: Bearer` (e.g. mobile/cross-origin). `authMiddleware` verifies token; `requireRole()` enforces RBAC.
- **Frontend:** Token also stored in `localStorage` and `sessionStorage` under `palma_token` and sent as Bearer when needed. Documented for cross-origin; increases XSS impact if a script reads storage.

### Secrets and configuration

- **Backend:** No hardcoded secrets; `server/config/env.js` and `getEnv()`; JWT, Supabase, Cybersource, etc. from env.
- **Frontend:** `VITE_*` for Supabase, Cloudinary, API URL. Mock FLASHLINE credentials in `config/env.ts` (documented as test). Cypress fallback passwords only when env not set.

### Input and output

- **Backend:** `server/security/sanitize.js` (sanitizeString, sanitizeObject); Supabase used with parameterized queries. Rate limits on auth, payment, comment. Error messages sanitized for users (e.g. `userFacingError.js`).
- **Frontend:** No centralized input sanitization; validation is per form. User-generated content (e.g. product description) rendered in React (default escaping helps).

### Vulnerabilities and risks

- **Token in localStorage/sessionStorage:** If XSS occurs, token can be stolen. Prefer httpOnly cookie only where possible, or document and accept the risk for cross-origin.
- **Weak fallback:** `user.password || 'password'` in CustomerView for shipment cancellation – should be removed or replaced with a secure flow (e.g. re-auth, token, or backend-only action).
- **No CSRF** mentioned in code for state-changing operations; reliance on SameSite cookies and CORS reduces but does not eliminate risk for cookie-based auth.

**Security Score:** **6/10** – Solid auth and env handling; token storage and one unsafe fallback lower the score.

---

## 7. Best Practices

### React

- **Strengths:** Functional components, hooks, lazy + Suspense, some `React.memo`. Context used sparingly (ToastProvider).
- **Gaps:** No Error Boundary. Large components could use more composition and custom hooks. Prop drilling in deep trees (e.g. Layout → views).

### TypeScript

- **Strengths:** Typed props, shared types in `types.ts`, typed API responses in places.
- **Gaps:** Some `any` or type assertions (`as Record<string, string>`). Backend is JavaScript; no shared API types between frontend and backend.

### Node.js / Express

- **Strengths:** Async/await, centralized error handler, middleware pipeline, env-based config.
- **Gaps:** No request ID or structured logging in all paths. Uncaught exception/rejection lead to `process.exit(1)` (good for avoiding undefined state but no graceful shutdown).

**Best Practices Score:** **6/10** – Aligned with common practices; missing Error Boundary, stricter typing, and some operational patterns.

---

## 8. Refactoring Opportunities

| Priority | File(s)                                        | Recommendation                                                                                                                           |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------------------------------------------------------------- |
| 1        | `views/CustomerView.tsx`                       | Split into: Shop tab (with category UI), Cart tab, Orders tab, Checkout form. Extract hooks (e.g. `useCheckoutForm`, `useShippingData`). |
| 2        | `views/MerchantView.tsx`                       | Split by tab: Products (list + form), Orders, Shipments, Invoices. Share product form in a dedicated component or view.                  |
| 3        | `views/AdminView.tsx`                          | Split by tab: Users, Products, Orders, Withdrawals, Platform. Reuse a single delete-confirmation modal.                                  |
| 4        | `views/CheckoutPage.tsx`                       | Extract steps into smaller components; consider a small state machine or reducer for checkout flow.                                      |
| 5        | `App.tsx`                                      | Extract hash parsing and view selection into a custom hook or small router module; keep App for composition and providers.               |
| 6        | `translations.ts`                              | Split by locale (ar.ts, en.ts, he.ts) or by domain (auth.ts, cart.ts, …) and re-export; optionally lazy-load by locale.                  |
| 7        | Services (auth, user, product, adminApi, etc.) | Standardize on `api()` from `api/client.ts` for all backend calls; remove duplicated fetch/JSON handling.                                |
| 8        | Modals                                         | Introduce a single `Modal` or `ConfirmDialog` primitive and use it for all delete/confirm flows (admin, merchant, customer).             |
| 9        | `store.ts`                                     | Document as compatibility layer; gradually replace direct `marketStore` usage with service imports and hooks where it makes sense.       |
| 10       | `CustomerView` shipment cancellation           | Remove `user.password                                                                                                                    |     | 'password'`; implement secure cancellation (e.g. re-auth, or backend-only with no password). |

---

## 9. Production Readiness

### Ready

- Env-based config (no hardcoded secrets in backend).
- HTTPS and security headers (helmet) in production.
- Rate limiting on sensitive routes.
- Error responses sanitized for users.
- Lazy loading and prefetch for frontend.
- Product list cache and invalidation on mutations.
- Health/readiness endpoints possible (e.g. `/` or dedicated route).

### Gaps and risks

- **No React Error Boundary:** A single uncaught render error can blank the app.
- **Token in localStorage/sessionStorage:** XSS could steal tokens; document or restrict.
- **In-memory product cache:** Not shared across backend instances; consider Redis (or similar) for multi-instance deployment.
- **Large bundle risk:** No analysis of bundle size or tree-shaking in report; `translations.ts` and heavy deps could grow.
- **No graceful shutdown** in server (e.g. drain connections, flush logs).
- **Weak fallback** (`user.password || 'password'`) must be removed before production.

**Production Readiness:** **6/10** – Deployable with care; the items above should be addressed for a higher bar.

---

## 10. Final Scores

| Category            | Score (1–10) | Notes                                                                         |
| ------------------- | ------------ | ----------------------------------------------------------------------------- |
| **Code Quality**    | 6            | Good reuse and structure in places; large files and duplicated fetch logic.   |
| **Architecture**    | 7            | Clear backend layers; frontend routing and oversized views limit clarity.     |
| **Scalability**     | 6            | Stateless backend and service pattern help; cache and view size are limits.   |
| **Maintainability** | 5            | Structure and i18n help; large views and implicit routing increase cost.      |
| **Performance**     | 6            | Lazy loading and prefetch; cache and render optimization can improve.         |
| **Security**        | 6            | Solid auth and env; token storage and one unsafe fallback.                    |
| **Best Practices**  | 6            | Aligned with React/TS/Node norms; missing Error Boundary and stricter typing. |

**Overall (average):** **6.0/10**

---

## Top 10 Action Plan for Production-Grade System

1. **Add a React Error Boundary**  
   Wrap the app (or main route tree) in an Error Boundary; show a friendly message and optional recovery instead of a blank screen.

2. **Remove unsafe password fallback**  
   In `CustomerView`, remove `user.password || 'password'` for shipment cancellation; use a secure flow (re-auth, backend-only action, or token).

3. **Split the three largest views**  
   Break CustomerView, MerchantView, and AdminView into smaller components and/or tabs (e.g. one file per tab, shared hooks and modals).

4. **Unify API calls on the frontend**  
   Use `api()` from `api/client.ts` everywhere; refactor services that use raw `fetch` to go through this client (and optionally add retries/logging).

5. **Introduce a single modal primitive**  
   Implement one `Modal`/`ConfirmDialog` and use it for all delete and confirm flows to reduce duplication and improve consistency.

6. **Document or reduce token storage**  
   Either document the rationale and risk of storing JWT in localStorage/sessionStorage (e.g. for mobile/cross-origin) or move to cookie-only where possible and use a separate mechanism for mobile.

7. **Add shared/distributed cache for product list**  
   If running multiple backend instances, replace in-memory product cache with a shared store (e.g. Redis) and use it in `cacheMiddleware`/invalidation.

8. **Extract routing into a small module**  
   Move hash parsing and view selection from `App.tsx` into a `useHashRouter()` (or similar) and keep route-to-view mapping in one place for easier onboarding and changes.

9. **Split or lazy-load translations**  
   Split `translations.ts` by locale or domain and/or lazy-load by language to reduce initial bundle and improve maintainability.

10. **Add health and readiness endpoints**  
    Expose `/health` and `/ready` (or use existing `/`) that check DB and critical deps; use them for load balancers and orchestration.

---

_End of Engineering Audit Report._
