-- نطاق العرض (منتج واحد / تصنيف / كل المنتجات) + مدة الصلاحية
-- scope: 'product' = product_id معيّن، 'category' = تصنيف معيّن، 'all' = كل المنتجات

ALTER TABLE public.shop_offers
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'product'
    CHECK (scope IN ('product', 'category', 'all'));

ALTER TABLE public.shop_offers
  ADD COLUMN IF NOT EXISTS category TEXT NULL;

ALTER TABLE public.shop_offers
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ NULL;

ALTER TABLE public.shop_offers
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.shop_offers.scope IS 'نطاق الخصم: product = منتج معيّن، category = تصنيف، all = كل المنتجات';
COMMENT ON COLUMN public.shop_offers.category IS 'تصنيف المنتجات عند scope=category';
COMMENT ON COLUMN public.shop_offers.starts_at IS 'بداية صلاحية العرض (اختياري)';
COMMENT ON COLUMN public.shop_offers.ends_at IS 'نهاية صلاحية العرض (اختياري)';
