-- =============================================================================
-- Backfill merchant & broker subscription fields
-- - Merchants: free, active, no end date (lifetime free)
-- - Brokers: one-month free trial starting now when fields are NULL
-- =============================================================================

DO $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1) Merchants – always free, no expiry
  UPDATE public.users
  SET
    subscription_type        = 'free',
    subscription_start_date  = COALESCE(subscription_start_date, v_now),
    subscription_end_date    = NULL,
    subscription_status      = 'active'
  WHERE UPPER(role::text) = 'MERCHANT';

  -- 2) Brokers – free trial 30 days when not already set
  UPDATE public.users
  SET
    subscription_type        = COALESCE(subscription_type, 'free'),
    subscription_start_date  = COALESCE(subscription_start_date, v_now),
    subscription_end_date    = COALESCE(subscription_end_date, v_now + INTERVAL '30 days'),
    subscription_status      = COALESCE(subscription_status, 'active')
  WHERE UPPER(role::text) = 'BROKER';
END $$;

