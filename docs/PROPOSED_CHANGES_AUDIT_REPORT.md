# Proposed Changes Audit Report — Production Code

**Generated:** For team review before applying any changes.  
**Scope:** Backend (Node/Express/Supabase) and selected frontend/DevOps items.  
**Rule:** No changes have been applied; this document is recommendations only.

---

## Summary

| #   | Recommendation                                                     | Primary files                                          | Risk   | Section |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------ | ------ | ------- |
| 1   | Replace remaining `console.log`/`console.warn` with logger         | Multiple services                                      | Low    | 1       |
| 2   | Add optional pagination to `getActiveProducts` (GET /api/products) | productService.js, productController.js                | Low    | 2       |
| 3   | Add optional pagination to notifications `listByUserId`            | notificationService.js, notification routes/controller | Low    | 2       |
| 4   | Cache: TTL tuning and invalidation key pattern                     | cacheMiddleware.js                                     | Low    | 3       |
| 5   | Cache: document Redis option for multi-instance                    | docs only / optional new file                          | N/A    | 3       |
| 6   | Payment module (TS): use logger instead of console.error           | server/payment/\*.ts                                   | Low    | 4       |
| 7   | Optional response timeout middleware                               | server.js, new middleware file                         | Medium | 5       |
| 8   | Frontend: reduce duplicate product fetches / Admin cache           | App, CustomerView, AdminView, PublicCatalog            | Low    | 6       |

---

## 1. Logger standardization (console → logger)

### 1.1 What would be modified

Replace remaining `console.log` and `console.warn` with the shared Winston `logger` so all server logs go through one pipeline (levels, requestId, redaction).

**Files and approximate lines:**

| File                                       | Lines (approx.)                                                                                                               | Current                        | Suggested level                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------- |
| `server/services/profitService.js`         | 34, 48, 102, 115                                                                                                              | `console.log`                  | `logger.info` or `logger.debug`                |
| `server/auth/services/findValidOtp.js`     | 29                                                                                                                            | `console.log`                  | `logger.debug`                                 |
| `server/services/shipmentService.js`       | 22, 73, 197                                                                                                                   | `console.log`                  | `logger.info` / `logger.debug`                 |
| `server/auth/services/invalidateOtp.js`    | 16                                                                                                                            | `console.log`                  | `logger.debug`                                 |
| `server/auth/services/updatePassword.js`   | 20                                                                                                                            | `console.log`                  | `logger.debug`                                 |
| `server/services/authService.js`           | 35, 65, 77, 103, 128, 191, 194, 201, 205, 208, 212, 231, 250, 262, 266, 268, 351, 353, 357, 363, 392, 401, 415, 417, 428, 430 | `console.log` / `console.warn` | `logger.info` / `logger.warn` / `logger.debug` |
| `server/services/paymentService.js`        | 27, 60, 64                                                                                                                    | `console.log`                  | `logger.info` or `logger.debug`                |
| `server/controllers/shipmentController.js` | 105                                                                                                                           | `console.log`                  | `logger.info` or `logger.debug`                |
| `server/config/env.js`                     | 43, 49, 54                                                                                                                    | `console.warn`                 | `logger.warn`                                  |
| `server/services/emailService.js`          | 48, 94, 96, 119, 121, 130, 132                                                                                                | `console.log` / `console.warn` | `logger.info` / `logger.warn`                  |
| `server/auth/services/saveOtp.js`          | 18                                                                                                                            | `console.log`                  | `logger.debug`                                 |
| `server/services/transactionService.js`    | 57                                                                                                                            | `console.log`                  | `logger.debug`                                 |

**Excluded (intentionally):**

- `server/server.js` lines 12–13, 17: `console.error` for `uncaughtException` / `unhandledRejection` — keep as-is so fatal errors go to stderr before logger may be unavailable.

### 1.2 Impact

- **Risk:** Low. Logging only; no business logic or API contract change.
- **Breakage:** None for clients. Only log aggregation/level filtering might need to account for new log keys (e.g. `profitService`, `authService`).

### 1.3 Example snippet (profitService.js)

**Before (e.g. line 34):**

```javascript
console.log('[profitService] Order has no items, skip profit recording:', orderId);
```

**After:**

```javascript
import logger from '../utils/logger.js';
// ...
logger.debug('profitService skip profit recording', { orderId });
```

**Example (authService.js console.warn → logger.warn):**

```javascript
// Before
console.warn(
  '[authService] registerUser: resendVerification failed after register',
  sendResult.error && sendResult.error.message
);

// After
logger.warn('authService registerUser resendVerification failed', {
  message: sendResult.error && sendResult.error.message,
});
```

---

## 2. Pagination (safe, optional query params)

### 2.1 GET /api/products — limit for getActiveProducts

**Files to modify:**

