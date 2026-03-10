# Backend Audit — Applied Updates and Remaining Gaps

This report summarizes the changes applied during the comprehensive backend audit and lists remaining gaps for future work.

---

## 1. Validation & Joi — Applied

| Update                | Location                       | Notes                                                                                                       |
| --------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Shared patterns**   | `server/validation/schemas.js` | Exported `common` object: `uuid`, `email`, `password`, `quantity`, `quantityStrict`, `productId` for reuse. |
| **Orders list query** | `server/validation/schemas.js` | Added `orders.listQuery`: `limit` 1–100 (default 50), `offset` ≥ 0.                                         |
| **Order routes**      | `server/routes/orderRoutes.js` | GET `/` and GET `/merchant` use `validate(orderSchemas.listQuery, 'query', 'orders.list'                    | 'orders.listMerchant')`. |
| **Admin list cap**    | `server/validation/schemas.js` | Replaced admin list schemas with `adminListQuery`: `limit` 1–100 (default 50), `offset` ≥ 0.                |
| **Admin services**    | `server/services/admin/*.js`   | `parsePagination(opts, 50, 100)` so max limit 100 is enforced even if schema is bypassed.                   |

Validation failures already log `requestId`, `source`, and message; `recordValidationFailure(source)` updates Prometheus.

**Remaining:** None. All critical routes (auth, cart, orders, products, comments, MFA, admin) use centralized Joi validation.

---

## 2. Security Enhancements — Applied

| Update                      | Location                                           | Notes                                                                                                                            |
| --------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Redis for all limiters**  | `server/middlewares/security.js`                   | Added `...getStore()` to `authLimiter`, `commentLimiter`, `productByIdLimiter` so they use Redis when `REDIS_URL` is set.        |
| **CORS**                    | `server/server.js`                                 | Removed `cors({ origin: true, credentials: true })` and `cors` import; only `corsMiddleware(getEnv('FRONTEND_URL'))` is used.    |
| **CSRF header**             | `server/middlewares/csrfHeaderMiddleware.js` (new) | When `ENABLE_CSRF_HEADER=true` and production, state-changing methods require `X-Requested-With: XMLHttpRequest`; otherwise 403. |
| **CSRF in stack**           | `server/server.js`                                 | `app.use(csrfHeaderMiddleware)` after `express.json()`.                                                                          |
| **MFA grace/enforce**       | `server/controllers/authController.js`             | After login success without MFA: if role is ADMIN/MERCHANT, `MFA_ENFORCE_MODE` (warn                                             | enforce) and `MFA_GRACE_PERIOD_END` apply. Enforce + past grace → 403 and code `MFA_REQUIRED_FOR_ROLE`. Warn → issue token and add `mfaRequiredForRole`, `mfaGracePeriodEnd` to response. |
| **JWT expiry for ADMIN**    | `server/services/jwtService.js`                    | `sign()` uses `JWT_EXPIRES_IN_ADMIN` (default `1d`) when `payload.role === 'ADMIN'`.                                             |
| **Protect /auth/check-key** | `server/routes/authRoutes.js`                      | In production, GET `/api/auth/check-key` returns 404 unless `ALLOW_AUTH_CHECK_KEY=true`.                                         |

**Frontend:** `api/client.ts` now sends `X-Requested-With: XMLHttpRequest` in default headers so that when `ENABLE_CSRF_HEADER=true` is set on the backend, no frontend change is required.

**Remaining:**

- MFA enforcement timeline: set `MFA_GRACE_PERIOD_END` and switch `MFA_ENFORCE_MODE` to `enforce` after grace.

---

## 3. Performance & Scalability — Applied

| Update                       | Location                                | Notes                                                                                                                                    |
| ---------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin list cap**           | See Validation above.                   | Admin GET users/orders/products limited to 100 per request.                                                                              |
| **Cache in-memory fallback** | `server/middlewares/cacheMiddleware.js` | When Redis is not configured, product list cache uses in-memory Map with TTL; `invalidateProductsCache()` clears in-memory product keys. |

**DB indexes:** Already defined in `supabase/migrations/010_add_performance_indexes.sql` (users, products, orders, order_items, carts, notifications). No code change.

**Remaining:**

- AdminView frontend: lazy-loaded tabs (Users, Orders, Products, Treasury, Platform) are documented in `views/admin/README.md` but not yet split; do when refactoring.

---

## 4. Observability — Applied

| Update              | Location                         | Notes                                                                                                      |
| ------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **CPU metrics**     | `server/utils/metrics.js`        | Added `palma_process_cpu_user_seconds` and `palma_process_cpu_system_seconds` (from `process.cpuUsage()`). |
| **Validation logs** | `server/middlewares/validate.js` | Already logs `requestId`, `source`, and message; no change.                                                |

