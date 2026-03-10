# Smart Prefetch Analysis — Palma Marketplace

**Scope:** React.lazy components and API calls. No code, routes, or logic modified.

---

## 1. Lazy-loaded components and their routes/views

All lazy-loaded components are defined in `App.tsx` and wrapped in `<Suspense fallback={<PageLoader />}>` when rendered.

| #   | Lazy component           | Source (chunk)                 | Route / view trigger                                                                                                   | When shown                                     |
| --- | ------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | **PublicWebsite**        | `./components/PublicWebsite`   | `#/` (empty hash) or `publicState === 'LANDING'`                                                                       | Guest: landing page                            |
| 2   | **PublicCatalog**        | `./components/PublicCatalog`   | `#/catalog` or `publicState === 'CATALOG'`                                                                             | Guest: product catalog                         |
| 3   | **PublicProductDetails** | `./views/PublicProductDetails` | `#/product/:id` or `currentView === 'product_details'` + `selectedProductId`                                           | Guest or logged-in: single product page        |
| 4   | **ProfileView**          | `./views/ProfileView`          | `#/profile` or `currentView === 'profile'`                                                                             | Logged-in: profile tab                         |
| 5   | **CustomerView**         | `./views/CustomerView`         | `currentView` in `home` / `shop` / `cart` / `orders_customer` for CUSTOMER; or `shop`/`cart` for MERCHANT/ADMIN/BROKER | Logged-in: shop, cart, orders (role-dependent) |
| 6   | **MerchantView**         | `./views/MerchantView`         | `currentView` = dashboard/products/orders/earnings for MERCHANT (when not shop/cart)                                   | Logged-in MERCHANT: dashboard                  |
| 7   | **AdminView**            | `./views/AdminView`            | `currentView` = users/products/orders/treasury/platform for ADMIN (when not shop/cart)                                 | Logged-in ADMIN: admin console                 |

**Route ↔ lazy component mapping (hash / state):**

| Hash / state                                     | Lazy component       |
| ------------------------------------------------ | -------------------- |
| `#/` (LANDING)                                   | PublicWebsite        |
| `#/catalog`                                      | PublicCatalog        |
| `#/product/:id` (PRODUCT_DETAILS)                | PublicProductDetails |
| `currentView === 'profile'`                      | ProfileView          |
| `currentView` in home/shop/cart/orders (by role) | CustomerView         |
| MERCHANT + dashboard/products/orders/earnings    | MerchantView         |
| ADMIN + users/products/orders/treasury/platform  | AdminView            |

---

## 2. Links/buttons that could benefit from prefetch on hover

These are the navigation targets that render a lazy component. Prefetching the **component chunk** (e.g. `import('./views/AdminView')`) on **hover** or **focus** of the link/button can make the first paint of that view faster.

### 2.1 Guest (no user)

| Location      | Control                         | Action                                      | Prefetch target                          |
| ------------- | ------------------------------- | ------------------------------------------- | ---------------------------------------- |
| PublicWebsite | “Explore products” / CTA        | `setPublicState('CATALOG')` → PublicCatalog | `import('./components/PublicCatalog')`   |
| PublicWebsite | Product card / featured product | `onViewProduct(id)` → PublicProductDetails  | `import('./views/PublicProductDetails')` |
| PublicCatalog | Product card                    | `onProductClick(id)` → PublicProductDetails | `import('./views/PublicProductDetails')` |
| PublicCatalog | Back / Logo                     | `onBack()` → PublicWebsite                  | `import('./components/PublicWebsite')`   |

### 2.2 Logged-in — Layout sidebar / nav (onTabChange)

