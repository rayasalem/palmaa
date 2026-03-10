# Post-Refactor Audit Report — Palma Marketplace

**Audit type:** Read-only, no production file modifications  
**Scope:** Code cleanliness, file/line metrics, validation & security, performance & scalability, observability  
**Date:** Post-refactor snapshot

---

## 1. Code Cleanliness

### 1.1 Unused Imports, Variables, and Dead Code

| Area         | Status           | Notes                                                                                                                                                     |
| ------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**  | Manual scan only | No automated dead-code scan was run. Recommendation: run ESLint with `no-unused-vars` and optional `eslint-plugin-unused-imports` to flag unused imports. |
| **Frontend** | Manual scan only | Same; TypeScript may report unused locals. No automated scan performed in this audit.                                                                     |

**Recommendation:** Add or run `npm run lint` with rules for unused variables/imports; fix reported issues incrementally.

### 1.2 Large Files (>500 Lines)

| File                                     | Lines    | Suggestion                                                                                                                               |
| ---------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **server/services/authService.js**       | **523**  | Split: registration/OTP flow, login/getUser, password reset, and optional “auth-utils” (e.g. normalizeRole).                             |
| **server/controllers/authController.js** | **371**  | Consider extracting MFA-related handlers and “getMe” into a small sub-module or grouping by domain (login vs register vs password).      |
| **server/services/shipmentService.js**   | **305**  | Consider splitting: create/status vs print/cancel vs external API (LogesTechs) adapter.                                                  |
| **views/AdminView.tsx**                  | **1001** | Already documented for split: lazy-loaded tabs (Users, Orders, Products, Treasury, Platform) per `views/admin/README.md`. High priority. |
| **translations.ts**                      | **1240** | Consider splitting by domain (auth, cart, admin, common) or locale files (ar.ts, en.ts) with lazy load.                                  |
| **components/PublicWebsite.tsx**         | **828**  | Consider extracting sections (hero, features, categories) into smaller components.                                                       |
| **App.tsx**                              | **786**  | Route tree and layout are large; consider extracting route config and layout components.                                                 |
| **views/CustomerView.tsx**               | **724**  | Tabs already lazy; file still large; consider extracting context and helpers.                                                            |
| **views/MerchantView.tsx**               | **693**  | Same as CustomerView.                                                                                                                    |
| **components/Auth.tsx**                  | **590**  | Consider splitting login form, register form, and forgot-password into separate components.                                              |
| **views/CheckoutPage.tsx**               | **580**  | Consider steps (address, payment, review) as separate components.                                                                        |

**Status:** Yellow — several files exceed 500 lines; refactor plan exists for AdminView and auth services.

### 1.3 Formatting and Naming Conventions

| Check                 | Status                     | Notes                                                                                                        |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Backend**           | Consistent                 | JS with ESM; camelCase for functions/vars; kebab-case for file names in some areas (e.g. auth/services).     |
| **Frontend**          | Consistent                 | PascalCase for components, camelCase for functions/hooks; TS/TSX.                                            |
| **Project standards** | Not codified in single doc | Recommend adding a short `.cursor/rules` or `CONTRIBUTING.md` with naming and format (e.g. Prettier/ESLint). |

**Status:** Green — no major inconsistencies observed; document standards for new contributors.

### 1.4 Duplicated Logic and Centralization

| Pattern                 | Location                            | Status                                                                                                                            |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **parsePagination**     | `server/utils/pagination.js`        | Centralized; used by orderService, productService, notificationService, admin/\*.                                                 |
| **getMerchantNamesMap** | `server/services/productService.js` | Local helper; could be shared if admin or other services need merchant names (admin already has its own in adminProductsService). |
| **Joi schemas**         | `server/validation/schemas.js`      | Centralized with `common` (uuid, email, password, etc.).                                                                          |
| **Rate limit handler**  | `server/middlewares/security.js`    | Single `createRateLimitHandler`; all limiters use it.                                                                             |
| **Frontend API client** | `api/client.ts`                     | Single `api()`, `getAuthHeaders()`, `mergeHeaders()` — good.                                                                      |