- `server/services/productService.js`: function `getActiveProducts` (approx. lines 48–70).
- Optionally `server/controllers/productController.js`: function `list` (approx. 13–24) to pass `req.query.limit` / `req.query.offset`.

**Current behavior:**  
No limit; returns all active products. With a large catalog this can become slow and memory-heavy.

**Proposed behavior:**  
Support optional `?limit=` and `?offset=`. If omitted, keep current behavior (no limit). If provided, apply `.range(offset, offset + limit - 1)` (with a cap, e.g. max 500).

**Impact:**

- **Risk:** Low. Backward compatible: existing clients that do not send `limit`/`offset` get the same response as today.
- **Breakage:** None for existing callers. New clients can opt in to pagination.

**Example (productService.js):**

```javascript
// Add at top with other constants
const MAX_PRODUCTS_PAGE = 500;

async function getActiveProducts(opts = {}) {
  const limit = Math.min(Number(opts?.limit) || 0, MAX_PRODUCTS_PAGE);
  const offset = Math.max(0, Number(opts?.offset) || 0);

  let query = supabase
    .from(PRODUCTS_TABLE)
    .select('*')
    .or('status.eq.active,is_active.eq.true')
    .order('created_at', { ascending: false });

  if (limit > 0) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data: products, error } = await query;
  // ... rest unchanged (merchantIds, suspended, namesMap, enriched)
}
```

**Controller (productController.js list):**

```javascript
async function list(req, res) {
  try {
    const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset != null ? parseInt(req.query.offset, 10) : undefined;
    const opts = [limit, offset].some((n) => Number.isInteger(n) && n >= 0)
      ? { limit: limit || 100, offset: offset || 0 }
      : {};
    const { data, error } = await productService.getActiveProducts(opts);
    // ... rest unchanged
  }
}
```

---

### 2.2 Notifications listByUserId — optional limit/offset

**Files to modify:**

- `server/services/notificationService.js`: function `listByUserId` (approx. lines 131–145).
- Call site: wherever `listByUserId` is used (e.g. notification controller or route) to pass query params.

**Current behavior:**  
Returns all notifications for the user (with optional `unreadOnly`), no limit.

**Proposed behavior:**  
Add optional `limit` and `offset` in `options`. If provided, use `.range(offset, offset + limit - 1)` (e.g. cap 100).

**Impact:**

- **Risk:** Low. Backward compatible if callers do not pass `limit`/`offset`.
- **Breakage:** None for existing API if the notification endpoint does not yet expose query params; exposing `?limit=&offset=` is additive.

**Example (notificationService.js):**

```javascript
async function listByUserId(userId, options = {}) {
  const { unreadOnly = false, limit: optLimit, offset: optOffset } = options;
  const limit = Math.min(Number(optLimit) || 0, 100);
  const offset = Math.max(0, Number(optOffset) || 0);

  let q = supabase.from(TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false });

  if (unreadOnly) q = q.eq('is_read', false);
  if (limit > 0) q = q.range(offset, offset + limit - 1);

  const { data, error } = await q;
  // ... rest unchanged
}
```

---

## 3. Cache strategy

### 3.1 TTL and invalidation (cacheMiddleware.js)

**File:** `server/middlewares/cacheMiddleware.js`  
**Current:** TTL 600s; `invalidateProductsCache()` deletes keys that do not contain `/merchant/`.

**Proposed (non-breaking):**

1. **TTL:** Keep default 600s; add an env override, e.g. `PRODUCT_CACHE_TTL_SECONDS`, so production can tune without code change.
2. **Invalidation:** Tighten key pattern so only product-list-like keys are cleared (e.g. keys starting with `/api/products` or matching a regex), so other GET caches are not cleared by product writes.

**Impact:** Low. Same API and behavior; only cache duration and which keys get invalidated can be tuned.

**Example (TTL from env):**

```javascript
// cacheMiddleware.js
const defaultTtl = Math.max(60, parseInt(process.env.PRODUCT_CACHE_TTL_SECONDS, 10) || 600);

export function cacheMiddleware(ttlSeconds = defaultTtl) {
  return (req, res, next) => {
    const ttl = ttlSeconds > 0 ? ttlSeconds : defaultTtl;
    // ... use ttl in cache.set(key, body, ttl)
  };
}
```

**Example (safer invalidation — only product list keys):**

```javascript
export function invalidateProductsCache() {
  const keys = cache.keys();
  keys.forEach((key) => {
    const isProductList = key === '/api/products' || key.startsWith('/api/products?');
    if (isProductList && key.indexOf('/merchant/') === -1) {
      cache.del(key);
    }
  });
}
```

---

### 3.2 Redis / distributed cache (suggestion only)

**No file changes in this report.** For multi-instance deployments, document that:

- Current in-memory cache is per-process; product list can be stale on other instances after a write until TTL expires.
- Option: introduce Redis (or similar), use it for the same product-list key pattern and TTL, and invalidate on product create/update/delete. API and response shape stay the same.

---