| Role     | Tab / button                                   | Sets currentView / hash                     | Lazy component to prefetch                          |
| -------- | ---------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| CUSTOMER | Home, Shop                                     | home                                        | CustomerView                                        |
| CUSTOMER | Cart                                           | cart                                        | CustomerView                                        |
| CUSTOMER | Orders                                         | orders_customer                             | CustomerView                                        |
| CUSTOMER | Profile                                        | profile                                     | ProfileView                                         |
| MERCHANT | Dashboard, Products, Orders, Earnings          | dashboard, products, orders, earnings       | MerchantView                                        |
| MERCHANT | Shop, Cart                                     | shop, cart                                  | CustomerView                                        |
| MERCHANT | Profile                                        | profile                                     | ProfileView                                         |
| ADMIN    | Users, Products, Orders, Withdrawals, Platform | users, products, orders, treasury, platform | AdminView                                           |
| ADMIN    | Shop, Cart                                     | shop, cart                                  | CustomerView                                        |
| ADMIN    | Profile                                        | profile                                     | ProfileView                                         |
| BROKER   | Market, Earnings, Stats, Shop, Profile         | various                                     | BrokerView (not lazy) or CustomerView for shop/cart |

### 2.3 Inside views (navigate to another lazy view)

| From                                        | Control                       | To                                            | Prefetch                                 |
| ------------------------------------------- | ----------------------------- | --------------------------------------------- | ---------------------------------------- |
| Any (CustomerView, NotificationsView, etc.) | Product link / “View product” | PublicProductDetails                          | `import('./views/PublicProductDetails')` |
| Any                                         | Profile link / “View profile” | PublicProfileView (not lazy)                  | —                                        |
| ProfileView                                 | —                             | Already lazy; product click → product_details | PublicProductDetails                     |

### 2.4 Summary: highest-value hover prefetch

- **Layout tab buttons** that switch to: ProfileView, CustomerView, MerchantView, AdminView (prefetch the corresponding lazy chunk).
- **PublicWebsite**: “Explore products” → PublicCatalog; product cards → PublicProductDetails.
- **PublicCatalog**: product cards → PublicProductDetails; back → PublicWebsite.
- **CustomerView / MerchantView / AdminView**: product links → PublicProductDetails.

---

## 3. Data/API calls that could be prefetched after login

These are calls that run when a view mounts or when a tab becomes active. Prefetching **data** (not only the chunk) after login can make the first open of that view feel instant.

### 3.1 Already loaded once at app init (no change needed)

| API / data                   | Where             | When               |
| ---------------------------- | ----------------- | ------------------ |
| `authService.getMe()`        | App.tsx `initApp` | On load            |
| `productService.getAll()`    | App.tsx `initApp` | On load (for shop) |
| Guest cart from localStorage | App.tsx `initApp` | On load            |

### 3.2 Loaded when a lazy view mounts or tab activates

| View                          | API / data                                                         | When                                                           | Prefetch opportunity                                                                                              |
| ----------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **CustomerView**              | `productService.getAll()`                                          | Already in initApp; CustomerView also uses products from store | Optional: ensure products prefetched for logged-in user right after login (already done in initApp).              |
| **CustomerView** (orders tab) | `fetchMyOrders()` (checkoutApi)                                    | `useEffect` when `activeTab === 'orders'`                      | After login (CUSTOMER): prefetch “my orders” so Orders tab is fast.                                               |
| **CustomerView**              | Cart                                                               | `useCart(userId)` refetch on mount when user set               | Cart is fetched when App mounts (useCart in App). No extra prefetch needed unless you want to warm cache earlier. |
| **AdminView** (users tab)     | `userService.getAll()` + `marketStore.getWithdrawals()`            | `refreshData()` in `useEffect([])` on mount                    | After login (ADMIN): prefetch users + withdrawals so first Admin open is fast.                                    |
| **AdminView** (products tab)  | `getAdminProducts()`                                               | When `activeTab === 'products'`                                | After login (ADMIN): prefetch admin products in background so Products tab is fast.                               |
| **AdminView** (orders tab)    | `getAdminOrders()`                                                 | When `activeTab === 'orders'`                                  | After login (ADMIN): prefetch admin orders.                                                                       |
| **AdminView** (platform tab)  | `getAdminSettings()` + `getAdminPlatformEarnings()`                | When `activeTab === 'platform'`                                | After login (ADMIN): prefetch settings + earnings.                                                                |
| **MerchantView**              | `productService.getByMerchantId(user.id)`                          | `useEffect` on mount                                           | After login (MERCHANT): prefetch merchant products so dashboard/products load is fast.                            |
| **ProfileView**               | `productService.getByMerchantId(user.id)` (if MERCHANT)            | `useEffect` on mount                                           | Same as MerchantView for MERCHANT; could reuse same prefetched data.                                              |
| **PublicProductDetails**      | `productService.getById()` / `productService.fetchById(productId)` | `useEffect` when productId set                                 | On hover/focus of product link: prefetch product by ID so product page is fast.                                   |

