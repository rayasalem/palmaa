# Palma Marketplace – Refactor Guide

This document describes the **suggested folder structure** for frontend and backend, how **functions are split into single-responsibility files**, and how **UI, hooks, and API** are separated. Logic is preserved; only organization and comments are added.

---

## 1. Suggested Folder Structure

### 1.1 Frontend (React)

```
├── index.tsx                    # Entry: mount App, global CSS
├── index.css
├── App.tsx                      # Root: routing state, ToastProvider
├── types/                       # Shared types
│   ├── index.ts                 # Re-export User, Product, Order, etc.
│   └── constants.ts             # PRODUCT_CATEGORIES, enums (optional split)
├── lib/                         # Third-party wrappers / re-exports
│   └── flashline.ts
├── content/                     # Static copy
│   └── merchantTerms.ts
├── api/                         # Low-level HTTP: base URL, fetch, credentials
│   ├── client.ts                # api(basePath, options) – single fetch wrapper
│   └── index.ts
├── services/                    # Business logic + API calls (use api/client)
│   ├── authService.ts
│   ├── userService.ts
│   ├── productService.ts
│   ├── orderService.ts
│   ├── interactionApi.ts
│   ├── checkoutApi.ts
│   ├── storageService.ts
│   ├── emailService.ts
│   ├── socialService.ts
│   └── core/
│       └── storage.ts
├── hooks/                       # Custom hooks (use services, no direct fetch in UI)
│   ├── useAuth.ts               # login, logout, register, me, verify, forgot, reset
│   ├── useToast.ts              # Re-export from ToastProvider or wrapper
│   ├── useCart.ts               # Cart state + add/remove/clear (optional)
│   └── index.ts
├── components/                  # Presentational + wiring to hooks
│   ├── ui/                      # Dumb components (optional grouping)
│   │   ├── Logo.tsx
│   │   └── ...
│   ├── Layout.tsx
│   ├── Auth.tsx                 # Uses useAuth, useToast; UI only
│   ├── RegisterMerchant.tsx
│   ├── RegisterBroker.tsx
│   ├── RegisterCustomer.tsx
│   ├── PublicWebsite.tsx
│   ├── PublicCatalog.tsx
│   ├── ToastProvider.tsx
│   ├── ComingSoonHero.tsx
│   └── PendingReview.tsx
└── views/                       # Page-level; use hooks + services
    ├── CustomerView.tsx
    ├── MerchantView.tsx
    ├── AdminView.tsx
    ├── BrokerView.tsx
    ├── ProfileView.tsx
    ├── NotificationsView.tsx
    ├── CheckoutPage.tsx
    ├── CheckoutReturnPage.tsx
    ├── PublicProductDetails.tsx
    ├── PublicProfileView.tsx
    ├── PublicBrokerPage.tsx
    └── MerchantTermsView.tsx
```

**Principles:**

