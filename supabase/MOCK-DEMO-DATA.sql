-- MOCK DEMO DATA FOR PALMA MARKETPLACE
-- هذا الملف يضيف بيانات تجريبية (Demo) للتطوير فقط
-- شغّله داخل Supabase (SQL editor) بعد تنفيذ setup.sql

-- ملاحظة: كل INSERT يستخدم ON CONFLICT لتقليل خطر التكرار.

-- ============================================================================
-- ملاحظة: سكيمتك فيها عمود name NOT NULL، لذلك نمرّر قيمة اسم لكل مستخدم
INSERT INTO public.users (id, email, name, role, status, subscription_type, subscription_status)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'merchant@palma.demo', 'Demo Merchant', 'MERCHANT', 'APPROVED', 'free', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'broker@palma.demo',   'Demo Broker',   'BROKER',   'APPROVED', 'free', 'active'),
  ('00000000-0000-4000-8000-000000000003', 'customer@palma.demo', 'Demo Customer', 'CUSTOMER', 'APPROVED', 'free', 'active'),
  ('00000000-0000-4000-8000-000000000004', 'admin@palma.demo',    'Demo Admin',    'ADMIN',    'APPROVED', 'free', 'active')
ON CONFLICT (email) DO NOTHING;

-- ملف تعريف التاجر (merchant_profiles) – إن لم يكن موجوداً يمكنك تجاهل هذا القسم أو تعديله
INSERT INTO public.merchant_profiles (user_id, business_name, logo_url)
SELECT u.id, 'Demo Merchant', 'https://via.placeholder.com/80?text=Merchant'
FROM public.users u
WHERE u.email = 'merchant@palma.demo'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 2) منتجات تجريبية (عدة تصنيفات/categories)
-- ============================================================================

WITH m AS (
  SELECT id AS merchant_id
  FROM public.users
  WHERE email = 'merchant@palma.demo'
),
base_products AS (
  SELECT
    merchant_id,
    jsonb_build_array(
      -- Electronics
      jsonb_build_object('title','iPhone 14','category','electronics','price',3500,'is_bestseller',true),
      jsonb_build_object('title','Samsung TV 55"','category','electronics','price',2800,'is_bestseller',false),
      jsonb_build_object('title','Gaming Laptop','category','electronics','price',5200,'is_bestseller',true),
      jsonb_build_object('title','Wireless Headphones','category','electronics','price',650,'is_bestseller',false),
      jsonb_build_object('title','Smart Watch','category','electronics','price',480,'is_bestseller',false),
      -- Furniture
      jsonb_build_object('title','Leather Sofa','category','furniture','price',1500,'is_bestseller',false),
      jsonb_build_object('title','Office Desk','category','furniture','price',700,'is_bestseller',false),
      jsonb_build_object('title','Ergonomic Chair','category','furniture','price',550,'is_bestseller',true),
      -- Fashion
      jsonb_build_object('title','Running Shoes','category','fashion','price',350,'is_bestseller',true),
      jsonb_build_object('title','Casual T-Shirt','category','fashion','price',120,'is_bestseller',false),
      jsonb_build_object('title','Denim Jacket','category','fashion','price',260,'is_bestseller',false),
      -- Home appliances
      jsonb_build_object('title','Blender Pro','category','home_appliances','price',220,'is_bestseller',false),
      jsonb_build_object('title','Air Fryer','category','home_appliances','price',430,'is_bestseller',true),
      jsonb_build_object('title','Vacuum Cleaner','category','home_appliances','price',390,'is_bestseller',false),
      -- Groceries
      jsonb_build_object('title','Organic Olive Oil','category','groceries','price',80,'is_bestseller',true),
      jsonb_build_object('title','Premium Coffee Beans','category','groceries','price',65,'is_bestseller',false),
      jsonb_build_object('title','Assorted Nuts Pack','category','groceries','price',55,'is_bestseller',false),
      -- Beauty & personal care
      jsonb_build_object('title','Face Moisturizer','category','beauty','price',95,'is_bestseller',false),
      jsonb_build_object('title','Perfume Classic','category','beauty','price',320,'is_bestseller',true),
      -- Sports & outdoors
      jsonb_build_object('title','Yoga Mat','category','sports','price',140,'is_bestseller',false),
      jsonb_build_object('title','Dumbbell Set','category','sports','price',260,'is_bestseller',false),
      -- Books & stationery
      jsonb_build_object('title','Productivity Planner','category','stationery','price',60,'is_bestseller',false),
      jsonb_build_object('title','Business Strategy Book','category','books','price',75,'is_bestseller',false)
    ) AS items
  FROM m
)
INSERT INTO public.products (
  id,
  merchant_id,
  title,
  name,
  description,
  price,
  price_ils,
  stock,
  category,
  status,
  is_active,
  condition,
  images,
  image_url,
  is_bestseller,
  created_at,
  updated_at
)
SELECT
  concat('demo-prod-', (i->>'title')) AS id,
  bp.merchant_id,
  i->>'title' AS title,
  i->>'title' AS name,
  concat('Demo product: ', i->>'title') AS description,
  (i->>'price')::numeric AS price,
  (i->>'price')::numeric AS price_ils,
  50 AS stock,
  i->>'category' AS category,
  'active' AS status,
  true AS is_active,
  'new' AS condition,
  ARRAY['https://via.placeholder.com/600x400?text=' || replace(i->>'title',' ','+')]::text[] AS images,
  'https://via.placeholder.com/600x400?text=' || replace(i->>'title',' ','+') AS image_url,
  COALESCE((i->>'is_bestseller')::boolean, false) AS is_bestseller,
  now() AS created_at,
  now() AS updated_at