## 4. Payment module (TypeScript) — logger instead of console.error

**Files to modify:**

- `server/payment/services/orderService.ts` — line ~48.
- `server/payment/controllers/paymentController.ts` — lines ~37, 76.
- `server/payment/services/arabicBankService.ts` — line ~66.

**Current:** `console.error(...)` for errors.

**Proposed:** Use the same Node logger (e.g. `logger.error('message', { message: err.message })`). The payment module is compiled to JS and runs in the same process, so it can import `../../utils/logger.js` (or a shared logger module).

**Impact:** Low. Logging only; no API or behavior change.

**Example (orderService.ts):**

```typescript
import logger from '../../utils/logger.js';

// Before
console.error('[orderService] updateOrderPaymentStatus:', error.message);

// After
logger.error('payment orderService updateOrderPaymentStatus', { message: error.message });
```

(Adjust path if the TS build output layout differs.)

---

## 5. Optional response timeout middleware

**Files to add/modify:**

- New file, e.g. `server/middlewares/responseTimeout.js`.
- `server/server.js`: add middleware before routes (e.g. after `sanitizeErrorResponse`).

**Behavior:** Set a max time per response (e.g. 30s). If the handler does not finish in time, respond with 503 and `Connection: close`, and optionally log with `req.id`.

**Impact:** Medium. Long-running but valid requests (e.g. large exports, slow DB) could start receiving 503. Should be tuned (high timeout or disabled) if such endpoints exist.

**Example (new middleware):**

```javascript
// server/middlewares/responseTimeout.js
const DEFAULT_MS = 30000;

export function responseTimeout(ms = DEFAULT_MS) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.setHeader('Connection', 'close');
        res.status(503).json({ success: false, error: 'Request timeout' });
      }
    }, ms);
    res.on('finish', () => clearTimeout(timer));
    next();
  };
}
```

**server.js:**

```javascript
import { responseTimeout } from './middlewares/responseTimeout.js';
// ...
app.use(sanitizeErrorResponse);
app.use(responseTimeout(Number(process.env.RESPONSE_TIMEOUT_MS) || 30000));
// then routes
```

**Recommendation:** Apply only after confirming no critical endpoint regularly exceeds the chosen timeout; otherwise document and leave as optional.

---

## 6. Frontend — duplicate product fetches and Admin cache

(References from existing architecture audits; no code changes applied.)

**Suggested improvements:**

1. **Products “loaded at” / single load:**  
   In App or a shared store, keep a timestamp of last successful products fetch. In CustomerView and PublicWebsite (and any component that fetches the full product list on mount), skip calling the list API if the last load was less than ~60 seconds ago.  
   **Risk:** Low. **Breakage:** None; same API, fewer redundant calls.

2. **AdminView products:**  
   Cache the products list in component state after first fetch. Refetch only on explicit “Refresh” or after create/update/delete.  
   **Risk:** Low. **Breakage:** None.

3. **PublicCatalog filters:**  
   Debounce (e.g. 300ms) filter/sort changes before triggering a new fetch, or filter client-side when the full list is already in memory.  
   **Risk:** Low. **Breakage:** None.

**Example (conceptual — “products loaded at” in a store or context):**

```javascript
// In a shared store or context
let productsLoadedAt = 0;
const STALE_MS = 60_000;

export async function getProductsIfStale() {
  if (Date.now() - productsLoadedAt < STALE_MS) {
    return; // use existing data
  }
  const data = await api('/api/products');
  productsLoadedAt = Date.now();
  return data;
}
```

(Exact file names and call sites should be taken from the current frontend structure; the above is illustrative.)

---

## 7. Already applied (for context)

The following have already been implemented; they are listed only so this report reflects the current state:

- Request ID middleware and logging in requestLogger / errorHandler / cacheMiddleware.
- Env validation (required: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET).
- Cart N+1 fix: batch product fetch in `cartService.getCartWithItems`.
- Admin list pagination: optional `?limit=` and `?offset=` for users, orders, products.
- GET /api/orders/:id protected with optionalAuth + owner/admin check.
- Docker Compose healthcheck uses `/ready` instead of `/health`.
- Batch insert for `notifyAdminComment` and `notifyBrokersSharedProductComment`.
- Most server JS files: `console.error` replaced with `logger.error`.

---

## 8. Review checklist

Before applying any change from this report:

- [ ] Confirm no contract change for existing API (same response shape and status codes when no new params are sent).
- [ ] Run existing tests and key flows (login, cart, orders, admin lists, product list).
- [ ] If adding timeouts or pagination defaults, confirm acceptable for current traffic and use cases.
- [ ] Logging: ensure log level (e.g. LOG_LEVEL) and aggregation still make sense after moving console to logger.
- [ ] Document new query params (e.g. `limit`, `offset`) in API docs or README.

---

**End of report.** No changes have been applied; all recommendations are for team review and staged rollout.
