-- =============================================================================
-- Cybersource payments: extra columns on transactions table
-- - gateway_transaction_id: external payment gateway reference (e.g. Cybersource id)
-- - currency: ISO currency code (e.g. ILS, USD)
-- =============================================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS currency TEXT;