**Status:** Green — pagination, validation, and rate-limit logic are centralized. Minor duplication in merchant-name resolution (productService vs admin) is acceptable.

---

## 2. File & Line Metrics

### 2.1 Backend (server/) — Excluding node_modules and dist

| File                           | Lines   |
| ------------------------------ | ------- |
| authService.js                 | 523     |
| authController.js              | 371     |
| shipmentService.js             | 305     |
| productService.js              | 256     |
| cybersource.rest.service.js    | 220     |
| adminController.js             | 201     |
| paymentService.js              | 189     |
| validation/schemas.js          | 188     |
| orderController.js             | 180     |
| cybersource.rest.controller.js | 169     |
| subscriptionService.js         | 168     |
| orderService.js                | 164     |
| cartService.js                 | 164     |
| notificationService.js         | 163     |
| emailService.js                | 161     |
| shipmentController.js          | 160     |
| productController.js           | 157     |
| cybersourceClient.js           | 157     |
| cybersource.service.js         | 155     |
| server.js                      | 152     |
| metrics.js                     | 148     |
| transactionService.js          | 146     |
| paymentController.js           | 143     |
| addressService.js              | 134     |
| profitService.js               | 131     |
| mfaController.js               | 128     |
| security.js                    | 121     |
| cartController.js              | 118     |
| mfaService.js                  | 113     |
| cacheMiddleware.js             | 111     |
| sharedProductsService.js       | 97      |
| adminUsersService.js           | 96      |
| adminProductsService.js        | 89      |
| brokerController.js            | 86      |
| merchantController.js          | 86      |
| (others)                       | &lt; 86 |

**Total backend (approx.):** ~7,500+ lines (source only, excluding dist and auth/dist).

### 2.2 Frontend (views, components, api, hooks, services)

| File                     | Lines    |
| ------------------------ | -------- |
| translations.ts          | 1240     |
| AdminView.tsx            | 1001     |
| PublicWebsite.tsx        | 828      |
| App.tsx                  | 786      |
| CustomerView.tsx         | 724      |
| MerchantView.tsx         | 693      |
| Auth.tsx                 | 590      |
| CheckoutPage.tsx         | 580      |
| BrokerView.tsx           | 531      |
| RegisterMerchant.tsx     | 530      |
| PublicProductDetails.tsx | 471      |
| ProfileView.tsx          | 431      |
| PublicCatalog.tsx        | 406      |
| SupportChat.tsx          | 353      |
| RegisterCustomer.tsx     | 335      |
| Layout.tsx               | 306      |
| PublicProfileView.tsx    | 298      |
| (others)                 | &lt; 250 |

**Largest functions (by file size):** Not extracted in this audit; largest files are listed above. Recommend profiling or “function line count” in a follow-up if needed.

### 2.3 Files Exceeding Recommended Thresholds

| Threshold          | Backend                                                                                                   | Frontend                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **&gt; 500 lines** | authService (523), authController (371), shipmentService (305)                                            | AdminView (1001), translations (1240), PublicWebsite (828), App (786), CustomerView (724), MerchantView (693), Auth (590), CheckoutPage (580), BrokerView (531), RegisterMerchant (530), PublicProductDetails (471), ProfileView (431), PublicCatalog (406), SupportChat (353), RegisterCustomer (335), Layout (306), PublicProfileView (298) |
| **&gt; 300 lines** | productService, cybersource.rest.service, adminController, paymentService, schemas, orderController, etc. | Multiple (see above).                                                                                                                                                                                                                                                                                                                         |

**Modularization:** Prioritize AdminView (documented), authService/authController, and translations/PublicWebsite/App for incremental splits.

---

## 3. Validation & Security Checks

### 3.1 Joi Validation Coverage (Body/Query/Path)

