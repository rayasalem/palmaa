# React Optimization Suggestions — Palma Marketplace

**Read-only analysis.** No source code, routes, or business logic were modified.

---

## 1. React hooks usage per file and purpose

### 1.1 Summary table

| File | useState | useReducer | useEffect | useMemo | useCallback | useRef | Purpose (summary) |
|------|----------|------------|-----------|---------|-------------|--------|------------------|
| **App.tsx** | 17 | 0 | 5 | 0 | 3 | 2 | User, view, cart, lang, public state, hash sync, init, session, guest cart merge |
| **Auth.tsx** | 17 | 0 | 2 | 0 | 0 | 0 | Login/register form, verification, forgot-password UI |
| **CustomerView.tsx** | 15+ | 0 | 6 | 6 | 6 | 0 | Shop/cart/orders, checkout form, filters, cart selection, orders fetch |
| **AdminView.tsx** | 16 | 1 | 3 | 4 | 8 | 0 | Users/products/orders/treasury/platform, delete modal reducer, filters |
| **MerchantView.tsx** | 10+ | 0 | 2 | 0 | 0 | 0 | Products, orders, form, upload, delete modal |
| **ProfileView.tsx** | 14+ | 0 | 1+ | 2 | 0 | 2 | Profile form, merchant products, location, product form |
| **PublicProductDetails.tsx** | 16 | 0 | 3 | 1 | 0 | 0 | Product fetch, images, rating, comments, likes |
| **PublicCatalog.tsx** | 10 | 0 | 2 | 0 | 1 | 0 | Search, sort, filters, fetch products |
| **PublicWebsite.tsx** | 3 | 0 | 1 | 0 | 0 | 0 | Products, lang/mobile menus |
| **BrokerView.tsx** | 8+ | 0 | 1 | 0 | 0 | 0 | Tabs, products, shared meta, marketing modal |
| **Layout.tsx** | 2 | 0 | 0 | 0 | 0 | 0 | Mobile menu, lang menu |
| **ToastProvider.tsx** | 1 | 0 | 0 | 0 | 2 | 0 | Toasts list, add/remove |
| **useCart.ts** | 3 | 0 | 1 | 0 | 5 | 0 | Cart state, loading, API sync |
| **useAuth.ts** | — | — | — | — | — | — | Auth actions (if used) |
| **CheckoutPage.tsx** | 5+ | 0 | 1 | 0 | 0 | 0 | Checkout form, total |
| **CheckoutReturnPage.tsx** | 3+ | 0 | 1 | 0 | 1 | 0 | Order fetch, return state |
| **VerifyEmail.tsx** | 4 | 0 | 0 | 0 | 0 | 0 | Verification UI |
| **RegisterMerchant.tsx** | 16 | 0 | 0 | 2 | 0 | 0 | Form, cities/villages |
| **RegisterBroker.tsx** | 12 | 0 | 0 | 2 | 0 | 0 | Form, cities/villages |
| **RegisterCustomer.tsx** | 8 | 0 | 0 | 0 | 0 | 0 | Form |
| **PublicProfileView.tsx** | 6+ | 0 | 1 | 0 | 0 | 0 | Profile fetch, products |
| **PublicBrokerPage.tsx** | 2 | 0 | 1 | 0 | 0 | 0 | Broker fetch, shared |
| **NotificationsView.tsx** | 4+ | 0 | 1 | 0 | 0 | 0 | Notifications list |
| **PageLoader.tsx** | 0 | 0 | 0 | 0 | 0 | 0 | Presentational only |

---

### 1.2 Hook usage detail (selected files)

**App.tsx**  
- **useState:** user, currentView, localCart, authView, lang, publicState, publicBrokerId, selectedProductId, selectedProfileId, checkoutReturn*, showApiCheckout, checkoutCart, showMerchantTermsPage, pendingAuthAfterTerms.  
- **useCallback:** setLang, updateHash, applyHashToState.  
- **useRef:** isApplyingHashRef, mergedGuestCartRef.  
- **useEffect:** applyHashToState + hashchange, lang→document.dir, initApp, SESSION_EXPIRED, merge guest cart on login.

