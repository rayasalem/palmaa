-- Scalability: composite index for catalog product list.
-- Enables fast ORDER BY created_at DESC with filter (is_active, status) at 10M+ rows.
-- Run with CONCURRENTLY to avoid blocking reads/writes (run each statement separately in Supabase SQL Editor if needed).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_catalog_list
  ON public.products (is_active, status, created_at DESC NULLS LAST);
