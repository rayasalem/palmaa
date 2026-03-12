# Critical Authentication Bug – Full Audit & Fix

**Date:** 2026  
**Scope:** Backend auth (login, logout, /me), CORS, cookie handling, frontend logout flow.  
**Goal:** After logout, refresh must keep user logged out; login, products, cart must work reliably.

---

## 1. Issues Found in Current Code

| # | Issue | Severity | Location |
|---|--------|----------|----------|
| 1 | **Logout not awaited in frontend** | High | `App.tsx` `handleLogout` called `authService.logout()` without `await`. If user refreshed before the request completed, cookie might still be sent on next load. | 
| 2 | **clearCookie options** | Fixed | Backend already used `getClearCookieOptions()` matching login; added `expires: new Date(0)` for maximum browser compatibility. |
| 3 | **Post-logout URL/view** | Fixed | `initApp` already resets view and hash to LANDING when `getMe` returns 401 so `#/dashboard` does not persist. |

**No issues found in:**  
- Middleware order (CORS → cookieParser → json → routes)  
- `/api/auth/me` (returns 401 when no valid token)  
- Login cookie setting (`getCookieOptions()`)  
- CORS (origins include www.palma.ps, localhost:3000, 3002; credentials true; OPTIONS 204)  
- Frontend fetch (credentials: 'include' on login, getMe, logout, cart, products)  
- Frontend state clear on logout (user, localStorage, sessionStorage via setAuthToken)

---

## 2. Backend Fixes Applied

### 2.1 Cookie clear options (jwtService.js)

**Requirement:** `clearCookie` must use the **exact same** options as login: `httpOnly`, `secure`, `sameSite`, `path`. No `domain` is set at login, so none at clear.

**Code:**

```js
// server/services/jwtService.js

export function getCookieOptions() {
  const isProd = getEnv('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

/**
 * Options for clearCookie — MUST match getCookieOptions() exactly (httpOnly, secure, sameSite, path)
 * so the browser removes the cookie. maxAge: 0 and expires ensure removal in all browsers.
 */
export function getClearCookieOptions() {
  const opts = getCookieOptions();
  return {
    ...opts,
    maxAge: 0,
    expires: new Date(0),
  };
}
```

### 2.2 Logout controller (authController.js)

**Already correct** — no change:

```js
async function logout(req, res) {
  res.clearCookie(jwtService.getCookieName(), jwtService.getClearCookieOptions());
  return res.status(200).json({ success: true, message: 'Logged out' });
}

// logoutAll:
res.clearCookie(jwtService.getCookieName(), jwtService.getClearCookieOptions());
```

### 2.3 GET /api/auth/me

**Already correct:** Returns 401 when `!req.auth?.sub` or user not found. Does not create or restore session.

### 2.4 CORS (corsMiddleware.js)

**Already correct:**

- Origins: `https://www.palma.ps`, `https://palma.ps`, `http://localhost:3000`, `http://localhost:3002`, and others.
- `Access-Control-Allow-Credentials: 'true'`
- `Access-Control-Allow-Methods`: GET, POST, PUT, PATCH, DELETE, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Authorization, X-Requested-With
- OPTIONS → 204

No code change.

---

## 3. Frontend Fixes Applied

### 3.1 Await logout before clearing state (App.tsx)

**Problem:** `handleLogout` called `authService.logout()` without `await`. State and hash were updated immediately; if the user refreshed before the logout request completed, the cookie could still exist and `/api/auth/me` could return 200.

**Fix:** Make `handleLogout` async and await `authService.logout()` so the server has cleared the cookie before we clear local state and navigate.

```tsx
const handleLogout = async () => {
  await authService.logout();
  setUser(null);
  setLocalCart([]);
  mergedGuestCartRef.current = false;
  localStorage.removeItem('palma_current_user');
  localStorage.removeItem('palma_cart');
  setCurrentView('home');
  setPublicState('LANDING');
  setAuthView('LOGIN');
  updateHash(ROUTES.HOME);
};
```

### 3.2 authService.logout() and credentials

**Already correct:**

- `fetch(..., { method: 'POST', credentials: 'include', headers: getAuthHeaders() })`
- In `finally`: `setAuthToken(null)`, `currentUser = null`

### 3.3 initApp (no restore from localStorage when logged out)

**Already correct:** When `getMe()` fails or returns non-success, we set `user = null`, clear `palma_current_user`, and reset view/hash to LANDING and HOME. No fallback to localStorage for session.

---

## 4. Middleware Order (Verified)

```
1. corsMiddleware(FRONTEND_URL)
2. helmet, trust proxy, compression
3. cookieParser(COOKIE_SECRET)
4. express.json({ limit: '15mb' })
5. csrfHeaderMiddleware
6. requestIdMiddleware
7. healthRoutes
8. generalLimiter()
9. requestLogger, metrics, requestTimeout, sanitizeErrorResponse
10. API routes (orders, products, auth, cart, ...)
11. 404 handler
12. errorHandler
```

CORS and cookie parsing run before any API route. No change.

---

## 5. Full Flow Verification

| Step | Expected | How it works |
|------|----------|--------------|
| **Login** | 200, cookie set | `POST /api/auth/login` sets `palma_token` with `getCookieOptions()` (httpOnly, secure, sameSite, path). |
| **Fetch products** | 200, products array | `GET /api/products` is public; no auth; CORS allows origin; credentials optional. |
| **Add to cart** | 200 / success | `POST /api/cart` (or equivalent) with cookie/Bearer; CORS and auth middleware allow. |
| **Logout** | 200, cookie removed | `POST /api/auth/logout` calls `res.clearCookie(name, getClearCookieOptions())`. Frontend awaits this then clears state and navigates to home. |
| **Refresh after logout** | 401, user stays out | No cookie (cleared). `GET /api/auth/me` returns 401. initApp sets user=null, clears localStorage, resets hash to HOME. No session recreated. |

---

## 6. Confirmation Checklist

- [x] **Login:** Cookie set with correct options (httpOnly, secure, sameSite, path).
- [x] **Logout:** clearCookie uses exact same options + maxAge:0, expires: new Date(0).
- [x] **/api/auth/me:** Returns 401 when no valid cookie/token; does not recreate session.
- [x] **CORS:** Allows https://www.palma.ps, http://localhost:3000, http://localhost:3002; credentials true; OPTIONS handled.
- [x] **Frontend:** All auth/cart fetch use `credentials: 'include'`.
- [x] **Frontend logout:** Calls `/api/auth/logout` with credentials, **awaits** response, then clears React state and localStorage/sessionStorage (via setAuthToken), navigates to home.
- [x] **initApp:** On getMe failure/401, sets user=null, clears palma_current_user, resets view/hash; no localStorage session restore.
- [x] **No business logic or API contract changed:** Only cookie clear options and frontend await of logout.

---

## 7. Files Touched

| File | Change |
|------|--------|
| `server/services/jwtService.js` | `getClearCookieOptions()` now also sets `expires: new Date(0)`. |
| `App.tsx` | `handleLogout` is `async` and `await authService.logout()` before clearing state and hash. |

---

## 8. Deployment

- **Backend:** Deploy updated `jwtService.js` (and existing `authController.js`) so production uses `getClearCookieOptions()` with `expires`.
- **Frontend:** Deploy updated `App.tsx` so logout is awaited before navigation.

After deployment, the flow **Login → Products → Cart → Logout → Refresh** should show the user logged out with no automatic re-login.