FROM base_products bp,
LATERAL jsonb_array_elements(bp.items) AS i
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3) عروض المتجر العامة (shop_offers)
-- ============================================================================

INSERT INTO public.shop_offers (
  id,
  type,
  title,
  subtitle,
  discount_label,
  image_url,
  product_id,
  sort_order,
  is_active,
  scope,
  category,
  starts_at,
  ends_at
)
SELECT
  '00000000-0000-4000-9000-000000000001' AS id,
  'product' AS type,
  'خصم 20% على iPhone 14' AS title,
  'لفترة محدودة' AS subtitle,
  20 AS discount_label,
  'https://via.placeholder.com/800x300?text=iPhone+Offer' AS image_url,
  p.id AS product_id,
  1 AS sort_order,
  true AS is_active,
  'product' AS scope,
  NULL AS category,
  now() - interval '1 day' AS starts_at,
  now() + interval '7 days' AS ends_at
FROM public.products p
WHERE p.id = 'demo-prod-iPhone 14'
ON CONFLICT (id) DO NOTHING;

-- عرض عام على فئة electronics
INSERT INTO public.shop_offers (
  id,
  type,
  title,
  subtitle,
  discount_label,
  image_url,
  product_id,
  sort_order,
  is_active,
  scope,
  category,
  starts_at,
  ends_at
)
VALUES (
  '00000000-0000-4000-9000-000000000002',
  'custom',
  'خصومات على الإلكترونيات',
  'خصم حتى 15% على الإلكترونيات',
  15,
  'https://via.placeholder.com/800x300?text=Electronics+Sale',
  NULL,
  2,
  true,
  'category',
  'electronics',
  now() - interval '1 day',
  now() + interval '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4) عروض التاجر (merchant_offers)
-- ============================================================================

INSERT INTO public.merchant_offers (
  id,
  merchant_id,
  scope,
  product_id,
  category,
  discount_label,
  title,
  starts_at,
  ends_at,
  is_active,
  sort_order
)
SELECT
  '00000000-0000-4000-9000-000000000003' AS id,
  u.id AS merchant_id,
  'all' AS scope,
  NULL AS product_id,
  NULL AS category,
  10 AS discount_label,
  '10% على كل منتجات التاجر' AS title,
  now() - interval '1 day' AS starts_at,
  now() + interval '30 days' AS ends_at,
  true AS is_active,
  1 AS sort_order
FROM public.users u
WHERE u.email = 'merchant@palma.demo'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5) منتجات مشتركة (shared_products) للوسيط (Broker)
-- ============================================================================

