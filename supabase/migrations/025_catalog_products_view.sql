-- View: catalog_products_view
-- Purpose: Single-query catalog listing with merchant name and avatar to reduce
-- database round-trips (products + users + merchant_profiles) while preserving
-- existing API response structure.
--
-- Columns:
--   - All columns from public.products (p.*)
--   - merchant_status: users.status for the merchant (for filtering/suppression)
--   - merchant_name: COALESCE(merchant_profiles.business_name, users.company_name, users.name, 'Merchant')
--   - merchant_avatar: COALESCE(merchant_profiles.logo_url, users.logo_url, users.profile_image)
--
-- Notes:
--   - This view is read-only and additive; it does not modify existing data.
--   - Existing indexes on public.products (including catalog indexes) are still usable via this view.

CREATE OR REPLACE VIEW public.catalog_products_view AS
SELECT
  p.*,
  u.status AS merchant_status,
  COALESCE(mp.business_name, u.company_name, u.name, 'Merchant') AS merchant_name,
  COALESCE(mp.logo_url, u.logo_url, u.profile_image) AS merchant_avatar
FROM public.products AS p
LEFT JOIN public.users AS u
  ON u.id = p.merchant_id
LEFT JOIN public.merchant_profiles AS mp
  ON mp.user_id = p.merchant_id;

