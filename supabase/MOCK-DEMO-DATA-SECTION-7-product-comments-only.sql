-- ============================================================================
-- قسم 7 فقط (اختياري): تعليقات الديمو — للملف الكامل استخدم MOCK-DEMO-DATA.sql فقط
-- انسخ هذا الملف إذا أردت إصلاح التعليقات فقط دون إعادة باقي الموك
-- الشروط: setup.sql + users + products الديمو (أو المنتجات من MOCK-DEMO-DATA)
-- setup.sql بدون عمود rating؛ هذا السطر يضيفه إن لم يكن موجوداً
-- ============================================================================

ALTER TABLE public.product_comments
  ADD COLUMN IF NOT EXISTS rating SMALLINT DEFAULT 5
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

INSERT INTO public.product_comments (id, product_id, user_id, content, rating, created_at)
SELECT
  'd7e00001-0000-4000-8000-000000000001'::uuid AS id,
  p.product_id,
  u.customer_id,
  'منتج ممتاز، الجودة رائعة والتغليف مرتب.',
  5,
  now() - interval '3 days'
FROM (
  SELECT id AS customer_id FROM public.users WHERE email = 'customer@palma.demo' LIMIT 1
) u
CROSS JOIN (
  SELECT id AS product_id FROM public.products WHERE id = 'demo-prod-عصير برتقال طازج' LIMIT 1
) p
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_comments (id, product_id, user_id, content, rating, created_at)
SELECT
  'd7e00002-0000-4000-8000-000000000002'::uuid AS id,
  p.product_id,
  u.customer_id,
  'الطعم جيد لكن السعر مرتفع قليلاً.',
  4,
  now() - interval '2 days'
FROM (
  SELECT id AS customer_id FROM public.users WHERE email = 'customer@palma.demo' LIMIT 1
) u
CROSS JOIN (
  SELECT id AS product_id FROM public.products WHERE id = 'demo-prod-قهوة عربية' LIMIT 1
) p
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_comments (id, product_id, user_id, content, rating, created_at)
SELECT
  'd7e00003-0000-4000-8000-000000000003'::uuid AS id,
  p.product_id,
  b.broker_id,
  'هاتف مناسب جداً للزبائن الذين يبحثون عن أداء قوي مع كاميرا ممتازة.',
  5,
  now() - interval '1 day'
FROM (
  SELECT id AS broker_id FROM public.users WHERE email = 'broker@palma.demo' LIMIT 1
) b
CROSS JOIN (
  SELECT id AS product_id FROM public.products WHERE id = 'demo-prod-iPhone 14' LIMIT 1
) p
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_comments (id, product_id, user_id, content, rating, created_at)
SELECT
  'd7e00004-0000-4000-8000-000000000004'::uuid AS id,
  p.product_id,
  b.broker_id,
  'بعت أكثر من جهاز من هذا الموديل، رضا الزبائن عالي والتقييمات ممتازة.',
  5,
  now() - interval '6 hours'
FROM (
  SELECT id AS broker_id FROM public.users WHERE email = 'broker@palma.demo' LIMIT 1
) b
CROSS JOIN (
  SELECT id AS product_id FROM public.products WHERE id = 'demo-prod-iPhone 14' LIMIT 1
) p
ON CONFLICT (id) DO NOTHING;
