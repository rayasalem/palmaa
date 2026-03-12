-- =============================================================================
-- Orders: short reference for Cybersource receipt (ORD-xxxxxxxx).
-- GET /api/orders/:id accepts UUID or this reference.
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_order_reference ON public.orders (order_reference) WHERE order_reference IS NOT NULL;

-- Backfill: ORD- + last 8 chars of id
UPDATE public.orders
SET order_reference = 'ORD-' || LOWER(SUBSTRING(REPLACE(id::text, '-', '') FROM 25 FOR 8))
WHERE order_reference IS NULL AND id IS NOT NULL;