| Route group         | Validated                                                                                                           | Not validated (or path-only)                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Auth**            | login, register, verify-email, forgot-password, reset-password, resend-verification                                 | ping, check-key, logout, logout-all, me (no body), mfa/status, mfa/disable  |
| **Orders**          | list (query), listMerchant (query), create (body)                                                                   | get/:id (path), cancel, invoice, complete (path/body as needed)             |
| **Cart**            | addItem (body), updateQuantity (body)                                                                               | get, removeItem, clearCart (path or no body)                                |
| **Products**        | list (query), create (body), update (body), comment add (body)                                                      | get/:id, listByMerchant, likes, remove (path)                               |
| **MFA**             | verify-setup (body), verify (body)                                                                                  | status, setup, disable                                                      |
| **Admin**           | listUsers, listOrders, listProducts (query); updateUserStatus, softDeleteUser, updateProduct, updateSettings (body) | restoreUser (no body), deleteProduct (path), getSettings, platform-earnings |
| **Address**         | —                                                                                                                   | get cities, get villages (query not validated)                              |
| **Shipment**        | —                                                                                                                   | create, status, print-pdf, cancel (body/params not validated with Joi)      |
| **Payment**         | —                                                                                                                   | create, callback, cybersource/charge (body not validated with Joi)          |
| **Notification**    | —                                                                                                                   | list (query?), markRead (path)                                              |
| **Follow**          | —                                                                                                                   | follow/unfollow (path :merchantId), getFollowersCount, getIsFollowing       |
| **Chat**            | —                                                                                                                   | POST / (body not validated with Joi)                                        |
| **Broker**          | —                                                                                                                   | shared-products CRUD (path/body not validated)                              |
| **Merchant**        | —                                                                                                                   | dashboard, :id/followers-count, :id/following, :id (path)                   |
| **Shared products** | —                                                                                                                   | list (query?)                                                               |

**Status:** Yellow — Auth, Orders, Cart, Products, MFA, and Admin have good Joi coverage; Address, Shipment, Payment, Notification, Follow, Chat, Broker, Merchant, and Shared products lack centralized Joi for body/query/path where applicable.

### 3.2 Redis-Backed Rate Limiters

| Endpoint / area         | Limiter            | Redis (getStore) |
| ----------------------- | ------------------ | ---------------- |
| General                 | generalLimiter     | Yes              |
| Auth (login, MFA, etc.) | authLimiter        | Yes              |
| Payment                 | paymentLimiter     | Yes              |
| Cart                    | cartLimiter        | Yes              |
| Products list           | productListLimiter | Yes              |
| Products by id          | productByIdLimiter | Yes              |
| Comments                | commentLimiter     | Yes              |

**Status:** Green — All listed limiters use `...getStore()` in `server/middlewares/security.js` when `REDIS_URL` is set.

### 3.3 Sensitive Routes: /auth/check-key

| Check            | Status                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| **Production**   | Returns 404 unless `ALLOW_AUTH_CHECK_KEY=true` (implemented in authRoutes.js). |
| **IP allowlist** | Not implemented; env flag only.                                                |

**Status:** Green — check-key is disabled in production by default. Optional: add IP allowlist for debugging environments.

### 3.4 CORS and SameSite

| Check               | Status                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **origin: true**    | Not used; server uses only `corsMiddleware(getEnv('FRONTEND_URL'))`.                                                   |
| **SameSite cookie** | Production: `sameSite: 'none'` (required for cross-origin Vercel↔Render); dev: `lax`. Secure and httpOnly set in prod. |

**Status:** Green — No CORS misconfiguration; cookie settings are appropriate for cross-origin setup.

---

## 4. Performance & Scalability

### 4.1 Heavy DB Queries and N+1

| Area                                  | Finding                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **productService.getActiveProducts**  | Products query + single batch for suspended users + getMerchantNamesMap (users + merchant_profiles in batch). No N+1. |
| **orderService**                      | getOrdersByCustomerId / getOrdersByMerchantId use Supabase embed `order_items(*)` in one query. No N+1.               |
| **adminOrdersService.listOrders**     | Single query with `order_items(*)`. No N+1.                                                                           |
| **adminProductsService.listProducts** | Products + one batch for merchant names. No N+1.                                                                      |

