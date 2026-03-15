# Safe Production Optimization Report

**Date:** 2026-03-14  
**Scope:** Backend stability, env security, reusable components, performance, error handling. No database or API contract changes.

---

## 1. Backup

- `git add .` and commit with message: **"Production backup before safe optimization"** were run.
- **Note:** If your branch had diverged from `origin/main`, ensure you have pulled/merged or force-pushed as needed. Verify the backup commit exists on the remote.

---

## 2. Build Verification

- **Before optimization:** `npm run build` — ✅ Success  
- **After optimization:** `npm run build` — ✅ Success  
- No new runtime or type errors introduced.

---

## 3. Files Refactored / Touched

### Backend (server)

| File | Change |
|------|--------|
| `server/server.js` | Removed fallback of `SUPABASE_SERVICE_KEY` from `VITE_SUPABASE_ANON_KEY`. Server now requires explicit `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) in env. |
| `server/config/env.js` | `hasSupabaseEnv()` now requires a service key (no anon key). Warning message updated to state that anon key must not be used for server DB access. |
| `server/utils/asyncHandler.js` | **New.** Wraps async route handlers so unhandled promise rejections are passed to Express `next()` and handled by the global error handler. |
| `server/routes/cartRoutes.js` | All route handlers wrapped with `asyncHandler()`. |
| `server/routes/authRoutes.js` | Async auth controller handlers wrapped with `asyncHandler()`. |
| `server/routes/productRoutes.js` | All product/like/comment controller handlers wrapped with `asyncHandler()`. |
| `server/routes/orderRoutes.js` | All order controller handlers wrapped with `asyncHandler()`. |
| `server/routes/merchantRoutes.js` | All merchant/follow/offers handlers wrapped with `asyncHandler()`. |
| `server/routes/offersRoutes.js` | `getOffers` wrapped with `asyncHandler()`. |
| `server/routes/adminRoutes.js` | All admin and offers admin handlers wrapped with `asyncHandler()`. |

### Frontend (components)

| File | Change |
|------|--------|
| `components/ProductCard.tsx` | **New.** Reusable product card with two variants: `grid` (full catalog card with merchant, stock, condition, flash label) and `compact` (horizontal strip). Uses `React.memo`, `loading="lazy"` on images. |
| `components/OfferCard.tsx` | **New.** Reusable card for shop offers (image, title/subtitle, discount label, “Shop Now”). Uses `React.memo`, lazy-loaded image. |
| `components/PublicCatalog.tsx` | Uses `ProductCard` and `OfferCard`; removed duplicate “Popular products” section; catalog grid, popular strip, new products strip, and discount products strip now use shared components. Slightly smaller chunk size (e.g. ~38 KB vs ~42 KB gzip). |

### Existing behavior

- **CartItem:** Already implemented as `CartItemRow` in `components/CustomerShared.tsx`; no change.
- **MerchantCard:** No separate list of “merchant cards” was refactored; merchant filter in catalog remains as-is.

---

## 4. Performance Improvements

- **React.memo:** `ProductCard` and `OfferCard` are wrapped in `React.memo` to avoid unnecessary re-renders when parent state changes but props are unchanged.
- **useMemo / useCallback:** `PublicCatalog` already used `useMemo` (e.g. `paginatedProducts`, `popularProducts`, `discountProducts`, `newProducts`, `priceRange`, `merchantsList`) and `useCallback` (`fetchAndFilterProducts`); no behavior change, only reuse of extracted components.
- **Less duplication:** One “Popular products” block and one product grid implementation in `PublicCatalog`; repeated card markup replaced by `ProductCard` and `OfferCard`, reducing JSX and keeping list rendering efficient.
- **Lazy loading:** Product and offer images in `ProductCard` and `OfferCard` use `loading="lazy"` where applicable.
- **Pagination:** Catalog already paginates (e.g. `PAGE_SIZE = 12`); no new virtualization added to avoid scope/risk.

---

## 5. Stability Improvements

- **Async route wrapping:** All relevant Express route handlers in cart, auth, product, order, merchant, offers, and admin routes are wrapped with `asyncHandler(fn)`. Unhandled promise rejections in those handlers now go to `next(err)` and are handled by the existing global error handler instead of causing unhandled rejections.
- **Environment safety:** Server no longer falls back to `VITE_SUPABASE_ANON_KEY` for DB access. Production must set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) in the server environment.
- **Error handling:** Existing root `ErrorBoundary` (in `index.tsx`) continues to catch render and lazy-load errors and shows a refresh message instead of a blank page. No new API response shape or frontend error handling contracts were changed.

---

## 6. What Was Not Done (By Design)

- **Database schema:** Not modified.
- **API routes or response formats:** Not removed or changed; full backward compatibility.
- **App.tsx / PublicCatalog split:** No further file split (e.g. into many small route components) to avoid risk of breaking navigation or state.
- **MerchantCard component:** No new standalone `MerchantCard` component added; merchant filter UI unchanged.
- **Virtualization:** No react-window or similar for very long lists; pagination remains the limit for the main grid.

---

## 7. Recommended Next Steps

1. **Env:** In production (e.g. Render), set `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) explicitly; do not rely on anon key for the server.
2. **Backup:** Confirm the “Production backup before safe optimization” commit is on the remote; resolve any branch divergence (e.g. pull or push) as needed.
3. **Bundle size:** The main JS chunk is still >500 KB; consider `build.rollupOptions.output.manualChunks` or more aggressive code-splitting in a follow-up if needed.
4. **Optional:** Add `asyncHandler` to remaining route files (e.g. address, shipment, notification, chat, payment, health) for consistency.

---

## 8. Summary

| Area | Summary |
|------|--------|
| **Refactored** | Backend: env + async handlers in 7 route files. Frontend: new `ProductCard` and `OfferCard`; `PublicCatalog` uses them and one duplicate section was removed. |
| **Performance** | Memoized card components, existing useMemo/useCallback retained, lazy-loaded images, smaller catalog chunk. |
| **Stability** | Safe async wrappers on Express routes; server requires service key; existing ErrorBoundary for lazy load failures. |
| **Compatibility** | No DB, API, or response format changes; behavior preserved. |
