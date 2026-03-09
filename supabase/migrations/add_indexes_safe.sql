-- Safe, non-breaking index creation for Supabase (PostgreSQL).
--
-- CONCURRENTLY: builds indexes without blocking reads/writes (safe on live DB).
-- IF NOT EXISTS: safe to rerun; skips if index already exists.
--
-- Supabase SQL Editor: run each CREATE INDEX statement separately (one at a time).
-- If you paste all at once, the editor may wrap them in a transaction and
-- CONCURRENTLY will fail; in that case run the statements one by one.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status
  ON public.users (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
  ON public.users (email);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_merchant_id
  ON public.products (merchant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_is_active_status
  ON public.products (is_active, status);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id
  ON public.orders (customer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_merchant_id
  ON public.orders (merchant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at_desc
  ON public.orders (created_at DESC);

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- carts (UNIQUE on user_id for getOrCreateCart lookups)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS unique_carts_user_id
  ON public.carts (user_id);

-- ---------------------------------------------------------------------------
-- notifications (list by user, ordered by created_at)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_created_at
  ON public.notifications (user_id, created_at DESC);
