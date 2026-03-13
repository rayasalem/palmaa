-- =============================================================================
-- order_profits.order_item_id: allow TEXT to match order_items.id (ITM-xxxxxxxx).
-- Fixes: invalid input syntax for type uuid: "ITM-bafed8b3"
-- =============================================================================

ALTER TABLE public.order_profits
  ALTER COLUMN order_item_id TYPE TEXT USING order_item_id::text;

COMMENT ON COLUMN public.order_profits.order_item_id IS 'References order_items.id (e.g. ITM-xxxxxxxx) when present; NULL allowed.';