**CustomerView.tsx**  
- **useMemo:** cities, availableVillages, selectedCartItems, totalAmount, displayOrders, filteredShopProducts, previewPayload.  
- **useCallback:** loadApiOrders, handleAddToCart, handleRemoveFromCart, toggleCartSelection, selectAllCart, handleCategorySelect.  
- **useEffect:** activeTab↔view, products load, selectedCartIds sync with cart, loadApiOrders when orders tab, palma-refresh-orders, syncStatuses (orders).

**AdminView.tsx**  
- **useReducer:** deleteModal (userToDelete, deleteReason, deleteLoading).  
- **useMemo:** filteredUsers, pendingCount, pendingWithdrawals, filteredProducts.  
- **useCallback:** handleStatusChange, openDeleteUserModal, closeDeleteUserModal, confirmDeleteUser, handleRestoreUser, handleProductToggleActive, handleProductDelete, handleWithdrawal.  
- **useEffect:** activeTab from view, refreshData on mount, load products/orders/platform when tab changes.

**PublicProductDetails.tsx**  
- **useState:** ratingInput, commentInput, socialCommentInput, isSubmitting, hoverRating, quantity, activeImgIndex, isImageLoading, product, isLoadingProduct, isLiked, likesCount, comments, likeLoading, commentLoading.  
- **useMemo:** images (from product).  
- **useEffect:** fetch product by id, scroll, other side effects.

---

## 2. Lazy-loaded components and routes/views

All lazy components are defined in **App.tsx** and rendered inside `<Suspense fallback={<PageLoader />}>`.

| Lazy component | Chunk (import path) | Route / view trigger |
|----------------|---------------------|----------------------|
| **PublicWebsite** | `./components/PublicWebsite` | `#/` or `publicState === 'LANDING'` (guest) |
| **PublicCatalog** | `./components/PublicCatalog` | `#/catalog` or `publicState === 'CATALOG'` (guest) |
| **PublicProductDetails** | `./views/PublicProductDetails` | `#/product/:id` or `currentView === 'product_details'` (guest or logged-in) |
| **ProfileView** | `./views/ProfileView` | `currentView === 'profile'` (logged-in) |
| **CustomerView** | `./views/CustomerView` | CUSTOMER: home/shop/cart/orders; MERCHANT/ADMIN/BROKER: shop/cart |
| **MerchantView** | `./views/MerchantView` | MERCHANT: dashboard/products/orders/earnings (when not shop/cart) |
| **AdminView** | `./views/AdminView` | ADMIN: users/products/orders/treasury/platform (when not shop/cart) |

**Diagram: Lazy component ↔ route**

```
Guest:
  #/ (LANDING)     ──► PublicWebsite
  #/catalog        ──► PublicCatalog
  #/product/:id    ──► PublicProductDetails

Logged-in (inside Layout):
  currentView === 'profile'        ──► ProfileView
  currentView === 'product_details' ──► PublicProductDetails
  CUSTOMER  home|shop|cart|orders  ──► CustomerView
  MERCHANT  shop|cart              ──► CustomerView
  MERCHANT  dashboard|products|... ──► MerchantView
  ADMIN     shop|cart              ──► CustomerView
  ADMIN     users|products|...     ──► AdminView
  BROKER    shop|cart              ──► CustomerView
  BROKER    other                  ──► BrokerView (not lazy)
```

---

## 3. Inline functions inside `.map()` and repeated calculations in render

### 3.1 Inline functions inside `.map()`