### 3.3 Suggested post-login prefetch (by role)

- **CUSTOMER:**
  - `fetchMyOrders()` (and keep cart via existing useCart).

- **MERCHANT:**
  - `productService.getByMerchantId(user.id)` (for MerchantView and ProfileView).

- **ADMIN:**
  - `userService.getAll()` + withdrawals (for Users tab);
  - Optionally in background: `getAdminProducts()`, `getAdminOrders()`, `getAdminSettings()`, `getAdminPlatformEarnings()` so all admin tabs are fast on first click.

- **BROKER:**
  - Any broker-specific API used on BrokerView first mount (if applicable); currently BrokerView is not lazy.

---

## 4. Prefetch strategy (component vs data) — no code changes

Recommendations are **strategic only**; implementation would be separate.

### 4.1 Component prefetch (chunk)

- **When:** On **hover** or **focus** of a link/button that navigates to a lazy view.
- **What:** Call the same dynamic import used in `React.lazy` (e.g. `import('./views/AdminView')`) so the browser downloads the chunk. When the user clicks, the chunk may already be in cache.
- **Where:**
  - Layout: tab buttons for profile, shop, cart, orders, dashboard, users, products, orders, treasury, platform.
  - PublicWebsite: “Explore products”, product cards.
  - PublicCatalog: product cards, back.
  - Any product link in CustomerView, MerchantView, AdminView, NotificationsView → PublicProductDetails.
- **Risk:** Low (only fetches JS; does not change state or routing).

### 4.2 Data prefetch (API)

- **When:**
  - **After login:** By role (see 3.3), start requests in background and cache results (e.g. in context, store, or React Query).
  - **On hover over product link:** Request `productService.fetchById(id)` (or equivalent) and cache by id so PublicProductDetails can use cached data if available.
- **What:** Same API calls that the target view would run on mount/tab switch; store results in a cache layer so the view can read from cache first and optionally revalidate.
- **Where:**
  - Post-login: orders (CUSTOMER), merchant products (MERCHANT), admin users + withdrawals (+ optional products/orders/settings/earnings) (ADMIN).
  - On product link hover: product by ID for PublicProductDetails.
- **Risk:** Medium (need cache invalidation and consistency with existing useCart/useEffect logic; no change to existing code assumed here).

### 4.3 Combined strategy (conceptual)

| User action                               | Component prefetch                        | Data prefetch                                                  |
| ----------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| Hover “Explore products” (guest)          | PublicCatalog chunk                       | —                                                              |
| Hover product card (guest/catalog)        | PublicProductDetails chunk                | Product by ID                                                  |
| Hover “Profile” (logged-in)               | ProfileView chunk                         | —                                                              |
| Hover “Orders” (CUSTOMER)                 | CustomerView chunk (if not loaded)        | fetchMyOrders                                                  |
| Hover “Dashboard” / “Products” (MERCHANT) | MerchantView chunk                        | getByMerchantId (if not yet)                                   |
| Hover “Users” / “Products” / etc. (ADMIN) | AdminView chunk                           | getAll, getAdminProducts, etc. (by tab)                        |
| After login (by role)                     | Optional: prefetch chunks for default tab | Orders / merchant products / admin users (and optionally rest) |

---

## 5. Diagrams and tables

### 5.1 Lazy components and routes (flow)

