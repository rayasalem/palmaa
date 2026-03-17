-- =============================================================================
-- Palma Marketplace — كل تعديلات الداتابيس (migrations) في ملف واحد
-- =============================================================================
-- الاستخدام:
--   - قاعدة جديدة: شغّل الملف كاملاً بعد إنشاء الجداول الأساسية (users, products, orders, ...).
--   - قاعدة موجودة: آمن التشغيل؛ معظم الأوامر تستخدم IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
--   - هذا الملف يستخدم CREATE INDEX (بدون CONCURRENTLY) ليعمل داخل Supabase SQL Editor دون خطأ transaction.
-- =============================================================================

-- =============================================================================
-- 002 — Multi-user: carts, cart_items, admin_product_messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

CREATE TABLE IF NOT EXISTS public.admin_product_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_product_messages_product_id ON public.admin_product_messages(product_id);
CREATE INDEX IF NOT EXISTS idx_admin_product_messages_from_user ON public.admin_product_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_product_messages_to_user ON public.admin_product_messages(to_user_id);

-- =============================================================================
-- 003 — Order profits: broker_id on orders, order_profits table
-- =============================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_broker_id ON public.orders(broker_id);

CREATE TABLE IF NOT EXISTS public.order_profits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID NULL,
    party_type TEXT NOT NULL CHECK (party_type IN ('merchant', 'store', 'broker')),
    party_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    amount_ils NUMERIC NOT NULL CHECK (amount_ils >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_profits_order_id ON public.order_profits(order_id);
CREATE INDEX IF NOT EXISTS idx_order_profits_party ON public.order_profits(party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_order_profits_created_at ON public.order_profits(created_at);
COMMENT ON TABLE public.order_profits IS 'تسجيل أرباح التاجر (85%)، المتجر (15% أو 12% مع وسيط)، الوسيط (3%) عند إتمام الدفع';

-- =============================================================================
-- 004 — Merchant: subscriptions, order settlements, transactions, invoices
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_type') THEN
    ALTER TABLE public.users ADD COLUMN subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'paid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_start_date') THEN
    ALTER TABLE public.users ADD COLUMN subscription_start_date TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_end_date') THEN
    ALTER TABLE public.users ADD COLUMN subscription_end_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_status') THEN
    ALTER TABLE public.users ADD COLUMN subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired'));
  END IF;
END $$;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_uploaded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_verified_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_file_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS total_amount NUMERIC;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tax_penalty_amount NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_net_amount NUMERIC;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash', 'online'));
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS invoice_uploaded BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON public.transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.users.subscription_type IS 'free | paid';
COMMENT ON COLUMN public.users.subscription_status IS 'active | expired';
COMMENT ON COLUMN public.orders.invoice_uploaded IS 'Tax invoice uploaded for this order (electronic payment)';
COMMENT ON COLUMN public.orders.completed_at IS 'Order completed: delivery + product match confirmed; merchant eligible for payout';

-- =============================================================================
-- 005 — Product condition
-- =============================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'new'
  CHECK (condition IN (
    'new', 'used_like_new', 'used_good', 'used_fair', 'refurbished', 'open_box', 'vintage'
  ));
CREATE INDEX IF NOT EXISTS idx_products_condition ON public.products(condition);

-- =============================================================================
-- 006 — Cybersource payments: gateway_transaction_id, currency on transactions
-- =============================================================================
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS currency TEXT;

-- =============================================================================
-- 007 — Backfill merchant & broker subscription fields
-- =============================================================================
DO $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  UPDATE public.users
  SET
    subscription_type        = 'free',
    subscription_start_date  = COALESCE(subscription_start_date, v_now),
    subscription_end_date    = NULL,
    subscription_status      = 'active'
  WHERE UPPER(role::text) = 'MERCHANT';

  UPDATE public.users
  SET
    subscription_type        = COALESCE(subscription_type, 'free'),
    subscription_start_date  = COALESCE(subscription_start_date, v_now),
    subscription_end_date    = COALESCE(subscription_end_date, v_now + INTERVAL '30 days'),
    subscription_status      = COALESCE(subscription_status, 'active')
  WHERE UPPER(role::text) = 'BROKER';
END $$;

-- =============================================================================
-- 008 — (اختياري) إزالة البيانات التجريبية — شغّله مرة واحدة فقط إن احتجت
-- =============================================================================
-- DELETE FROM public.commissions;
-- DELETE FROM public.transactions;
-- DELETE FROM public.order_items;
-- DELETE FROM public.orders;
-- DELETE FROM public.cart_items;
-- DELETE FROM public.carts;
-- DELETE FROM public.shared_products;
-- DELETE FROM public.likes;
-- DELETE FROM public.comments;
-- DELETE FROM public.reviews;
-- DELETE FROM public.products;
-- DELETE FROM public.withdrawals WHERE user_id IN (SELECT id FROM public.users WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo'));
-- DELETE FROM public.follows WHERE follower_id IN (SELECT id FROM public.users WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo')) OR following_id IN (SELECT id FROM public.users WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo'));
-- DELETE FROM public.merchant_profiles WHERE user_id IN (SELECT id FROM public.users WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo'));
-- DELETE FROM public.users WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo');

-- =============================================================================
-- 009 — Guest order access token
-- =============================================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_access_token UUID UNIQUE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_guest_access_token ON public.orders(guest_access_token) WHERE guest_access_token IS NOT NULL;

-- =============================================================================
-- 010 — Performance indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users (status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON public.products (merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active_status ON public.products (is_active, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders (merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_user_id_unique ON public.carts (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications (user_id, created_at DESC);

-- =============================================================================
-- 011 — token_version and MFA
-- =============================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.users.token_version IS 'Incremented on logout-all; JWT ver claim must match to be valid.';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mfa_secret text;
COMMENT ON COLUMN public.users.mfa_enabled IS 'When true, login requires MFA challenge after password.';
COMMENT ON COLUMN public.users.mfa_secret IS 'TOTP secret; null when mfa_enabled is false.';

-- =============================================================================
-- 012 — Orders: shipping city/village for shipment
-- =============================================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_city_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_village_id TEXT;

-- =============================================================================
-- 013 — Orders: order_reference (ORD-xxxxxxxx)
-- =============================================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_reference TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_order_reference ON public.orders (order_reference) WHERE order_reference IS NOT NULL;
UPDATE public.orders
SET order_reference = 'ORD-' || LOWER(SUBSTRING(REPLACE(id::text, '-', '') FROM 25 FOR 8))
WHERE order_reference IS NULL AND id IS NOT NULL;

-- =============================================================================
-- 014 — order_profits.order_item_id as TEXT
-- =============================================================================
ALTER TABLE public.order_profits
  ALTER COLUMN order_item_id TYPE TEXT USING order_item_id::text;
COMMENT ON COLUMN public.order_profits.order_item_id IS 'References order_items.id (e.g. ITM-xxxxxxxx) when present; NULL allowed.';

-- =============================================================================
-- 015 — Product discounts
-- =============================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('PERCENT', 'AMOUNT')) NULL,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS is_discount_active BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discount_starts_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS discount_ends_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN public.products.discount_type IS 'PERCENT or AMOUNT.';
COMMENT ON COLUMN public.products.discount_value IS 'Percent or fixed amount.';
COMMENT ON COLUMN public.products.is_discount_active IS 'Whether the discount is currently active.';
COMMENT ON COLUMN public.products.discount_starts_at IS 'Optional UTC datetime when discount becomes active.';
COMMENT ON COLUMN public.products.discount_ends_at IS 'Optional UTC datetime when discount stops.';

-- =============================================================================
-- 017 — Gamification: user_points, referrals
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_points (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  loyalty_level TEXT NOT NULL DEFAULT 'BRONZE',
  referred_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.user_points IS 'Accumulated points and loyalty level per user (for gamification).';

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id TEXT NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  reward_points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rewarded_at TIMESTAMPTZ NULL
);
COMMENT ON TABLE public.referrals IS 'Referral rewards per referrer/referred pair.';

-- =============================================================================
-- 018 — shop_offers
-- =============================================================================
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

-- =============================================================================
-- 019 — shop_offers: scope, category, starts_at, ends_at
-- =============================================================================
ALTER TABLE public.shop_offers
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'product' CHECK (scope IN ('product', 'category', 'all'));
ALTER TABLE public.shop_offers ADD COLUMN IF NOT EXISTS category TEXT NULL;
ALTER TABLE public.shop_offers ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ NULL;
ALTER TABLE public.shop_offers ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN public.shop_offers.scope IS 'نطاق الخصم: product | category | all';
COMMENT ON COLUMN public.shop_offers.category IS 'تصنيف المنتجات عند scope=category';

-- =============================================================================
-- 020 — merchant_offers
-- =============================================================================
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

-- =============================================================================
-- 021 — products catalog index
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_products_catalog_list
  ON public.products (is_active, status, created_at DESC NULLS LAST);

-- =============================================================================
-- 022 — Full-Text Search on products
-- =============================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_products_tsv ON public.products USING GIN (tsv);

-- =============================================================================
-- 023 — Additional products indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_products_created_at_desc ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products (price);
CREATE INDEX IF NOT EXISTS idx_products_status_is_active_created_at_desc
  ON public.products (status, is_active, created_at DESC);

-- =============================================================================
-- 024 — View: products_with_merchant
-- =============================================================================
CREATE OR REPLACE VIEW public.products_with_merchant AS
SELECT
  p.*,
  u.status AS merchant_status,
  COALESCE(mp.business_name, u.company_name, u.name, 'Merchant') AS merchant_name
FROM public.products AS p
LEFT JOIN public.users AS u ON u.id = p.merchant_id
LEFT JOIN public.merchant_profiles AS mp ON mp.user_id = p.merchant_id;

-- =============================================================================
-- 025 — View: catalog_products_view
-- =============================================================================
CREATE OR REPLACE VIEW public.catalog_products_view AS
SELECT
  p.*,
  u.status AS merchant_status,
  COALESCE(mp.business_name, u.company_name, u.name, 'Merchant') AS merchant_name,
  COALESCE(mp.logo_url, u.logo_url, u.profile_image) AS merchant_avatar
FROM public.products AS p
LEFT JOIN public.users AS u ON u.id = p.merchant_id
LEFT JOIN public.merchant_profiles AS mp ON mp.user_id = p.merchant_id;

-- =============================================================================
-- add_indexes_safe (تكرار آمن مع IF NOT EXISTS)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users (status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON public.products (merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active_status ON public.products (is_active, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders (merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_carts_user_id ON public.carts (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications (user_id, created_at DESC);

-- =============================================================================
-- تعليقات المنتجات + إعجابات + إشعارات (للتعليق وإشعار التاجر)
-- =============================================================================
-- product_comments: تعليقات الزبون على المنتج (يُشعر التاجر عند الإضافة)
CREATE TABLE IF NOT EXISTS public.product_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_comments_product_id ON public.product_comments(product_id);

-- product_likes: إعجاب بمنتج
CREATE TABLE IF NOT EXISTS public.product_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_product_likes_product_id ON public.product_likes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_likes_user_id ON public.product_likes(user_id);

-- notifications: إشعارات (reference_id = product_id أو user_id حسب النوع؛ TEXT يدعم UUID و product_id)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reference_id TEXT,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- إذا كان الجدول موجوداً مسبقاً و reference_id من نوع UUID، شغّل: ALTER TABLE public.notifications ALTER COLUMN reference_id TYPE TEXT USING reference_id::text;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications (user_id, created_at DESC);

-- =============================================================================
-- Order status: PENDING, ACCEPTED, IN_PROGRESS, ON_THE_WAY, COMPLETED, CANCELLED
-- =============================================================================
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
-- Normalize legacy values to uppercase before adding constraint
UPDATE public.orders SET status = 'COMPLETED' WHERE LOWER(TRIM(status)) = 'completed';
UPDATE public.orders SET status = 'PENDING'   WHERE LOWER(TRIM(status)) = 'pending';
UPDATE public.orders SET status = 'CANCELLED' WHERE LOWER(TRIM(status)) = 'cancelled';

-- Force any invalid / NULL statuses to a safe default before constraint
UPDATE public.orders
SET status = 'PENDING'
WHERE status IS NULL
   OR TRIM(status) = ''
   OR UPPER(TRIM(status)) NOT IN ('PENDING','ACCEPTED','IN_PROGRESS','ON_THE_WAY','COMPLETED','CANCELLED');

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'ON_THE_WAY', 'COMPLETED', 'CANCELLED'));

-- =============================================================================
-- نهاية setup.sql
-- =============================================================================