**Status:** Green — No N+1 patterns identified; batching and embedded relations used.

### 4.2 Caching Middleware

| Check                  | Status                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Redis**              | cacheMiddleware(600) applied to product routes in server.js; GET /api/products\* cached when Redis configured. |
| **In-memory fallback** | When Redis is not set, in-memory cache is used for product list; invalidateProductsCache clears it.            |

**Status:** Green — Caching applied; Redis and in-memory fallback documented and implemented.

### 4.3 Frontend Lazy-Loading

| Component                                                                | Lazy | Notes                                                |
| ------------------------------------------------------------------------ | ---- | ---------------------------------------------------- |
| PublicWebsite, PublicCatalog                                             | Yes  | React.lazy in App.tsx                                |
| CustomerView, MerchantView, ProfileView, AdminView, PublicProductDetails | Yes  | React.lazy                                           |
| CustomerShopTab, CustomerCartTab, CustomerOrdersTab                      | Yes  | Lazy in CustomerView                                 |
| MerchantDashboardTab, MerchantProductsTab, MerchantOrdersTab             | Yes  | Lazy in MerchantView                                 |
| AdminView tabs (Users, Orders, Products, Treasury, Platform)             | No   | Single AdminView component; split planned in README. |

**Status:** Yellow — Route-level and Customer/Merchant tab lazy-loading in place; AdminView tabs not yet split.

---

## 5. Observability

### 5.1 Prometheus Metrics

| Metric              | Captured                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Request count       | Yes — `palma_http_requests_total` (method, route, status)                                |
| Latency             | Yes — histogram `palma_http_request_duration_seconds_*` (buckets; p50/p95/p99 derivable) |
| Errors (4xx/5xx)    | Yes — `palma_http_errors_total`                                                          |
| Validation failures | Yes — `palma_http_validation_failures_total` (source)                                    |
| Rate-limit hits     | Yes — `palma_http_rate_limit_hits_total` (route)                                         |
| MFA failures        | Yes — `palma_http_mfa_failures_total`                                                    |
| Process memory      | Yes — RSS, heap used/total, external                                                     |
| Process CPU         | Yes — user and system seconds (gauges)                                                   |

**Status:** Green — Metrics cover requests, latency, errors, validation, rate limits, MFA, memory, and CPU.

### 5.2 Logging Sanitization and requestId / Masked IP

| Check              | Status                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| **sanitizeForLog** | Implemented in logger.js; redacts password, token, secret, authorization, cookie, otp, code, card, apikey, etc. |
| **requestId**      | Set by requestIdMiddleware before limiters; used in requestLogger and errorHandler.                             |
| **Masked IP**      | requestLogger and rate-limit handler use maskIp(); no raw IP in logs.                                           |

**Status:** Green — Sensitive data redacted; requestId and masked IP used in logs.

### 5.3 Missing Metrics, Alerts, or Dashboards

| Item                   | Status                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| **SLO/alert docs**     | Documented in SLO_AND_ALERTS.md and PRODUCTION_SCALING_AND_MONITORING.md. |
| **Grafana dashboards** | Not in repo; recommended queries and layout are in docs.                  |
| **Alertmanager rules** | Not in repo; suggested rules in SLO_AND_ALERTS.md.                        |

**Status:** Yellow — Observability code and docs are in place; dashboards and alert rules need to be deployed in the monitoring stack.

---

## 6. Summary Dashboard

### 6.1 File Sizes and Line Counts (Summary)

| Category | Files &gt; 500 lines                             | Largest file                                 |
| -------- | ------------------------------------------------ | -------------------------------------------- |
| Backend  | 3 (authService, authController, shipmentService) | authService.js (523)                         |
| Frontend | 18+                                              | translations.ts (1240), AdminView.tsx (1001) |

