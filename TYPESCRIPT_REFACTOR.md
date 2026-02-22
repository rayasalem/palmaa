# TypeScript Refactor Guide – Palma Marketplace

This document describes the **target folder structure** and **conventions** for a full TypeScript refactor of the React frontend and Node.js backend. Logic is preserved; types, comments, and file organization are added.

---

## 1. Suggested Folder Structure

### 1.1 Frontend (React + Vite)

```
├── index.html
├── index.tsx
├── index.css
├── vite.config.ts
├── tsconfig.json
├── types/
│   ├── index.ts              # Re-export all types, enums, interfaces
│   ├── user.ts
│   ├── product.ts
│   ├── order.ts
│   └── api.ts                # ActionResponse, API payloads
├── lib/
│   └── flashline.ts
├── content/
│   └── merchantTerms.ts
├── api/
│   ├── client.ts             # Base fetch wrapper (API_BASE, credentials)
│   └── index.ts
├── services/                  # API calls; use api/client
│   ├── authService.ts
│   ├── userService.ts
│   ├── productService.ts
│   ├── checkoutApi.ts
│   ├── interactionApi.ts
│   └── ...
├── hooks/
│   ├── useAuth.ts            # Auth state + login/logout/register/me
│   ├── useToast.ts
│   └── index.ts
├── components/
│   ├── ui/                   # Presentational (Logo, etc.)
│   ├── Layout.tsx
│   ├── Auth/
│   │   ├── Auth.tsx          # UI only; uses useAuth
│   │   ├── Auth.types.ts
│   │   └── index.ts
│   ├── RegisterMerchant.tsx
│   └── ...
└── views/
    ├── CustomerView.tsx
    └── ...
```

**Conventions:**

- **.tsx** for any file containing JSX.
- **Props and state** typed with interfaces (e.g. `AuthProps`, `AuthState`).
- **API calls** in `services/` or `api/`; return types use `ActionResponse<T>` or explicit interfaces.
- **Hooks** in `hooks/`; return typed state and handlers.
- **Components** receive typed props; no inline `any` for props/state.

---

### 1.2 Backend (Node.js + Express)

```
server/
├── package.json
├── tsconfig.json              # Compiles .ts → dist/
├── server.js                 # Entry (or server.ts); loads routes
├── types/
│   ├── index.ts              # Re-export
│   ├── auth.types.ts         # Auth request/response, DB user shape
│   ├── api.types.ts          # Generic ApiResponse, pagination
│   └── ...
├── config/
│   ├── env.js                # Can stay .js or convert to .ts
│   └── supabaseClient.js
├── middlewares/
│   ├── authMiddleware.ts
│   ├── security.ts
│   └── ...
├── utils/
│   ├── logger.ts
│   └── index.ts
├── auth/                      # Domain module (TypeScript)
│   ├── types.ts              # Auth-specific types
│   ├── services/
│   │   ├── login.ts
│   │   ├── registerUser.ts
│   │   ├── getUserById.ts
│   │   ├── otp.ts
│   │   └── index.ts
│   ├── controllers/
│   │   ├── getMe.ts
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   └── index.ts
│   └── routes.ts
├── orders/                    # Same pattern when migrated
├── products/
├── routes/                    # Legacy .js routes (until migrated)
│   ├── orderRoutes.js
│   └── ...
└── dist/                      # Compiled output (tsc)
```

**Conventions:**

- **Request bodies**: interfaces (e.g. `LoginBody`, `RegisterBody`).
- **Responses**: interfaces (e.g. `AuthUserResponse`, `ApiResponse<T>`).
- **DB models**: interfaces matching Supabase (e.g. `UserRow`, `OtpRow`).
- **Controllers**: typed `(req: Request, res: Response) => Promise<void>`; use typed service results.
- **One function per file** in services/controllers where it improves clarity; barrel `index.ts` for exports.

---

## 2. Type Definitions

### 2.1 Backend (server/types or per-domain)

- **Auth**
  - `LoginBody`, `RegisterBody`, `VerifyEmailBody`, `ForgotPasswordBody`, `ResetPasswordBody`
  - `AuthUserResponse`, `AuthMeResponse`
  - `UserRow` (DB), `OtpRow` (DB)
- **API**
  - `ApiResponse<T> = { success: boolean; data?: T; error?: string }`
  - `PaginatedResponse<T>`

### 2.2 Frontend (types/)

- Re-use or mirror backend response types where possible.
- `User`, `Product`, `Order`, etc. (already in `types.ts`).
- `ActionResponse<T>` for service results.

---

## 3. Per-File Conventions

### 3.1 Comments

- **File header**: brief description of the file’s role.
- **Exported functions**: JSDoc with `@param`, `@returns`.
- **Non-obvious logic**: inline comment (e.g. why a check is required).

### 3.2 Imports/Exports

- Prefer **named exports** for functions and types.
- Use **barrel files** (`index.ts`) to re-export from a folder.
- Order: external → internal → types (e.g. `import express from 'express';` then `import { login } from '../services';` then `import type { LoginBody } from '../types';`).

### 3.3 No Logic Changes

- Validation rules, status codes, and DB usage stay the same.
- Only add types, comments, and file/structure changes.

---

## 4. Migration Order

1. **Backend**
   - Add `server/tsconfig.json` and `server/types`.
   - Migrate one domain (e.g. **auth**) to TypeScript: types → services → controllers → routes.
   - Compile to `dist/` and wire `server.js` to use `dist/auth/routes.js` (or move entry to `server/index.ts` and use tsx).
   - Repeat for other domains (orders, products, shipment, etc.).
2. **Frontend**
   - Ensure `types/` is complete and used everywhere.
   - Add `api/client.ts` and typed wrappers if needed.
   - Extract **hooks** (e.g. `useAuth`) and type them.
   - Refactor components to use typed props and hooks; add comments.
3. **Shared**
   - Optionally add a shared package or copy types between frontend and backend so API contracts stay in sync.

---

## 5. Scripts (package.json)

**Root (frontend):**

- `"build": "tsc && vite build"`
- `"dev": "vite"`

**Server:**

- `"build": "tsc"` – compiles `server/types/**/*.ts` and `server/auth/**/*.ts` to `server/dist/`
- `"start": "node server.js"` – entry loads auth from `./dist/auth/routes.js` when present (after `npm run build`), otherwise falls back to `./routes/authRoutes.js`
- Run `npm run build` in `server/` before `npm start` to use the TypeScript auth module

This refactor yields a **clean, type-safe codebase** with clear separation of UI, hooks, and API (frontend) and controllers, routes, services, and utils (backend), without changing behavior.