| File | Location | Pattern | Suggestion |
|------|----------|---------|------------|
| **MerchantView.tsx** | Tab buttons | `onClick={() => setActiveTab(tab.id)}` in map | Pass stable `onTabChange` and call with tab.id inside child or use data attribute. |
| **MerchantView.tsx** | Product list | `products.map(product => (... onClick={() => onViewProduct(product.id)}, handleToggleStatus(product), etc.))` | Extract ProductRow (or reuse pattern) with React.memo; pass stable callbacks. |
| **MerchantView.tsx** | Orders list | `orders.map(order => (... onClick={() => createShipment(order)}, handleCheckStatus(order), etc.))` | Extract OrderRow with React.memo; pass stable callbacks. |
| **BrokerView.tsx** | Tab buttons | `onClick={() => onTabChange(tab.id)}` in map | Same as MerchantView tabs. |
| **BrokerView.tsx** | `products.map(p => ...)` | Multiple onClick with `() => onViewProduct(p.id)`, `() => openShareModal(p.id, existingShare)`, etc. | Extract Broker product card component with React.memo; pass stable callbacks. |
| **BrokerView.tsx** | `sharedMeta.slice().sort(...).map(s => ...)` | Inline onClick handlers per item | Extract portfolio row/card with React.memo. |
| **BrokerView.tsx** | `myCommissions.map(c => ...)` | Inline handlers | Extract commission row with React.memo if list is long. |
| **PublicProductDetails.tsx** | `comments.map(c => ...)`, `reviews.slice().reverse().map(rev => ...)`, `[1,2,3,4,5].map(star => ...)` | Inline handlers in map | Optional: small memoized subcomponents for list items. |
| **ProfileView.tsx** | `cities.map`, `availableVillages.map`, `PRODUCT_CATEGORIES.map`, `(prods).map(p => ...)` | Options/options lists and product cards | Category/option lists are usually small; product list could use memoized card. |
| **PublicProfileView.tsx** | `products.map(p => ...)`, `sharedProducts.map(s => ...)` | Product cards with inline onClick | Extract product card with React.memo; pass stable onProductClick. |
| **PublicBrokerPage.tsx** | `shared.map(s => ...)` | Shared product cards | Extract card component with React.memo. |
| **CustomerView.tsx** | `displayOrders` reversed and mapped | `(apiOrders.length > 0 ? [...displayOrders].reverse() : ...).map(o => ...)` with inline onClick for status/cancel | Extract OrderCard with React.memo; pass stable handlers. |
| **AdminView.tsx** | `pendingWithdrawals.map(w => ...)` | Inline `onClick={() => handleWithdrawal(w.id, 'APPROVED')}` etc. | Extract WithdrawalRow with React.memo; pass handleWithdrawal and w.id. |

### 3.2 Repeated calculations in render (candidates for useMemo)

| File | Calculation | Current | Suggestion |
|------|-------------|---------|------------|
| **CustomerView.tsx** | `myOrders = marketStore.getOrders().filter(o => o.customer_id === user.id \|\| o.customerId === user.id)` | Recalculated every render | Wrap in `useMemo(..., [user.id])` (or deps that change when store orders change if available). |
| **CustomerView.tsx** | `cart.reduce((a, b) => a + b.quantity, 0)` (in App, passed as cartCount) | In App.tsx: `cartCount={cart.reduce(...)}` every render | In App, use `const cartCount = useMemo(() => cart.reduce((a, b) => a + b.quantity, 0), [cart])` and pass cartCount. |
| **CheckoutPage.tsx** | `totalAmount = cart.reduce(...)`, `suggestedWeight = Math.max(0.5, cart.reduce(...))` | Recalculated every render | useMemo for totalAmount and suggestedWeight with [cart]. |
| **NotificationsView.tsx** | `unreadCount = list.filter((n) => !n.is_read).length` | Recalculated every render | useMemo with [list]. |
| **ProfileView.tsx** | Filtered products in profile (filter by name/category before map) | base filter in render | If filtered list is derived from state, wrap in useMemo. |
| **MerchantView.tsx** | `marketStore.getOrders().filter(o => o.merchantId === user.id \|\| ...)` (fallback orders) | Inside effect/handler; if also used in render, could be memoized | useMemo if same filter is used in render path. |

---

## 4. Images using `loading="lazy"` and further improvements

### 4.1 Current usage of `loading="lazy"`

