# Safe Refactoring Plan – Production-Safe Improvements

**Goal:** Improve code quality from ~6/10 to ~8/10 without breaking existing functionality.  
**Constraints:** No API or schema changes; no feature removal; all changes backward compatible and independently deployable.

---

## Progress (Completed)

| Step | Status |
|------|--------|
| 1.1 Add Global React Error Boundary | ✅ Done |
| 1.2 Remove unsafe password fallback | ✅ Done |
| 2.1 adminApi use shared api() | ✅ Done |
| 2.2 userService use shared api() | ✅ Done |
| 6.2 Document store.ts (facade) | ✅ Done |

---

## Phase 1: Error Resilience & Security (Deploy First)

### Step 1.1 – Add Global React Error Boundary ✅ (Done)
- **What:** Wrap the app in a single Error Boundary component that catches render errors and shows a fallback UI (message + “Reload” button).
- **Why:** Prevents a single component error from blanking the entire app.
- **Risk:** None. No logic or data flow change.
- **Files:** New `components/ErrorBoundary.tsx`; wrap in `index.tsx` or `App.tsx`.

### Step 1.2 – Remove Unsafe Password Fallback ✅ (Done)
- **What:** In `CustomerView`, replace `user.password || 'password'` with `user.password ?? ''` when calling `cancelLogestechsShipment`. Never send a literal default password.
- **Why:** Eliminates insecure fallback; if backend requires password, it will fail explicitly.
- **Risk:** Low. Current FlashLine cancel is mock or “not configured”; no production dependency on the literal `'password'`.
- **Files:** `views/CustomerView.tsx`.

---

## Phase 2: API Client Standardization (Incremental)

### Step 2.1 – Use `api()` in adminApi ✅ (Done)
- **What:** Refactor `getAdminProducts()` (and other functions in `services/adminApi.ts`) to use `api<T>()` from `api/client.ts` instead of raw `fetch` + manual JSON/headers. Keep same URLs and response shapes.
- **Why:** Centralized 401 handling, consistent headers, less duplication.
- **Risk:** Low. Same endpoints and responses; only the client helper changes.
- **Files:** `services/adminApi.ts`.

### Step 2.2 – Use `api()` in authService (optional next)
- **What:** Replace raw `fetch` in login, me, logout, forgot-password, reset-password with `api()` where possible. Preserve cookie/credential handling if any.
- **Risk:** Medium. Auth is critical; test login/logout/me and password flows after change.
- **Files:** `services/authService.ts`.

### Step 2.3 – Use `api()` in userService ✅ (Done), chatApi, brokerApi
- **What:** Same pattern: replace `fetch(getApiBase() + path, ...)` with `api(path, options)`. No URL or response contract change.
- **Risk:** Low per service if tests pass.
- **Files:** `services/userService.ts`, `services/chatApi.ts`, `services/brokerApi.ts`.

---

## Phase 3: Component Decomposition (Non-Breaking Splits)

### Step 3.1 – Extract CustomerView Checkout Form
- **What:** Move the checkout form (shipping fields, city/village, summary) into a component e.g. `CheckoutForm.tsx` in `views/` or `components/`. Pass props (shippingData, setShippingData, handlers, lang, t). Do not change any state shape or submit logic.
- **Why:** Shrinks CustomerView and isolates checkout UI.
- **Risk:** Low. Pure extraction; same props and callbacks.
- **Files:** New `views/CheckoutForm.tsx` (or under `components/`); `views/CustomerView.tsx` (import and render).

### Step 3.2 – Extract CustomerView Shop Category Section
- **What:** Move the “الأكثر طلباً” + main category groups + “عرض المزيد” block into e.g. `ShopCategorySection.tsx`. Pass category state, handlers, lang, t.
- **Risk:** Low. No API or route change.
- **Files:** New component; `CustomerView.tsx`.

### Step 3.3 – Extract MerchantView Product Form
- **What:** Move the add/edit product form into `MerchantProductForm.tsx`. Same state and callbacks; no logic change.
- **Risk:** Low.
- **Files:** New component; `MerchantView.tsx`.

### Step 3.4 – Extract AdminView Tabs into Sub-Components
- **What:** One component per tab (UsersTab, ProductsTab, OrdersTab, WithdrawalsTab, PlatformTab). Each receives current data and handlers from AdminView. No change to data fetching or API.
- **Risk:** Low.
- **Files:** New files under `views/admin/` or `views/Admin*Tab.tsx`; `AdminView.tsx` composes them.