Prometheus already exposes request count, latency histogram, errors, rate-limit hits, validation failures, MFA failures, and process memory (RSS, heap). SLO/alert docs: `docs/SLO_AND_ALERTS.md`, `docs/PRODUCTION_SCALING_AND_MONITORING.md`.

**Remaining:** None for this audit.

---

## 5. Safe Testing & Verification — Applied

| Update               | Location                                | Notes                                                                                                                                                                             |
| -------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **k6 script**        | `scripts/load/k6-catalog-rate-limit.js` | Scenarios: catalog 200 under load; catalog 429 after exceeding limit; login invalid body 400. Run with `k6 run scripts/load/k6-catalog-rate-limit.js` or `-e BASE_URL=<staging>`. |
| **Verification doc** | `docs/SAFE_VERIFICATION_STEPS.md`       | Steps for validation 400, rate limit 429, brute-force auth, catalog load, health/ready, metrics, CORS, /auth/check-key.                                                           |

**Remaining:** Run k6 and manual checks in staging and document results; add to CI if desired.

---

## 6. Incremental Rollout & Feature Flags — Applied

| Update                  | Location                     | Notes                                                                                                                                         |
| ----------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature flags table** | `docs/DEPLOYMENT_ORIGINS.md` | Documented: `ENABLE_CSRF_HEADER`, `ALLOW_AUTH_CHECK_KEY`, `MFA_ENFORCE_MODE`, `MFA_GRACE_PERIOD_END`, `JWT_EXPIRES_IN_ADMIN`, `FRONTEND_URL`. |
| **Deployment origins**  | `docs/DEPLOYMENT_ORIGINS.md` | Existing template kept; feature flags section added.                                                                                          |

**Remaining:** Fill in the origins table per environment when deploying.

---

## 7. Summary of File Changes

| File                                            | Change                                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `server/validation/schemas.js`                  | `common` export; `orders.listQuery`; `adminListQuery` (cap 100); admin list schemas use it.           |
| `server/routes/orderRoutes.js`                  | Validation for GET `/` and GET `/merchant` with `orders.listQuery`.                                   |
| `server/services/admin/adminOrdersService.js`   | `parsePagination(opts, 50, 100)`.                                                                     |
| `server/services/admin/adminUsersService.js`    | Same.                                                                                                 |
| `server/services/admin/adminProductsService.js` | Same.                                                                                                 |
| `server/middlewares/security.js`                | `...getStore()` for authLimiter, commentLimiter, productByIdLimiter; keyGenerator for commentLimiter. |
| `server/server.js`                              | Removed `cors`; added `csrfHeaderMiddleware`.                                                         |
| `server/middlewares/csrfHeaderMiddleware.js`    | **New.** Optional X-Requested-With check.                                                             |
| `server/services/jwtService.js`                 | ADMIN uses `JWT_EXPIRES_IN_ADMIN` (default 1d).                                                       |
| `server/controllers/authController.js`          | MFA grace/enforce for ADMIN/MERCHANT; `getEnv`, `requiresMfaForRole`.                                 |
| `server/routes/authRoutes.js`                   | `/check-key` 404 in production unless `ALLOW_AUTH_CHECK_KEY=true`; `getEnv`, `isProduction`.          |
| `server/middlewares/cacheMiddleware.js`         | In-memory fallback when Redis not set; `invalidateProductsCache` clears memory keys.                  |
| `server/utils/metrics.js`                       | CPU user/system seconds gauges.                                                                       |
| `scripts/load/k6-catalog-rate-limit.js`         | **New.** k6 catalog and validation scenarios.                                                         |
| `docs/SAFE_VERIFICATION_STEPS.md`               | **New.** Safe verification steps.                                                                     |
| `docs/DEPLOYMENT_ORIGINS.md`                    | Feature flags table.                                                                                  |
| `api/client.ts`                                 | Default headers include `X-Requested-With: XMLHttpRequest` for CSRF when backend enables it.          |
| `docs/BACKEND_AUDIT_APPLIED_UPDATES_REPORT.md`  | **New.** This report.                                                                                 |

---

## 8. Remaining Gaps (No Breaking Change)

2. **AdminView lazy tabs:** Split AdminView into lazy-loaded tab components per `views/admin/README.md` when scheduling allows.
3. **MFA enforcement:** After grace period, set `MFA_ENFORCE_MODE=enforce` and ensure ADMIN/MERCHANT users are notified and have set up MFA.
4. **Staging run:** Execute k6 and `SAFE_VERIFICATION_STEPS.md` in staging and record results.
5. **DB indexes:** Ensure migration `010_add_performance_indexes.sql` is applied in production (run each `CREATE INDEX CONCURRENTLY` separately if needed).

All applied updates are backward-compatible: existing clients continue to work; new behavior is gated by env (CSRF, MFA enforce, check-key) or by stricter validation limits (admin/order list cap).