```
Guest:
  #/ (LANDING)     ──► PublicWebsite (lazy)
  #/catalog        ──► PublicCatalog (lazy)
  #/product/:id    ──► PublicProductDetails (lazy)

Logged-in (Layout wraps content):
  currentView === 'profile'           ──► ProfileView (lazy)
  currentView === 'product_details'    ──► PublicProductDetails (lazy)
  CUSTOMER + home|shop|cart|orders     ──► CustomerView (lazy)
  MERCHANT + shop|cart                 ──► CustomerView (lazy)
  MERCHANT + dashboard|products|...    ──► MerchantView (lazy)
  ADMIN + shop|cart                    ──► CustomerView (lazy)
  ADMIN + users|products|orders|...   ──► AdminView (lazy)
  BROKER + shop|cart                   ──► CustomerView (lazy)
  BROKER + other                      ──► BrokerView (not lazy)
```

### 5.2 Data dependencies (views and API)

| View                      | Data on mount / tab              | API / source                                       |
| ------------------------- | -------------------------------- | -------------------------------------------------- |
| PublicWebsite             | —                                | —                                                  |
| PublicCatalog             | Products (from store)            | Already from productService.getAll() in App        |
| PublicProductDetails      | One product                      | productService.getById / fetchById(productId)      |
| ProfileView               | Merchant products (if MERCHANT)  | productService.getByMerchantId(user.id)            |
| CustomerView              | Products (store), cart (useCart) | productService.getAll (App), cartApi (useCart)     |
| CustomerView (orders tab) | Orders                           | fetchMyOrders()                                    |
| MerchantView              | Merchant products                | productService.getByMerchantId(user.id)            |
| AdminView                 | Users, withdrawals               | userService.getAll(), marketStore.getWithdrawals() |
| AdminView (products tab)  | Admin products                   | getAdminProducts()                                 |
| AdminView (orders tab)    | Admin orders                     | getAdminOrders()                                   |
| AdminView (platform tab)  | Settings, earnings               | getAdminSettings(), getAdminPlatformEarnings()     |

### 5.3 Hover targets → prefetch (summary table)

| UI element                                              | Route/view            | Component to prefetch | Data to prefetch (optional)                                                          |
| ------------------------------------------------------- | --------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| “Explore products” (LANDING)                            | Catalog               | PublicCatalog         | —                                                                                    |
| Product card (LANDING/Catalog)                          | Product details       | PublicProductDetails  | Product by ID                                                                        |
| Back (Catalog)                                          | LANDING               | PublicWebsite         | —                                                                                    |
| Tab: Profile                                            | profile               | ProfileView           | —                                                                                    |
| Tab: Home/Shop/Cart/Orders (CUSTOMER)                   | home/shop/cart/orders | CustomerView          | fetchMyOrders (for Orders)                                                           |
| Tab: Dashboard/Products/Orders/Earnings (MERCHANT)      | dashboard/…           | MerchantView          | getByMerchantId                                                                      |
| Tab: Shop/Cart (MERCHANT/ADMIN/BROKER)                  | shop/cart             | CustomerView          | —                                                                                    |
| Tab: Users/Products/Orders/Withdrawals/Platform (ADMIN) | users/…               | AdminView             | getAll, getAdminProducts, getAdminOrders, getAdminSettings, getAdminPlatformEarnings |
| Product link (any view)                                 | product_details       | PublicProductDetails  | Product by ID                                                                        |

---

## 6. Expected UX improvements (optional)

- **Time to interactive (TTI):**  
  Prefetching lazy chunks on hover reduces wait when switching tabs or opening catalog/product/profile/admin. The first click after hover can show content with minimal spinner (or none if chunk is already parsed).

- **First paint of target view:**  
  If the chunk is prefetched and (where implemented) data is prefetched, the target view can paint faster because JS and data are already in flight or cached.

- **Perceived performance:**
  - Guest: “Explore products” and product cards feel faster.
  - Logged-in: Tab switches (profile, orders, dashboard, admin tabs) feel faster.
  - Product details: Opening a product from any list can feel instant if chunk + product API are prefetched on hover.

- **No change to:**  
  Routing, role guards, auth flow, or existing component/API logic; only addition of prefetch layers (to be implemented separately).

---

_This document is analysis and recommendation only; no production code, routes, or business logic were modified._