WITH broker AS (
  SELECT id AS broker_id FROM public.users WHERE email = 'broker@palma.demo'
),
prod AS (
  SELECT id AS product_id FROM public.products ORDER BY created_at DESC LIMIT 3
)
INSERT INTO public.shared_products (
  id,
  broker_id,
  product_id,
  marketing_title,
  marketing_description,
  custom_discount_text,
  is_featured,
  clicks,
  sales,
  shared_at
)
SELECT
  gen_random_uuid() AS id,
  b.broker_id,
  p.product_id,
  'عرض الوسيط على ' || p.product_id AS marketing_title,
  'منتجات مختارة من التاجر لعرضها عبر الوسيط' AS marketing_description,
  'خصم إضافي عبر رابط الوسيط' AS custom_discount_text,
  true AS is_featured,
  0 AS clicks,
  0 AS sales,
  now() AS shared_at
FROM broker b, prod p
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6) بيانات بسيطة للزبون: عربة فارغة + إشعار ترحيبي (اختياري)
-- ============================================================================

INSERT INTO public.notifications (id, user_id, type, message, is_read)
SELECT gen_random_uuid(), u.id, 'WELCOME', 'مرحباً بك في متجر Palma التجريبي 👋', false
FROM public.users u
WHERE u.email = 'customer@palma.demo'
ON CONFLICT DO NOTHING;

-- 6.2 عربة تسوق ديمو + عناصر
WITH customer AS (
  SELECT id AS customer_id FROM public.users WHERE email = 'customer@palma.demo'
),
cart_row AS (
  INSERT INTO public.carts (id, user_id, created_at, updated_at)
  SELECT
    '00000000-0000-5000-8000-000000000001' AS id,
    c.customer_id,
    now() AS created_at,
    now() AS updated_at
  FROM customer c
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id, user_id
),
sample_products AS (
  SELECT id, price FROM public.products ORDER BY created_at ASC LIMIT 3
)
INSERT INTO public.cart_items (id, cart_id, product_id, quantity, price)
SELECT
  gen_random_uuid() AS id,
  cr.id AS cart_id,
  p.id AS product_id,
  1 + (row_number() OVER ())::int AS quantity,
  p.price AS price
FROM cart_row cr
JOIN sample_products p ON true
ON CONFLICT DO NOTHING;

-- 6.3 طلب مكتمل + عناصره
WITH customer AS (
  SELECT id AS customer_id FROM public.users WHERE email = 'customer@palma.demo'
),
merchant AS (
  SELECT id AS merchant_id FROM public.users WHERE email = 'merchant@palma.demo'
),
order_row AS (
  INSERT INTO public.orders (id, customer_id, merchant_id, status, total_amount, created_at, updated_at)
  SELECT
    '00000000-0000-6000-8000-000000000001' AS id,
    c.customer_id,
    m.merchant_id,
    'COMPLETED' AS status,
    0 AS total_amount,
    now() - interval '2 days' AS created_at,
    now() - interval '1 days' AS updated_at
  FROM customer c, merchant m
  ON CONFLICT (id) DO NOTHING
  RETURNING id
),
order_products AS (
  SELECT id, price FROM public.products ORDER BY created_at ASC LIMIT 2
)
INSERT INTO public.order_items (id, order_id, product_id, quantity, price)
SELECT
  gen_random_uuid() AS id,
  o.id AS order_id,
  p.id AS product_id,
  1 + (row_number() OVER ())::int AS quantity,
  p.price AS price
FROM order_row o
JOIN order_products p ON true
ON CONFLICT DO NOTHING;

-- 6.4 + 6.5 تقييم الزبون للتاجر على الطلب (بدون جدول chats)
-- 6.4 تقييم الزبون للتاجر على الطلب (تُدار من تطبيق آخر؛ لا يوجد جدول ratings في هذه السكيمة)