| File | Context |
|------|--------|
| **CustomerView.tsx** | ShopProductCard image; CartItemRow image; Order item product image in orders list |
| **AdminView.tsx** | ProductRow image in products table |
| **PublicProfileView.tsx** | Profile avatar; product grid images (two places) |
| **MerchantView.tsx** | Product form gallery image; product list card image |
| **PublicWebsite.tsx** | Hero/featured images (two places) |
| **PublicCatalog.tsx** | Product card image in grid |
| **PublicBrokerPage.tsx** | Broker avatar; shared product image |
| **ProfileView.tsx** | Product form preview; user avatar; product grid image |

### 4.2 Suggestions (no code change)

- **Keep** `loading="lazy"` on all list/grid images (below-the-fold or off-screen).
- **Above-the-fold:** Hero image on PublicWebsite or first visible product image can stay lazy (default) or use `loading="eager"` only if it is the LCP element and critical.
- **Dimensions:** Where possible, ensure `width`/`height` or `aspect-ratio` are set to reduce layout shift (CLS); many cards already use aspect-ratio classes.
- **Decoding:** Optional `decoding="async"` on large images can help main thread (browser default is often async).
- **No change to existing markup required;** these are optional refinements if you add optimizations later.

---

## 5. Components that could benefit from React.memo

### 5.1 Already wrapped with React.memo

- **AdminView.tsx:** UserRow, ProductRow.
- **CustomerView.tsx:** ShopProductCard, CartItemRow, CategoryPill.

### 5.2 Good candidates for React.memo (suggestions only)

| Component / location | File | Reason |
|----------------------|------|--------|
| **Broker product card** (in products grid) | BrokerView.tsx | Rendered in `products.map`; many inline handlers; re-renders when parent state changes. |
| **Broker portfolio row** (sharedMeta.map) | BrokerView.tsx | Same as above for portfolio list. |
| **Merchant product row/card** | MerchantView.tsx | Rendered in `products.map`; multiple callbacks per row. |
| **Merchant order row** | MerchantView.tsx | Rendered in `orders.map`; createShipment, handleCheckStatus, handleCancelShipment. |
| **Admin withdrawal row** | AdminView.tsx | Rendered in `pendingWithdrawals.map`; approve/reject handlers. |
| **Customer order card** | CustomerView.tsx | Rendered in displayOrders.map; track/cancel handlers. |
| **PublicProfileView product card** | PublicProfileView.tsx | Rendered in products.map; onProductClick. |
| **PublicBrokerPage shared product card** | PublicBrokerPage.tsx | Rendered in shared.map. |
| **PublicProductDetails** comment/review item | PublicProductDetails.tsx | If list is long; optional. |
| **Layout sidebar nav item** | Layout.tsx | Tab buttons in userMenuItems.map; stable callback would help. |

---

## 6. Prefetch opportunities (summary)

*(Detailed analysis is in PREFETCH_ANALYSIS.md; below is a short reference.)*

### 6.1 Component prefetch (chunk) on hover/focus

| Trigger | Lazy component to prefetch |
|---------|-----------------------------|
| Guest: “Explore products”, product card, back from catalog | PublicCatalog, PublicProductDetails, PublicWebsite |
| Logged-in: Layout tab “Profile” | ProfileView |
| Logged-in: Layout tab “Home”/“Shop”/“Cart”/“Orders” (CUSTOMER) | CustomerView |
| Logged-in: Layout tab “Dashboard”/“Products”/… (MERCHANT) | MerchantView |
| Logged-in: Layout tab “Shop”/“Cart” (MERCHANT/ADMIN/BROKER) | CustomerView |
| Logged-in: Layout tab “Users”/“Products”/… (ADMIN) | AdminView |
| Any product link (e.g. from CustomerView, MerchantView, AdminView) | PublicProductDetails |

### 6.2 API prefetch after login (by role)

| Role | API / data to prefetch |
|------|-------------------------|
| **CUSTOMER** | fetchMyOrders() so Orders tab is fast; cart already from useCart. |
| **MERCHANT** | productService.getByMerchantId(user.id) for dashboard/products. |
| **ADMIN** | userService.getAll() + withdrawals (users tab); optionally getAdminProducts(), getAdminOrders(), getAdminSettings(), getAdminPlatformEarnings() for other tabs. |
| **BROKER** | Any broker-specific data used on first BrokerView mount. |

