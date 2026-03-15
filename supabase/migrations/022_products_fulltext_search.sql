-- Full-Text Search (FTS) on products for name + title + description.
-- Safe: additive only; no data deletion or modification of existing columns.
-- Run on STAGING first, verify search and API; then run on production.
-- Each statement can be run separately in Supabase SQL Editor if needed.
-- After migration: set USE_PRODUCT_FTS=true in server env to use FTS; otherwise ILIKE is used (fallback).

-- Add tsvector column (generated from name, title, description). Use 'simple' config for language-neutral search.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

-- GIN index for fast FTS. Run with CONCURRENTLY to avoid blocking (run this statement alone if needed).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tsv
  ON public.products USING GIN (tsv);
