# Multi-User Refactor – Palma Marketplace

This document describes the **multi-user design**, **database schema**, **folder structure**, and **implementation checklist** for a TypeScript, multi-user-ready React + Node.js marketplace.

---

## 1. Multi-User Capabilities

| Capability | Description | Storage |
|------------|-------------|---------|
| **Cart per user** | Each logged-in user has a cart; items persist in DB and sync across devices. | `carts`, `cart_items` |
| **Purchases** | Each user places orders independently; orders already have `customer_id`. | `orders`, `order_items` |
| **Likes** | User-product likes; one like per (user, product). | `product_likes` |
| **Comments** | User-product comments; list per product. | `product_comments` |
| **Ratings** | Aggregate rating per product (e.g. from reviews). | `reviews` (or product.rating) |
| **Admin flows** | Admin approves/rejects users; admin/merchant can message about products. | `users.status`, `admin_product_messages` |
| **Notifications** | User gets notified (e.g. new like, comment, order). | `notifications` |

---

## 2. Database Schema (Additional / Existing)

### 2.1 Existing Tables (Summary)

- **users** – id, email, name, role, status, …
- **products** – id (TEXT), merchant_id, name, price_ils, stock, …
- **orders** – id, customer_id, merchant_id, total_amount, status, …
- **order_items** – order_id, product_id, quantity, price
- **follows** – follower_id, following_id (or customer_id, merchant_id in schema-follow)
- **product_likes** – product_id, user_id (schema-follow-interaction.sql)
- **product_comments** – product_id, user_id, content (schema-follow-interaction.sql)
- **notifications** – user_id, type, reference_id, is_read

### 2.2 New Tables for Multi-User

**carts** – one per user (active cart).

- `id` UUID PRIMARY KEY
- `user_id` UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, UNIQUE
- `created_at`, `updated_at` TIMESTAMPTZ

**cart_items** – items in a cart.

- `id` UUID PRIMARY KEY
- `cart_id` UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE
- `product_id` TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE
- `quantity` INT NOT NULL CHECK (quantity > 0)
- `price` NUMERIC NOT NULL (snapshot at add time)
- `created_at` TIMESTAMPTZ
- UNIQUE(cart_id, product_id)

**admin_product_messages** (optional) – messages between admin/merchant about a product.

- `id` UUID PRIMARY KEY
- `product_id` TEXT NOT NULL REFERENCES products(id)
- `from_user_id` UUID NOT NULL REFERENCES users(id)
- `to_user_id` UUID REFERENCES users(id) (e.g. merchant)
- `message` TEXT NOT NULL
- `created_at` TIMESTAMPTZ

---

## 3. Folder Structure

### 3.1 Frontend (React + TypeScript)

```
├── api/                 # Base client (fetch, API_BASE, credentials)
├── types/                # Shared types (User, Product, CartItem, Order, …)
├── services/             # API calls (auth, cart, orders, products, interactions)
├── hooks/                # useAuth, useCart, useProduct, …
├── components/           # UI components (Auth, Layout, …)
├── views/                # Page-level views (CustomerView, CheckoutPage, …)
└── content/              # Static copy
```

- **Cart**: `services/cartApi.ts` (getCart, addItem, updateQuantity, removeItem, clearCart).  
- **Hook**: `hooks/useCart.ts` – fetches cart on mount when user is set, exposes add/update/remove/clear and local state.

### 3.2 Backend (Node.js + TypeScript)

```
server/
├── types/                # Request/response and DB model types
├── config/
├── middlewares/
├── auth/                 # Auth domain (TS)
├── cart/                 # Cart domain (TS): controllers, services, routes
├── routes/               # Legacy JS routes (orders, products, …)
├── controllers/
├── services/
└── utils/
```

- **Cart**: `server/cart/` – getCart (by user from JWT), addItem, updateQuantity, removeItem, clearCart; all require `authenticate` middleware.

---

## 4. API Contracts (Cart)

- **GET /api/cart** – Returns current user’s cart with items (product_id, quantity, price, product snapshot if needed). 401 if not logged in.
- **POST /api/cart/items** – Body: `{ product_id, quantity }`. Add or merge; price from products table. Returns updated cart.
- **PATCH /api/cart/items/:productId** – Body: `{ quantity }`. Update quantity; remove if quantity ≤ 0.
- **DELETE /api/cart/items/:productId** – Remove item.
- **DELETE /api/cart** – Clear cart.

All responses: `{ success: true, cart: { id, user_id, items: [...] } }` or `{ success: false, error: string }`.

---

## 5. Implementation Checklist

- [x] DB: Add `carts` and `cart_items` (and optional `admin_product_messages`) – see `supabase/migrations/002_carts_and_admin_messages.sql`.
- [x] Backend: Cart service + controller + routes; mount under `/api/cart` (auth required).
- [x] Backend: Types for cart request/response and DB models in `server/types/index.ts`.
- [x] Frontend: `services/cartApi.ts` calling `/api/cart` with credentials.
- [x] Frontend: `hooks/useCart.ts` – load cart when user logs in, expose add/update/remove/clear/refetch.
- [x] Frontend: App uses `useCart(user?.id)`; when user is set, cart is from API; guest cart stays in localStorage and is merged into backend on login.
- [x] Likes/comments/notifications: already stored in DB and used by existing APIs (`product_likes`, `product_comments`, `notifications`).
- [x] Optional: `admin_product_messages` table created; API can be added later.
- [ ] Optional: Email notifications (e.g. NodeMailer) for order confirmation, comment reply, etc.

---

## 6. Concurrency Notes

- **Simultaneous purchases**: Orders are per `customer_id`; no shared cart at checkout. Create order from current cart snapshot and then clear or lock cart.
- **Cart consistency**: Use DB as source of truth; frontend updates optimistically and refetches after mutations.
- **Likes/comments**: Already per user and product; unique constraints prevent duplicates.

This refactor keeps the existing behavior for orders, likes, comments, and admin (user status), and adds **per-user persisted carts** and optional admin messaging, with a clear path to full TypeScript and typed APIs.
