-- =============================================================================
-- Orders: store city/village for automatic shipment creation after payment.
-- Used by paymentService to create LogesTechs shipment when order is paid.
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_city_id TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_village_id TEXT;
