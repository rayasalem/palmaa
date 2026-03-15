-- View: products_with_merchant
-- Purpose: Reduce database round-trips for product listing by returning merchant_name
-- and merchant_status in a single query.
-- This view is read-only and additive; it does not modify existing tables or data.
--
-- Columns:
--   - All columns from public.products (p.*)
--   - merchant_status: users.status for the merchant (may be NULL)
--   - merchant_name: COALESCE(merchant_profiles.business_name, users.company_name, users.name, 'Merchant')
--
-- Usage:
--   - Backend services can query public.products_with_merchant instead of public.products
--     to get merchant_name without extra queries to users / merchant_profiles.
--
-- Notes:
--   - Existing indexes on public.products are still used by the planner through this view.
--   - RLS policies on public.products continue to apply to the view.

CREATE OR REPLACE VIEW public.products_with_merchant AS
SELECT
  p.*,
  u.status AS merchant_status,
  COALESCE(mp.business_name, u.company_name, u.name, 'Merchant') AS merchant_name
FROM public.products AS p
LEFT JOIN public.users AS u
  ON u.id = p.merchant_id
LEFT JOIN public.merchant_profiles AS mp
  ON mp.user_id = p.merchant_id;

