-- =============================================================================
-- Product condition: add scalable condition field to products table
-- Values are enforced via CHECK constraint; default is 'new' for backwards compatibility.
-- =============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'new'
  CHECK (condition IN (
    'new',
    'used_like_new',
    'used_good',
    'used_fair',
    'refurbished',
    'open_box',
    'vintage'
  ));

CREATE INDEX IF NOT EXISTS idx_products_condition ON public.products(condition);

