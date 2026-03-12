# Full Audit: Auth & API Safe Fix

**Date:** 2026  
**Scope:** Backend auth (login, logout, /me), products API, CORS, frontend integration.  
**Constraint:** No business logic, DB, or route changes — only middleware, CORS, cookie handling, and flow fixes.

---

## 1. Summary of Findings

| Area | Status | Notes |
|------|--------|--------|
| Express server setup | OK | Middleware order correct; routes registered. |
| Login | OK | Cookie set via `getCookieOptions()`; validation relaxed (email string). |
| Logout | **Fixed** | Now uses `getClearCookieOptions()` so options match login exactly. |
| /api/auth/me | OK | Returns 401 when no valid token; does not recreate session. |
| /api/products | OK | No auth required; validation has defaults for query. |
| CORS | OK | Allows www.palma.ps, palma.ps, localhost:3000/3002/5173/3001, Render, Vercel. |
| Frontend credentials | OK | All fetch use `credentials: 'include'`. |
| Frontend logout | OK | Calls API, clears token, localStorage, React state. |
| Frontend initApp | OK | No localStorage fallback when getMe fails; user stays logged out. |

---

## 2. Root Cause of “API / Login / Products Not Working”

- **Frontend always calls Render** (`getApiBase()` returns `https://palmaa.onrender.com`). So:
  - If **Render backend is down or on an old build**: login, products, and /me will fail or behave wrongly.
  - If **Render has old logout code** (clearCookie with only `{ path: '/' }`): cookie is not removed in some browsers, so after refresh the user appears still logged in.

So the “API not working” is either:
1. Render deployment not updated or env missing (e.g. `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`), or  
2. A temporary network/Render cold-start issue.

The codebase fixes below ensure that **once the backend on Render is deployed with this code**, login, products, logout, and “refresh keeps user logged out” all work.

---

## 3. Problems Found and Fixes Applied

### 3.1 Logout cookie not removed (main bug)

**Problem:** `res.clearCookie(name, { path: '/' })` does not match the options used when setting the cookie (`httpOnly`, `secure`, `sameSite`). Browsers may keep the cookie, so after refresh `/api/auth/me` still sees it and the user appears logged in.

**Fix:** Use the **exact same options** as login when clearing, with `maxAge: 0`.

**Code:**

- **`server/services/jwtService.js`** — add and export:

```js
/**
 * Options for clearCookie — MUST match getCookieOptions() exactly (except maxAge: 0)
 * so the browser removes the cookie. Do not add or omit path/domain/secure/sameSite.
 */
export function getClearCookieOptions() {
  const opts = getCookieOptions();
  return { ...opts, maxAge: 0 };
}
```

- **`server/controllers/authController.js`** — logout and logout-all:

```js
// logout
async function logout(req, res) {
  res.clearCookie(jwtService.getCookieName(), jwtService.getClearCookieOptions());
  return res.status(200).json({ success: true, message: 'Logged out' });
}

// logoutAll (after incrementTokenVersion)
res.clearCookie(jwtService.getCookieName(), jwtService.getClearCookieOptions());
```

**Applied in codebase:** Yes.

---

### 3.2 Login cookie options (reference only — no change)

Login already sets the cookie correctly:

- **`server/controllers/authController.js`** (login success path):

```js
res.cookie(jwtService.getCookieName(), token, jwtService.getCookieOptions());
```

- **`server/services/jwtService.js`** — `getCookieOptions()`:

```js
{
  httpOnly: true,
  secure: isProd,           // true in production
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}
```

No `domain` is set (correct for default host). Clear uses the same options via `getClearCookieOptions()`.

---

### 3.3 Auth validation (login)

**Checked:** `server/validation/schemas.js` — `auth.login` uses `Joi.string().max(255).required()` for email (no strict `.email()`), so backend can accept any string and validate credentials. No change.

---

### 3.4 Products list validation

**Checked:** `products.listQuery` (catalogListQuery) has `limit`/`offset` defaults (24, 0). Empty query `{}` validates and is passed to the controller. No change.

---

### 3.5 CORS

**Checked:** `server/middlewares/corsMiddleware.js` includes:

- `https://www.palma.ps`, `https://palma.ps`
- `http://localhost:3000`, `http://localhost:3002`, `http://localhost:3001`, `http://localhost:5173` (and 127.0.0.1)
- Render and Vercel origins

`Access-Control-Allow-Credentials: true` and needed methods/headers are set. No change.

---

### 3.6 Frontend

- **api/client.ts:** `getApiBase()` returns `PRODUCTION_API` only (stable; no localhost switch that could break production).
- **authService:** login, getMe, logout all use `credentials: 'include'` and correct URLs.
- **App.tsx:** `handleLogout` calls `authService.logout()`, clears `user`, `localCart`, `palma_current_user`, `palma_cart`, and resets view/hash.  
- **initApp:** If `getMe()` fails or returns non-success, we clear `palma_current_user` and set `user = null`; no restore from localStorage. So after logout + refresh, user stays logged out.

No code change required; verified only.

---

## 4. Middleware Order (Verified)

Current order in `server/server.js`:

1. CORS  
2. Helmet, trust proxy, compression  
3. **cookieParser**  
4. **express.json()**  
5. csrfHeader  
6. requestId  
7. Health routes (before limiters)  
8. generalLimiter  
9. requestLogger, metrics, requestTimeout, sanitizeErrorResponse  
10. API routes (orders, products, auth, cart, admin, …)  
11. 404 handler  
12. errorHandler  

This is correct: CORS and body/cookie parsing run before any API route; auth routes get parsed body and cookies.

---

## 5. Step-by-Step Verification (After Deploy)

1. **Login**
   - POST `/api/auth/login` with `{ email, password }`.
   - Expect 200, `success: true`, `user` and `token` in body.
   - Response has `Set-Cookie` with `palma_token`, `HttpOnly`, `Path=/`, and in production `Secure`, `SameSite=None`.

2. **Products**
   - GET `/api/products` (no auth).
   - Expect 200, `success: true`, `products` array.

3. **/api/auth/me**
   - With cookie: 200 and current user.
   - Without cookie (or invalid): 401.

4. **Logout**
   - POST `/api/auth/logout` (with cookie).
   - Expect 200 and `Set-Cookie` clearing `palma_token` (same path/options, `Max-Age=0` or `Expires` in the past).

5. **Refresh after logout**
   - After logout, reload the app.
   - Frontend calls GET `/api/auth/me` with no (or cleared) cookie → 401.
   - App leaves `user = null` and does not restore from localStorage → user stays logged out.

---

## 6. Deployment Note

- The **backend** (this Node server) must be **deployed to Render** (or your production host) with the updated `jwtService.js` and `authController.js` for the logout fix to take effect in production.
- The **frontend** already uses `credentials: 'include'` and the correct logout/init flow; no redeploy needed for logout behavior beyond what the backend sends.
- Ensure production env has: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, and optionally `FRONTEND_URL` (comma-separated origins).

---

## 7. Potential Side Effects

- **None** from the cookie/logout change: we only unified clear options with set options. Login and cookie format are unchanged.
- If you later add a **domain** to the login cookie (e.g. for subdomains), you must add the same **domain** to `getClearCookieOptions()`.

---

## 8. Files Touched

| File | Change |
|------|--------|
| `server/services/jwtService.js` | Added `getClearCookieOptions()`, export in default. |
| `server/controllers/authController.js` | `logout` and `logoutAll` use `getClearCookieOptions()`. |

All other behavior (routes, validation, CORS, frontend) is unchanged and verified.