### 6.3 API prefetch on hover (product link)

- **PublicProductDetails:** Prefetch `productService.fetchById(productId)` (or equivalent) when user hovers/focuses a product link so the product page can show cached data immediately.

**Table: API prefetch per role (after login)**

| Role | Suggested prefetch (no code change) |
|------|-------------------------------------|
| CUSTOMER | fetchMyOrders() |
| MERCHANT | getByMerchantId(user.id) |
| ADMIN | getAll() + getWithdrawals(); optional: getAdminProducts(), getAdminOrders(), getAdminSettings(), getAdminPlatformEarnings() |
| BROKER | Broker-specific APIs for first view |

---

## 7. useCallback opportunities (suggestions only)

| File | Handler / pattern | Note |
|------|-------------------|------|
| **App.tsx** | handleLogin, handleLogout, handleViewProduct, handleViewProfile, openAuth, addToCart, removeFromCart, updateQuantity, clearCart | Many passed to children; wrapping in useCallback with correct deps can avoid unnecessary re-renders of lazy children when props are compared. |
| **MerchantView.tsx** | setActiveTab (tab id), handleToggleStatus, handleEditClick, handleDeleteProduct, createShipment, handleCheckStatus, handleCancelShipment, refreshData | Stable callbacks help if product/order row components are wrapped with React.memo. |
| **BrokerView.tsx** | onTabChange, openShareModal, handleGenLink, handleToggleFeatured, handleRemoveShare | Same as above for Broker cards/rows. |
| **Layout.tsx** | onTabChange passed to sidebar buttons | Already receives from App; App can pass useCallback. |
| **PublicProductDetails.tsx** | Handlers passed to child or used in list (e.g. submit comment, set rating) | useCallback can help if comment/review items are memoized. |
| **ProfileView.tsx** | Form and product handlers | useCallback if subcomponents are memoized. |
| **PublicProfileView.tsx** | onProductClick | Often from props; parent (App) can pass useCallback. |

---

## 8. useMemo opportunities (suggestions only)

| File | Value | Suggestion |
|------|--------|------------|
| **App.tsx** | `cartCount = cart.reduce((a, b) => a + b.quantity, 0)` | useMemo with [cart]. |
| **CustomerView.tsx** | `myOrders = marketStore.getOrders().filter(...)` | useMemo with [user.id] (and store dependency if observable). |
| **CheckoutPage.tsx** | totalAmount, suggestedWeight from cart | useMemo with [cart]. |
| **NotificationsView.tsx** | unreadCount from list | useMemo with [list]. |
| **MerchantView.tsx** | Orders filtered by merchant (if used in render) | useMemo with [user.id, orders]. |
| **BrokerView.tsx** | sharedMeta.slice().sort(...) in portfolio | useMemo with [sharedMeta]. |
| **PublicCatalog.tsx** | filteredProducts (if not already from state) | Already using setFilteredProducts in effect; could derive with useMemo from products + filters if data is in memory. |

---

## 9. Improvement summary (logical only)

- **Prefetch:** Chunk prefetch on hover/focus for links that lead to lazy views; API prefetch after login by role and optional product prefetch on product-link hover.
- **Memoization:** useMemo for cartCount (App), myOrders (CustomerView), totalAmount/suggestedWeight (CheckoutPage), unreadCount (NotificationsView), and any derived list used in render (e.g. sorted/filtered lists).
- **React.memo:** List item components in BrokerView (product card, portfolio row), MerchantView (product row, order row), AdminView (withdrawal row), CustomerView (order card), PublicProfileView/PublicBrokerPage (product card).
- **useCallback:** Handlers passed to memoized list items or to lazy-loaded views (in App and in view components) so reference equality reduces re-renders.
- **Images:** Keep loading="lazy"; optionally optimize LCP image and add dimensions/decoding where useful; no change required.

---

*This document is analysis and suggestion only; no production code was modified.*
