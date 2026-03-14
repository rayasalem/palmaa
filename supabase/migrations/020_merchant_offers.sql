-- عروض التاجر: خصم على منتج أو تصنيف كامل أو كل منتجاته، مع مدة اختيارية
-- scope: 'product' | 'category' | 'all'

CREATE TABLE IF NOT EXISTS public.merchant_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'product' CHECK (scope IN ('product', 'category', 'all')),
  product_id TEXT NULL REFERENCES public.products(id) ON DELETE SET NULL,
  category TEXT NULL,
  discount_label INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_offers_merchant ON public.merchant_offers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_offers_active ON public.merchant_offers(merchant_id, is_active, sort_order);
COMMENT ON TABLE public.merchant_offers IS 'عروض التاجر: خصم على منتج/تصنيف/كل المنتجات مع مدة اختيارية.';
