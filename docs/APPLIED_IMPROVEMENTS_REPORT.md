# Palma Marketplace – Applied Improvements Report

**Date:** 2025-02-23  
**Scope:** Pagination for GET /api/admin/orders; global request timeout middleware.  
**Constraints:** Backward-compatible, no API response/endpoint/business-logic changes.

---

## Summary Table

| Improvement | Applied? | Verified Non-breaking? | Notes |
|-------------|----------|------------------------|--------|
| **GET /api/admin/orders – optional ?limit= and ?offset=** | Yes | Yes | Query params parsed in adminController.getOrders; opts passed to adminService.listOrders(opts). When neither param provided, opts = {} → no .range() applied → full list (unchanged). When provided, default limit 500 / offset 0; response shape remains `{ success, orders }`. |
| **Safe default limit (500) when using pagination** | Yes | Yes | When client sends limit and/or offset, missing limit defaults to 500, missing offset to 0. Capped by adminService MAX_PAGE_SIZE (1000). |
| **API response shape unchanged** | Yes | Yes | Still returns `res.status(200).json({ success: true, orders: data })`; only `data` length may change when pagination is used. |
| **No performance regression / no breaking existing clients** | Yes | Yes | Clients that do not send limit/offset get same behavior (all orders). Clients that send limit/offset get paginated results. |
| **Global request timeout middleware** | Yes | Yes | New middleware in server/middlewares/requestTimeout.js; 15s default, configurable via REQUEST_TIMEOUT_MS. Applied to all requests after requestId, requestLogger, metrics. |
| **Service-level timeouts unchanged** | Yes | Yes | No changes to shipment, email, or payment service timeouts. |
| **503 and proper response on timeout** | Yes | Yes | On timeout: res.status(503), body `{ success: false, error: 'Request timeout' }`, Content-Type application/json. |
| **No interruption of requests completing before timeout** | Yes | Yes | Timer cleared on res 'finish' and 'close'; 503 only sent if timeout fires before response completes. |

---

## 1. Pagination for GET /api/admin/orders

### Changes

- **File:** `server/controllers/adminController.js`
- **Logic:** In `getOrders`, parse `req.query.limit` and `req.query.offset`. If at least one is a valid non-negative integer, build `opts = { limit: limit ?? 500, offset: offset ?? 0 }`; otherwise `opts = {}`. Call `adminService.listOrders(opts)`.
- **Backward compatibility:** With no query params, `opts = {}` → `applyPagination` in adminService does not add `.range()` (limit 0) → query returns all orders, same as before.
- **When pagination is used:** Client sends e.g. `?limit=100&offset=0`; server returns up to 100 orders. Default limit when only offset is sent is 500; max limit remains 1000 (MAX_PAGE_SIZE in adminService).

### Verification

- Response shape: still `{ success: true, orders: data }` with `data` an array.
- No new or renamed endpoints; no change to success/error contract.
- Existing clients that never send limit/offset see no change in behavior.

---

## 2. Global request timeout middleware

### Changes

- **New file:** `server/middlewares/requestTimeout.js`
  - Exports `requestTimeoutMiddleware(timeoutMs)` (default 15s).
  - Sets a timer; on expiry, if response not yet sent, sends 503 with `{ success: false, error: 'Request timeout' }` and logs with requestId, url, method, timeoutMs.
  - Clears timer on `res.once('finish')` and `res.once('close')` to avoid double response and leaks.
- **File:** `server/server.js`
  - Imports `requestTimeoutMiddleware`.
  - Reads `REQUEST_TIMEOUT_MS` from env (default 15000).
  - Registers middleware after `metricsMiddleware`: `app.use(requestTimeoutMiddleware(requestTimeoutMs))`.
  - Logs at startup: `Request timeout middleware active`, `{ timeoutMs }`.

### Verification

- Only requests that exceed the configured timeout get 503; requests that finish in time are unchanged.
- 503 body matches existing error style (`success: false`, `error: string`).
- Service-level timeouts (e.g. shipment, email, payment) are not modified.

---

## Logged improvements

- **Startup:** `Request timeout middleware active` with `timeoutMs` (from env or 15000).
- **On timeout:** `logger.warn('requestTimeout', { requestId, url, method, timeoutMs })` in requestTimeout middleware.

---

## Files touched

| File | Change |
|------|--------|
| `server/controllers/adminController.js` | getOrders: parse limit/offset, pass opts to listOrders. |
| `server/middlewares/requestTimeout.js` | New: timeout middleware, 503 on expiry, clear on finish/close. |
| `server/server.js` | Import and register requestTimeoutMiddleware; log timeout at startup. |

---

*All changes are backward-compatible and safe for live production; no API response shapes, endpoint names, or business logic were changed.*
