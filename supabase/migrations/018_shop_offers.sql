-- قسم العروض في المتجر: الإدمن يضيف عروضاً (بطاقة مخصصة أو منتج)
-- type: 'custom' = بطاقة مخصصة (عنوان، وصف، نسبة)، 'product' = عرض منتج معيّن

CREATE TABLE IF NOT EXISTS public.shop_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('custom', 'product')),
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NULL,
  discount_label INT NOT NULL DEFAULT 0,
  image_url TEXT NULL,
  product_id TEXT NULL REFERENCES public.products(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_offers_active_order ON public.shop_offers(is_active, sort_order);
COMMENT ON TABLE public.shop_offers IS 'عروض المتجر: يديرها الإدمن (بطاقة مخصصة أو منتج).';
