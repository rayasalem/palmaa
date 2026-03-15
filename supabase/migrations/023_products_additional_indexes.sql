-- Additional indexes for products to support up to 10M rows safely.
-- Safe: additive only; no data or schema removals.
-- Run on STAGING first, then on PRODUCTION. Each CREATE INDEX CONCURRENTLY
-- should be executed separately in Supabase SQL editor if necessary.
--
-- This migration ensures the following indexes exist:
-- 1) products(merchant_id)                 -- already covered by 010/add_indexes_safe
-- 2) products(created_at DESC)            -- for generic sorting by created_at
-- 3) products(price)                      -- for price-based sorting
-- 4) products(status, is_active)          -- already covered by 010/add_indexes_safe
-- 5) products(status, is_active, created_at DESC)  -- composite catalog index

-- Single-column index on created_at for generic ORDER BY created_at DESC.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at_desc
  ON public.products (created_at DESC);

-- Single-column index on price for ORDER BY price asc/desc.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price
  ON public.products (price);

-- Composite index for catalog queries with explicit status/is_active filter and created_at sort.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status_is_active_created_at_desc
  ON public.products (status, is_active, created_at DESC);

