-- Product discounts: per-product configurable discounts
-- Adds discount_type, discount_value, is_discount_active, discount_starts_at, discount_ends_at

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('PERCENT', 'AMOUNT')) NULL,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS is_discount_active BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discount_starts_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS discount_ends_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.products.discount_type IS 'Discount type: PERCENT (percentage) or AMOUNT (fixed currency amount).';
COMMENT ON COLUMN public.products.discount_value IS 'Discount value: percent or fixed amount depending on discount_type.';
COMMENT ON COLUMN public.products.is_discount_active IS 'Whether the discount is currently active for this product.';
COMMENT ON COLUMN public.products.discount_starts_at IS 'Optional UTC datetime when discount becomes active.';
COMMENT ON COLUMN public.products.discount_ends_at IS 'Optional UTC datetime when discount stops being active.';

