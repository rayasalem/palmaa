-- =============================================================================
-- Guest order access: secure UUID v4 token for GET /api/orders/:id without login.
-- Run in Supabase SQL Editor. No change to order id or existing columns.
-- =============================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_access_token UUID UNIQUE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_guest_access_token ON public.orders(guest_access_token) WHERE guest_access_token IS NOT NULL;

NOTIFY pgrst, 'reload schema';
