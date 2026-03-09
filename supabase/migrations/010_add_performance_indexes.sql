-- Performance indexes: safe to run on live DB.
-- Uses CREATE INDEX CONCURRENTLY so reads/writes are not blocked.
-- Uses IF NOT EXISTS so re-running is idempotent.
--
-- Run in Supabase SQL Editor or: psql ... -f 010_add_performance_indexes.sql
-- Important: In PostgreSQL, CREATE INDEX CONCURRENTLY cannot run inside a transaction.
-- If running as one script fails, run each CREATE INDEX statement separately (Supabase
-- SQL Editor: run one block at a time, or split by statement).

-- users: filter by status (e.g. PENDING, APPROVED); lookup by email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON public.users (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON public.users (email);

-- products: list by merchant; filter active/status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_merchant_id ON public.products (merchant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_is_active_status ON public.products (is_active, status);

-- orders: list by customer/merchant; sort by created_at desc
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_merchant_id ON public.orders (merchant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at_desc ON public.orders (created_at DESC);

-- order_items: join by order_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

-- carts: one cart per user (unique); getOrCreateCart lookup
-- Skip if you already have UNIQUE(user_id) on carts (that creates an index automatically).
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_carts_user_id_unique ON public.carts (user_id);

-- notifications: list by user, sort by created_at desc
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications (user_id, created_at DESC);