---

## Phase 4: Shared UI Primitives (Preserve Design)

### Step 4.1 – Single ConfirmDialog / Modal Primitive
- **What:** Introduce `components/ConfirmDialog.tsx` (or extend `ConfirmModal`) with a single, consistent API: open/close, title, message, confirm/cancel labels, onConfirm, onCancel, loading. Replace inline “fixed inset-0” modals in AdminView (delete user, delete product) and similar in MerchantView/CustomerView with this primitive. Keep the same copy and behavior.
- **Why:** One place to fix a11y and styling; less duplication.
- **Risk:** Low. Same UX and callbacks.
- **Files:** `components/ConfirmModal.tsx` (extend) or new `ConfirmDialog.tsx`; then AdminView, MerchantView, CustomerView.

### Step 4.2 – Reusable Table Wrapper (Optional)
- **What:** If multiple views use similar table layout (header row + body), extract a `DataTable.tsx` that accepts columns config and rows. Use in AdminView products/users, MerchantView orders, etc. Do not change column definitions or row rendering logic initially; only wrap.
- **Risk:** Low.
- **Files:** New `components/DataTable.tsx`; then refactor one view at a time.

---

## Phase 5: Performance (Safe Optimizations)

### Step 5.1 – Memoize Heavy List Items
- **What:** Ensure list item components (e.g. order rows, product rows in admin) are wrapped in `React.memo` with stable callbacks. Use `useCallback` for handlers passed to list items where missing.
- **Risk:** Very low. No behavior change.
- **Files:** CustomerView, MerchantView, AdminView (list subcomponents).

### Step 5.2 – Avoid Duplicate Product Fetch
- **What:** If the same product by ID is fetched in multiple places, consider a small cache (e.g. in productService or a hook) keyed by id with TTL, or ensure prefetch is used so duplicate calls are rare.
- **Risk:** Low. Can be done behind existing API.
- **Files:** `services/productService.ts` or `hooks/useProduct.ts`.

### Step 5.3 – Keep Lazy Loading and Prefetch
- **What:** No change. Only verify existing lazy loading and prefetch remain in place and are not removed during refactors.
- **Risk:** None.

---

## Phase 6: Architecture Stabilization (No API Change)

### Step 6.1 – Move API Calls Out of Views
- **What:** Where a view directly calls `fetch` or a service that is not the canonical service for that domain, move the call into the appropriate service and have the view call the service only. Example: if a view builds a URL and calls fetch, move that to a function in `api/client` or the right service.
- **Risk:** Low if URLs and payloads are unchanged.
- **Files:** Per-view audit; one view at a time.

### Step 6.2 – Document Store vs Services ✅ (Done)
- **What:** Add a short comment in `store.ts` that `marketStore` is a compatibility facade; new code should prefer direct service imports. Do not remove or change store API.
- **Risk:** None.
- **Files:** `store.ts` (comment added).

---

## Phase 7: Production Safety Checklist (Before Each Deploy)

- [ ] Routing: hash routes and `currentView` / `publicState` still resolve to the same views.
- [ ] APIs: no URL, method, or request/response shape change for any endpoint.
- [ ] Database: no schema or query contract change.
- [ ] Auth: login, logout, token refresh, and protected routes behave the same.
- [ ] Cart: guest and logged-in cart merge and persistence unchanged.
- [ ] Checkout: payment and shipment flows unchanged.

---

## Implementation Order (Recommended)

1. ~~**Step 1.1** – Error Boundary~~ ✅  
2. ~~**Step 1.2** – Password fallback~~ ✅  
3. ~~**Step 2.1** – adminApi uses `api()`~~ ✅  
4. ~~**Step 2.3** – userService uses `api()`~~ ✅  
5. ~~**Step 6.2** – Document store~~ ✅  
6. **Step 3.1** – Checkout form extraction (next)  
7. **Step 4.1** – ConfirmDialog primitive and replace one modal  
8. **Step 5.1** – Memoize list items where missing  
9. Then: 2.2 authService, 2.3 chatApi/brokerApi, remaining phases.

---

## Out of Scope (Do Not Do in This Plan)

- Changing backend routes or request/response formats.
- Database migrations or new tables.
- Removing or renaming existing features or routes.
- Replacing hash routing with a different router (would require careful rollout).
- Changing auth mechanism (e.g. moving token from localStorage to cookie only) without a separate, dedicated change.

---

*This plan is designed so each step can be shipped independently and verified in staging before production.*