### 6.2 Route Validation Coverage

| Coverage                  | Routes                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Full Joi (body/query)** | Auth (login, register, verify-email, forgot/reset, resend), Orders (list, listMerchant, create), Cart (add, updateQuantity), Products (list, create, update, comment), MFA (verify-setup, verify), Admin (list users/orders/products, updateUserStatus, softDeleteUser, updateProduct, updateSettings) |
| **Partial or none**       | Address, Shipment, Payment, Notification, Follow, Chat, Broker, Merchant, Shared products                                                                                                                                                                                                              |

### 6.3 Rate-Limiter Coverage

| Area           | Applied            | Redis-backed |
| -------------- | ------------------ | ------------ |
| General        | generalLimiter     | Yes          |
| Auth           | authLimiter        | Yes          |
| Payment        | paymentLimiter     | Yes          |
| Cart           | cartLimiter        | Yes          |
| Products list  | productListLimiter | Yes          |
| Products by id | productByIdLimiter | Yes          |
| Comments       | commentLimiter     | Yes          |

### 6.4 Potential Security Gaps

| Gap                                                                          | Severity   | Mitigation                                                          |
| ---------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| Joi not applied to payment/shipment/chat/address/follow/broker body or query | Low–Medium | Add schemas and validate() for sensitive or user-controlled input.  |
| /auth/check-key no IP allowlist                                              | Low        | Optional: allow only from known IPs when enabled.                   |
| SameSite=none (cross-origin)                                                 | Accepted   | CSRF mitigated by optional X-Requested-With header and strict CORS. |

### 6.5 Performance Bottlenecks

| Item                             | Severity   | Note                                              |
| -------------------------------- | ---------- | ------------------------------------------------- |
| Large AdminView.tsx              | Medium     | Single 1001-line component; split into lazy tabs. |
| Large authService/authController | Low        | Consider splitting for maintainability.           |
| translations.ts single file      | Low        | Consider splitting by domain or locale.           |
| N+1 queries                      | None found | Batched queries and embedded relations in use.    |

---

## 7. Green / Yellow / Red Status

| Category                      | Status | Summary                                                                                                                       |
| ----------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Code cleanliness**          | Yellow | Large files present; no automated unused-import/dead-code run. Naming/format consistent.                                      |
| **File & line metrics**       | Yellow | Several files &gt; 500 lines (backend and frontend); refactor plans exist for AdminView and auth.                             |
| **Validation & security**     | Yellow | Auth, orders, cart, products, MFA, admin well covered; other routes lack Joi. Rate limiters and check-key/CORS/SameSite good. |
| **Performance & scalability** | Green  | No N+1; caching and lazy-loading in place; AdminView split pending.                                                           |
| **Observability**             | Green  | Metrics, sanitization, requestId, masked IP in place; dashboards/alerts to be deployed.                                       |

---

## 8. Next Incremental Improvements

1. **AdminView:** Split into lazy-loaded tab components (Users, Orders, Products, Treasury, Platform) per `views/admin/README.md`.
2. **Validation:** Add Joi schemas and `validate()` for:
   - Payment (create, callback, cybersource/charge) body
   - Shipment (create, print-pdf, cancel) body/params
   - Address (cities, villages) query if needed
   - Chat POST body
   - Broker shared-products body/path
   - Notification list query and markRead path
3. **Large backend files:** Split authService (e.g. registration, login, password-reset modules) and authController (e.g. MFA handlers); optionally shipmentService (create/status vs print vs external API).
4. **Lint:** Run ESLint with unused-vars and fix or suppress; add Prettier/ESLint to CI.
5. **Observability:** Deploy Grafana dashboards and Alertmanager rules from SLO_AND_ALERTS.md; wire alerts to notification channel.
6. **Translations:** Split translations.ts by domain or locale for easier maintenance and optional lazy load.

---

_End of post-refactor audit report._
