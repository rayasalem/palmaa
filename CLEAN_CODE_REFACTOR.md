# Clean Code Refactor Guide – Palma Marketplace

This document describes the **target folder structure**, **Clean Code principles**, **naming conventions**, and **explanation file template** for a full TypeScript refactor. Preserves current functionality.

---

## 1. Suggested Folder Structure

### 1.1 Frontend (React + TypeScript)

```
├── index.tsx
├── index.css
├── App.tsx
├── types/
│   ├── index.ts              # Re-export all
│   ├── user.ts
│   ├── product.ts
│   ├── order.ts
│   └── api.ts
├── api/
│   ├── client.ts             # Base fetch (API_BASE, credentials)
│   ├── index.ts
│   └── README.md             # Explanation file for api/
├── services/                  # API calls (use api/client)
│   ├── authService.ts
│   ├── cartApi.ts
│   ├── checkoutApi.ts
│   └── README.md
├── hooks/
│   ├── useAuth.ts
│   ├── useCart.ts
│   ├── index.ts
│   └── README.md
├── components/
│   ├── ui/                    # Presentational only
│   │   ├── Logo.tsx
│   │   └── README.md
│   ├── Auth/
│   │   ├── Auth.tsx           # UI only; uses useAuth
│   │   ├── Auth.types.ts
│   │   ├── Auth.hooks.ts      # useAuthForm, etc.
│   │   └── README.md
│   ├── Layout.tsx
│   └── README.md
├── views/
│   ├── CustomerView/
│   │   ├── CustomerView.tsx   # UI
│   │   ├── useCustomerView.ts # Hooks
│   │   └── README.md
│   └── ...
└── content/
```

### 1.2 Backend (Node.js + TypeScript)

```
server/
├── server.ts
├── types/
│   ├── index.ts
│   ├── auth.types.ts
│   ├── cart.types.ts
│   └── README.md
├── config/
├── middlewares/
├── utils/
├── auth/
│   ├── controllers/
│   │   ├── getMe.ts
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── login.ts
│   │   ├── registerUser.ts
│   │   ├── verifyOtp.ts
│   │   └── index.ts
│   ├── routes.ts
│   └── README.md
├── cart/
│   ├── controllers/
│   ├── services/
│   ├── routes.ts
│   └── README.md
├── orders/
├── products/
└── README.md
```

---

## 2. Clean Code Principles

### 2.1 Naming Conventions

| Type             | Convention                       | Example                          |
| ---------------- | -------------------------------- | -------------------------------- |
| Files            | camelCase or PascalCase per role | `authService.ts`, `Auth.tsx`     |
| Components       | PascalCase                       | `Auth`, `CustomerView`           |
| Hooks            | camelCase, prefix `use`          | `useAuth`, `useCart`             |
| Functions        | camelCase, verb-noun             | `getCart`, `addItem`             |
| Constants        | UPPER_SNAKE_CASE                 | `API_BASE`, `OTP_EXPIRY_MINUTES` |
| Interfaces/Types | PascalCase                       | `User`, `CartItem`               |
| Enums            | PascalCase members               | `OrderStatus.PENDING`            |

### 2.2 Function Rules

- **Single responsibility**: One function does one thing.
- **Small**: Prefer &lt; 20 lines; extract helpers if longer.
- **Descriptive names**: `validateEmail` not `validate`; `getUserById` not `getUser`.
- **Few parameters**: Prefer objects for 3+ params.

### 2.3 Imports

- Order: external (React, etc.) → internal (services, hooks) → types.
- Group with blank lines if helpful.
- No unused imports; use `tsc --noUnusedLocals` or linter.

### 2.4 Exports

- Prefer named exports.
- Use `index.ts` barrel files for folder re-exports.
- Keep default exports for page/route components only if desired.

---

## 3. Per-File Requirements

### 3.1 One Function Per File (Where It Adds Clarity)

- **Controllers**: One handler per file (e.g. `getMe.ts`, `login.ts`), re-exported from `index.ts`.
- **Services**: One main function per file (e.g. `login.ts`, `verifyOtp.ts`), re-exported from `index.ts`.
- **Utils**: Small helpers can stay in one file if closely related; otherwise split.

### 3.2 Comments

- **File header**: 2–3 lines describing the file's role.
- **Functions**: JSDoc with `@param`, `@returns`, `@throws` where useful.
- **Non-obvious logic**: Inline comment explaining _why_, not _what_.

### 3.3 Explanation File Template

Create `README.md` (or `EXPLANATION.md`) next to each folder or key file:

```markdown
# [Folder/File Name]

## Purpose

Brief description of the module's role.

## Functions

### `functionName(params)`

- **Role**: What it does.
- **Params**: Description of each.
- **Returns**: What it returns.
- **Key logic**: Important decisions or edge cases.

## Key Lines

- Line X: Why this check exists.
- Line Y: Business rule or constraint.

## Dependencies

- Uses: `api/client`, `types/User`
- Used by: `Auth.tsx`, `useAuth`
```

---

## 4. React: Separate UI, Hooks, API

| Layer     | Location                                          | Responsibility              |
| --------- | ------------------------------------------------- | --------------------------- |
| **UI**    | `ComponentName.tsx`                               | JSX, layout, event bindings |
| **Hooks** | `useComponentName.ts` or `ComponentName.hooks.ts` | State, effects, API calls   |
| **API**   | `services/*.ts` or `api/*.ts`                     | HTTP requests only          |

**Example**: `Auth.tsx` imports `useAuth` from `hooks/useAuth`; `useAuth` calls `authService` from `services/authService`. No direct `fetch` in `Auth.tsx`.

---

## 5. Node.js: Controllers, Routes, Services, Utils

| Layer           | Responsibility                                |
| --------------- | --------------------------------------------- |
| **Routes**      | Map method+path to controller                 |
| **Controllers** | Validate input, call service, format response |
| **Services**    | Business logic, DB access                     |
| **Utils**       | Pure helpers (logger, validation)             |

**Flow**: `Route → Controller → Service → DB`. Controllers do not contain business logic.

---

## 6. Migration Order

1. **Types**: Ensure `types/` is complete; remove `any` where possible.
2. **API layer**: `api/client.ts` with typed wrapper; add README.
3. **One domain (e.g. auth)**: Split controllers/services into single-function files; add comments and README.
4. **Hooks**: Extract hooks from components; ensure API calls live in services.
5. **Components**: Refactor to use hooks; add README for complex components.
6. **Repeat** for other domains (cart, orders, products, etc.).

---

## 7. Removal Checklist

- [ ] Unused imports
- [ ] Unused variables
- [ ] Dead code (unreachable branches)
- [ ] Duplicate logic (extract to shared util)
- [ ] `any` types (replace with proper types)
- [ ] Magic numbers (extract to named constants)

---

## 8. Example: api/client.ts

See `api/client.ts` and `api/README.md` for a full example with:

- TypeScript
- Single-responsibility functions
- Detailed comments
- Explanation file