- **api/** – Single place for `VITE_API_URL`, `credentials: 'include'`, and one `api<T>(path, options)` helper.
- **services/** – All backend calls go through services; services use `api/` or direct `fetch` with same base.
- **hooks/** – Encapsulate state + side effects (e.g. useAuth wraps authService + local state); components call hooks, not services directly where it improves clarity.
- **components/ & views/** – Prefer hooks over inline service calls; keep UI logic (event handlers, form state) in the component; keep API logic in hooks or services.

---

### 1.2 Backend (Node.js)

```
server/
├── server.js                    # Express app, mount routes, middlewares
├── config/
│   ├── env.js                   # getEnv, validateEnv, isProduction
│   └── supabaseClient.js
├── utils/
│   ├── logger.js                # Winston logger
│   └── index.js                 # Re-export utils
├── middlewares/
│   ├── authMiddleware.js        # authenticate, optionalAuth, requireRole
│   ├── security.js              # helmet, limiters
│   ├── httpsEnforce.js
│   ├── requestLogger.js
│   └── errorHandler.js
├── security/
│   ├── encryption.js
│   ├── sanitize.js
│   └── index.js
├── routes/                      # Thin: map method+path → controller
│   ├── authRoutes.js
│   ├── orderRoutes.js
│   ├── productRoutes.js
│   ├── paymentRoutes.js
│   ├── shipmentRoutes.js
│   ├── addressRoutes.js
│   ├── adminRoutes.js
│   ├── followRoutes.js
│   ├── merchantRoutes.js
│   └── notificationRoutes.js
├── auth/                         # Domain: auth (example of split)
│   ├── controllers/
│   │   ├── getMe.js
│   │   ├── login.js
│   │   ├── logout.js
│   │   ├── registerUser.js
│   │   ├── verifyEmail.js
│   │   ├── forgotPassword.js
│   │   ├── resetPassword.js
│   │   ├── resendVerification.js
│   │   └── index.js             # Re-export all
│   ├── services/
│   │   ├── otp.js               # generateOtp, saveOtp, findValidOtp, invalidateOtp, verifyOtp
│   │   ├── password.js          # hashPassword, updatePassword
│   │   ├── register.js          # registerUser
│   │   ├── login.js             # login (find user, compare password)
│   │   ├── getUserById.js
│   │   ├── setEmailVerified.js
│   │   ├── resendVerification.js
│   │   └── index.js             # Re-export all
│   └── index.js                 # Optional: re-export auth.controllers, auth.services
├── controllers/                  # Legacy flat structure (can migrate domain by domain)
│   ├── orderController.js
│   ├── productController.js
│   ├── ...
│   └── authController.js        # Can become: import * from '../auth/controllers'
├── services/
│   ├── orderService.js
│   ├── productService.js
│   ├── ...
│   └── authService.js           # Can become: import * from '../auth/services'
├── payment/                      # Arabic Bank (existing TS submodule)
│   ├── index.ts
│   ├── config/, types/, controllers/, routes/, services/, middlewares/
│   └── ...
├── db/
│   └── schema-follow-interaction.sql
└── public/
    └── *.html
```

**Principles:**

- **One function per file** in `auth/controllers/` and `auth/services/`: each file has a single exported function and JSDoc; `index.js` re-exports for routes to use.
- **Routes** stay in `routes/*.js` and import from `auth/controllers` (or `controllers/authController.js` if it re-exports from auth).
- **Other domains** (orders, products, shipment, address, admin, follow, notifications) can be split the same way when needed; until then they remain in `controllers/` and `services/`.

---

## 2. Per-File Conventions

### 2.1 Backend (Node)

- **Controller file** (e.g. `login.js`): One async function `login(req, res)`. Validate input, call service, set status and JSON. Top-of-file JSDoc: endpoint, body/query, response.
- **Service file** (e.g. `otp.js`): Pure logic and DB; no `req`/`res`. Each function documented with @param and @returns. Use `../config` and `../utils` as needed.
- **Exports**: Use named exports; re-export from `index.js` so routes can `import * as authController from '../auth/controllers'`.

### 2.2 Frontend (React)

- **Component**: Focus on UI and user events. Use hooks for data and side effects. Add a short comment block at the top describing the component’s role.
- **Hook**: Encapsulate state and service calls; return `[state, actions]` or `{ ...state, ...actions }`. One hook per file in `hooks/`.
- **Service**: Same as today; optional use of `api/client.ts` for base URL and credentials. Comment complex functions.

### 2.3 Comments

- **Every line** is not required; add comments for:
  - File purpose (top block).
  - Non-obvious logic, business rules, and security-sensitive branches.
  - Public API (JSDoc for exported functions).

---

## 3. Migration Order (Suggested)

1. **Backend auth** – Split `authController.js` and `authService.js` into `server/auth/controllers/*.js` and `server/auth/services/*.js`; re-export; point `authRoutes.js` to new controllers. Add comments.
2. **Frontend api + hooks** – Add `api/client.ts` (if desired), then `hooks/useAuth.ts` that uses `authService`. Optionally refactor `Auth.tsx` to use `useAuth` only.
3. **Other backend domains** – Apply same split (one function per file, index re-exports) to shipment, address, orders, products, etc., as needed.
4. **Other frontend views** – Extract hooks (e.g. useCheckout, useNotifications) and ensure API lives in services; add top-of-file and key comments.

---

## 4. What Stays the Same

- **No logic changes**: Request/response behavior, validation rules, and DB usage remain identical.
- **Existing routes** and URLs are unchanged.
- **Environment variables** and config usage unchanged.
- **Payment submodule** (`server/payment/`) stays as-is unless you choose to align its structure with the same conventions.

This refactor improves **navigability**, **testability** (small files), and **separation of concerns** (UI vs hooks vs API; controllers vs services vs utils) without changing functionality.
