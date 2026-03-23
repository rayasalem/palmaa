-- MOCK DEMO DATA FOR PALMA MARKETPLACE — ملف واحد كامل (كل الموك داتا هنا)
-- هذا الملف يضيف بيانات تجريبية (Demo) للتطوير فقط
--
-- الترتيب: 1) نفّذ setup.sql أولاً (السكيمة + الفهارس). 2) ثم هذا الملف كاملاً في SQL Editor.
-- لا يُفترض أن يوقع الموقع: أعمدة/جداول ناقصة تُضاف هنا بـ IF NOT EXISTS حيث يلزم.
--
-- ملاحظة: معظم الـ INSERT تستخدم ON CONFLICT لتقليل التكرار عند إعادة التشغيل.

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
SELECT u.id, 'Demo Merchant', 'https://picsum.photos/seed/palma-merchant-logo/80/80'
FROM public.users u
WHERE u.email = 'merchant@palma.demo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.merchant_profiles mp
    WHERE mp.user_id = u.id
  );

-- ============================================================================
-- 2) منتجات تجريبية (عدة تصنيفات/categories)
-- كل منتج له image_url يطابق اسمه (نفس معنى description: Demo product: {title})
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
      -- عصائر / مشروبات / أكل  (صورة لكل صنف حسب الاسم، لا حسب التصنيف فقط)
      jsonb_build_object('title','عصير برتقال طازج','category','عصائر','price',12,'is_bestseller',true,'image_url','https://images.pexels.com/photos/158053/fresh-orange-juice-oranges-158053.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','عصير تفاح','category','عصائر','price',10,'is_bestseller',false,'image_url','https://images.pexels.com/photos/7750304/pexels-photo-7750304.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','بيبسي 2 لتر','category','مشروبات غازية','price',8,'is_bestseller',false,'image_url','https://images.pexels.com/photos/5920745/pexels-photo-5920745.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','شاي أخضر','category','مشروبات ساخنة','price',25,'is_bestseller',false,'image_url','https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','قهوة عربية','category','مشروبات ساخنة','price',45,'is_bestseller',true,'image_url','https://images.pexels.com/photos/691954/pexels-photo-691954.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','ماء معدني 6 حبات','category','مياه','price',6,'is_bestseller',false,'image_url','https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','حليب طازج 1 لتر','category','مشروبات ألبان','price',9,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3737692/pexels-photo-3737692.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','لبن زبادي','category','مشروبات ألبان','price',7,'is_bestseller',false,'image_url','https://images.pexels.com/photos/302680/pexels-photo-302680.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','تفاح أحمر كيلو','category','فواكه','price',15,'is_bestseller',true,'image_url','https://images.pexels.com/photos/206959/pexels-photo-206959.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','موز طازج','category','فواكه','price',12,'is_bestseller',false,'image_url','https://images.pexels.com/photos/594576/pexels-photo-594576.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','طماطم كيلو','category','خضروات','price',8,'is_bestseller',false,'image_url','https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','خيار طازج','category','خضروات','price',6,'is_bestseller',false,'image_url','https://images.pexels.com/photos/1437389/pexels-photo-1437389.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','جبنة بيضاء 500غ','category','ألبان وأجبان','price',28,'is_bestseller',false,'image_url','https://images.pexels.com/photos/4109951/pexels-photo-4109951.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','لبنة بلدية','category','ألبان وأجبان','price',22,'is_bestseller',false,'image_url','https://images.pexels.com/photos/5961792/pexels-photo-5961792.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','خبز عربي طازج','category','مخبوزات','price',5,'is_bestseller',false,'image_url','https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','كرواسون','category','مخبوزات','price',18,'is_bestseller',false,'image_url','https://images.pexels.com/photos/7390/pexels-photo-7390.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','دجاج طازج كيلو','category','لحوم ودواجن','price',35,'is_bestseller',false,'image_url','https://images.pexels.com/photos/4106483/pexels-photo-4106483.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','لحم مفروم كيلو','category','لحوم ودواجن','price',55,'is_bestseller',false,'image_url','https://images.pexels.com/photos/6187758/pexels-photo-6187758.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','فول معلب','category','معلبات','price',7,'is_bestseller',false,'image_url','https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','ذرة معبأة','category','معلبات','price',6,'is_bestseller',false,'image_url','https://images.pexels.com/photos/594672/pexels-photo-594672.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','شيبس','category','سناكات','price',5,'is_bestseller',false,'image_url','https://images.pexels.com/photos/799268/pexels-photo-799268.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','مكسرات مملحة','category','سناكات','price',30,'is_bestseller',true,'image_url','https://images.pexels.com/photos/1295578/pexels-photo-1295578.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','كنافة','category','حلويات','price',40,'is_bestseller',false,'image_url','https://images.pexels.com/photos/8743168/pexels-photo-8743168.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','بسبوسة','category','حلويات','price',25,'is_bestseller',false,'image_url','https://images.pexels.com/photos/7259975/pexels-photo-7259975.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','كمون مطحون','category','بهارات وتوابل','price',15,'is_bestseller',false,'image_url','https://images.pexels.com/photos/678414/pexels-photo-678414.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','فلفل أسود','category','بهارات وتوابل','price',12,'is_bestseller',false,'image_url','https://images.pexels.com/photos/4038533/pexels-photo-4038533.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','أرز بسمتي 5 كغ','category','حبوب وبقول','price',45,'is_bestseller',false,'image_url','https://images.pexels.com/photos/4110250/pexels-photo-4110250.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','عدس أحمر كيلو','category','حبوب وبقول','price',10,'is_bestseller',false,'image_url','https://images.pexels.com/photos/6283089/pexels-photo-6283089.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','وجبة جاهزة دجاج','category','وجبات جاهزة','price',22,'is_bestseller',false,'image_url','https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','زيت زيتون 1 لتر','category','زيوت وصلصات','price',55,'is_bestseller',true,'image_url','https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','صلصة طماطم','category','زيوت وصلصات','price',8,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3376795/pexels-photo-3376795.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','خضار مجمدة كيلو','category','أطعمة مجمدة','price',18,'is_bestseller',false,'image_url','https://images.pexels.com/photos/373147/pexels-photo-373147.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      -- إلكترونيات
      jsonb_build_object('title','iPhone 14','category','هواتف','price',3500,'is_bestseller',true,'image_url','https://images.pexels.com/photos/7889179/pexels-photo-7889179.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','سامسونج A54','category','هواتف','price',1200,'is_bestseller',false,'image_url','https://images.pexels.com/photos/7889462/pexels-photo-7889462.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','لابتوب جيمنج','category','حواسيب','price',4200,'is_bestseller',true,'image_url','https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','شاحن لاسلكي','category','إكسسوارات إلكترونية','price',80,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3990842/pexels-photo-3990842.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','فرن كهربائي','category','أجهزة منزلية','price',350,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3987049/pexels-photo-3987049.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','غسالة 7 كغ','category','أجهزة منزلية','price',1200,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3737595/pexels-photo-3737595.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','كاميرا رقمية','category','كاميرات','price',1500,'is_bestseller',false,'image_url','https://images.pexels.com/photos/51383/camera-lens-lens-zoom-photo-51383.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','بلايستيشن 5','category','ألعاب إلكترونية','price',2200,'is_bestseller',true,'image_url','https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=80'),
      -- ملابس وإكسسوارات
      jsonb_build_object('title','قميص رجالي','category','ملابس رجالية','price',85,'is_bestseller',false,'image_url','https://images.pexels.com/photos/325876/pexels-photo-325876.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','فستان نسائي','category','ملابس نسائية','price',120,'is_bestseller',false,'image_url','https://images.pexels.com/photos/428338/pexels-photo-428338.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','ملابس أطفال','category','ملابس أطفال','price',45,'is_bestseller',false,'image_url','https://images.pexels.com/photos/1648374/pexels-photo-1648374.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','حذاء رياضي','category','أحذية','price',180,'is_bestseller',true,'image_url','https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','حقيبة يد','category','شنط وإكسسوارات','price',95,'is_bestseller',false,'image_url','https://images.pexels.com/photos/322207/pexels-photo-322207.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','ثوب تقليدي','category','ملابس تقليدية','price',250,'is_bestseller',false,'image_url','https://images.pexels.com/photos/374068/pexels-photo-374068.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','تيشيرت','category','ملابس','price',55,'is_bestseller',false,'image_url','https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      -- منزل وحديقة
      jsonb_build_object('title','كنبة ثلاثية','category','أثاث','price',1500,'is_bestseller',false,'image_url','https://images.pexels.com/photos/1571458/pexels-photo-1571458.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','طقم سكاكين مطبخ','category','أدوات مطبخ','price',75,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3951628/pexels-photo-3951628.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','لوحة ديكور','category','ديكور منزلي','price',120,'is_bestseller',false,'image_url','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','نبتة زينة','category','حديقة ونباتات','price',35,'is_bestseller',false,'image_url','https://images.pexels.com/photos/450326/pexels-photo-450326.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','صندوق عدد','category','عدد وأدوات','price',150,'is_bestseller',false,'image_url','https://images.pexels.com/photos/162553/tool-work-bench-hammer-tools-162553.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      -- عناية وجمال
      jsonb_build_object('title','مرطب بشرة','category','العناية بالبشرة','price',65,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3738340/pexels-photo-3738340.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','أحمر شفاه','category','مكياج','price',45,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3373715/pexels-photo-3373715.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','شامبو','category','العناية بالشعر','price',28,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3738348/pexels-photo-3738348.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','عطر رجالي','category','عطور','price',180,'is_bestseller',true,'image_url','https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','طلاء أظافر','category','تجميل وكوزمتكس','price',22,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3373741/pexels-photo-3373741.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      -- رياضة ومنزل وغذاء
      jsonb_build_object('title','كرة قدم','category','أدوات رياضية','price',80,'is_bestseller',false,'image_url','https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','سجادة يوغا','category','أدوات رياضية','price',90,'is_bestseller',false,'image_url','https://images.pexels.com/photos/6699863/pexels-photo-6699863.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','مكنسة كهربائية','category','أدوات منزلية','price',280,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3951629/pexels-photo-3951629.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','عسل طبيعي','category','منتجات غذائية','price',70,'is_bestseller',true,'image_url','https://images.pexels.com/photos/750073/pexels-photo-750073.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','مربى برتقال','category','منتجات غذائية','price',25,'is_bestseller',false,'image_url','https://images.pexels.com/photos/7750325/pexels-photo-7750325.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','سماعات لاسلكية','category','إلكترونيات','price',200,'is_bestseller',false,'image_url','https://images.pexels.com/photos/955390/pexels-photo-955390.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','ساعة ذكية','category','إلكترونيات','price',450,'is_bestseller',true,'image_url','https://images.pexels.com/photos/4370379/pexels-photo-4370379.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','سلة يدوية','category','مشغولات يدوية','price',55,'is_bestseller',false,'image_url','https://images.pexels.com/photos/461035/pexels-photo-461035.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','حفاضات أطفال','category','مستلزمات أطفال','price',45,'is_bestseller',false,'image_url','https://images.pexels.com/photos/341372/pexels-photo-341372.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','طعام قطط','category','مستلزمات حيوانات أليفة','price',35,'is_bestseller',false,'image_url','https://images.pexels.com/photos/59523/pexels-photo-59523.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','دفتر وقلم','category','كتب وقرطاسية','price',15,'is_bestseller',false,'image_url','https://images.pexels.com/photos/46274/pexels-photo-46274.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','رواية عربية','category','كتب وقرطاسية','price',40,'is_bestseller',false,'image_url','https://images.pexels.com/photos/7626806/pexels-photo-7626806.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','حامل هاتف سيارة','category','كماليات سيارات','price',35,'is_bestseller',false,'image_url','https://images.pexels.com/photos/244206/pexels-photo-244206.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','دمية أطفال','category','ألعاب وهدايا','price',65,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3661193/pexels-photo-3661193.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','شرشف سرير','category','مفروشات وأقمشة','price',85,'is_bestseller',false,'image_url','https://images.pexels.com/photos/545012/pexels-photo-545012.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','وسادة ريش','category','مفروشات وأقمشة','price',120,'is_bestseller',false,'image_url','https://images.pexels.com/photos/6316059/pexels-photo-6316059.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','خدمة توصيل','category','خدمات','price',20,'is_bestseller',false,'image_url','https://images.pexels.com/photos/3862614/pexels-photo-3862614.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      jsonb_build_object('title','منتج متنوع','category','أخرى','price',50,'is_bestseller',false,'image_url','https://images.pexels.com/photos/439391/pexels-photo-439391.jpeg?auto=compress&cs=tinysrgb&w=1200')
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
  ARRAY[ (i->>'image_url') ]::text[] AS images,
  (i->>'image_url') AS image_url,
  COALESCE((i->>'is_bestseller')::boolean, false) AS is_bestseller,
  now() AS created_at,
  now() AS updated_at
FROM base_products bp,
LATERAL jsonb_array_elements(bp.items) AS i
ON CONFLICT (id) DO UPDATE SET
  images = EXCLUDED.images,
  image_url = EXCLUDED.image_url,
  updated_at = now();

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
  p.image_url AS image_url,
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

-- عرض على فئة إلكترونيات (نفس قيمة category في المنتجات — offersService يطابق النص حرفياً)
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
  'https://picsum.photos/seed/electronics-sale-banner/800/300',
  NULL,
  2,
  true,
  'category',
  'إلكترونيات',
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
-- الجدول مطلوب للوسيط وليس مُعرَّفاً في setup.sql؛ نُنشئه هنا لمرة واحدة بأمان
CREATE TABLE IF NOT EXISTS public.shared_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  marketing_title TEXT,
  marketing_description TEXT,
  custom_discount_text TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  clicks INT NOT NULL DEFAULT 0,
  sales INT NOT NULL DEFAULT 0,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broker_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_shared_products_broker_id ON public.shared_products(broker_id);
CREATE INDEX IF NOT EXISTS idx_shared_products_product_id ON public.shared_products(product_id);

WITH broker AS (
  SELECT id AS broker_id FROM public.users WHERE email = 'broker@palma.demo'
),
prod AS (
  SELECT id AS product_id FROM public.products ORDER BY created_at DESC LIMIT 5
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
WHERE NOT EXISTS (
  SELECT 1
  FROM public.shared_products sp
  WHERE sp.broker_id = b.broker_id
    AND sp.product_id = p.product_id
);

-- ============================================================================
-- 6) بيانات بسيطة للزبون: عربة فارغة + إشعار ترحيبي (اختياري)
-- ============================================================================

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;

INSERT INTO public.notifications (id, user_id, type, message, reference_id, is_read)
SELECT
  'e0000001-0000-4000-8000-000000000001'::uuid,
  u.id,
  'welcome',
  'مرحباً بك في متجر Palma التجريبي 👋',
  NULL,
  false
FROM public.users u
WHERE u.email = 'customer@palma.demo'
ON CONFLICT (id) DO NOTHING;

-- 6.2 عربة تسوق ديمو + عناصر
WITH customer AS (
  SELECT id AS customer_id FROM public.users WHERE email = 'customer@palma.demo'
),
cart_existing AS (
  SELECT ct.id, ct.user_id
  FROM public.carts ct
  JOIN customer c ON ct.user_id = c.customer_id
  LIMIT 1
),
cart_inserted AS (
  INSERT INTO public.carts (id, user_id, created_at, updated_at)
  SELECT
    '00000000-0000-5000-8000-000000000001' AS id,
    c.customer_id,
    now() AS created_at,
    now() AS updated_at
  FROM customer c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.carts ct2
    WHERE ct2.user_id = c.customer_id
  )
  RETURNING id, user_id
),
cart_row AS (
  SELECT id, user_id FROM cart_existing
  UNION ALL
  SELECT id, user_id FROM cart_inserted
),
sample_products AS (
  SELECT id, price FROM public.products ORDER BY created_at ASC LIMIT 3 ) /*
)
*/
INSERT INTO public.cart_items (id, cart_id, product_id, quantity, price)
SELECT
  gen_random_uuid() AS id,
  cr.id AS cart_id,
  p.id AS product_id,
  1 + (row_number() OVER ())::int AS quantity,
  p.price AS price
FROM cart_row cr
JOIN sample_products p ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.cart_items ci
  WHERE ci.cart_id = cr.id
    AND ci.product_id = p.id
);

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
  CASE row_number() OVER (ORDER BY p.id)
    WHEN 1 THEN 'd6000011-0000-4000-8000-000000000001'::uuid
    WHEN 2 THEN 'd6000012-0000-4000-8000-000000000002'::uuid
  END AS id,
  o.id AS order_id,
  p.id AS product_id,
  1 + (row_number() OVER (ORDER BY p.id))::int AS quantity,
  p.price AS price
FROM order_row o
JOIN order_products p ON true
ON CONFLICT (id) DO NOTHING;

-- إجمالي الطلب = مجموع (الكمية × السعر) ليتوافق مع الواجهة والتحليلات
UPDATE public.orders o
SET total_amount = sub.sum_line
FROM (
  SELECT order_id, SUM(quantity * price) AS sum_line
  FROM public.order_items
  -- order_items.order_id is TEXT in this schema; compare as TEXT to avoid type mismatch
  WHERE order_id = '00000000-0000-6000-8000-000000000001'::text
  GROUP BY order_id
) sub
WHERE o.id = sub.order_id;

-- 6.4 + 6.5 تقييم الزبون للتاجر على الطلب (بدون جدول chats)
-- 6.4 تقييم الزبون للتاجر على الطلب (تُدار من تطبيق آخر؛ لا يوجد جدول ratings في هذه السكيمة)

-- ============================================================================
-- 7) Demo product comments + ratings (Customer + Broker)
-- ============================================================================
-- مهم: في PostgreSQL الـ WITH (...) ينطبق على جملة SQL واحدة فقط بعده.
-- لذلك كل INSERT يستخدم subqueries مباشرة — لا تعتمد على أسماء مثل customer_demo
-- كجدولات؛ وإلا يظهر خطأ: relation "customer_demo" does not exist
--
-- عمود rating مضاف في setup.sql الحديث؛ هذا السطر آمن لقواعد قديمة (IF NOT EXISTS)
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
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_comments pc WHERE pc.id = 'd7e00001-0000-4000-8000-000000000001'::uuid
);

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
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_comments pc WHERE pc.id = 'd7e00002-0000-4000-8000-000000000002'::uuid
);

-- Broker reviews for promoted product
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
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_comments pc WHERE pc.id = 'd7e00003-0000-4000-8000-000000000003'::uuid
);

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
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_comments pc WHERE pc.id = 'd7e00004-0000-4000-8000-000000000004'::uuid
);

-- تحديث كاش PostgREST (أعمدة مثل rating) — تجاهل إذا ظهر خطأ صلاحيات
NOTIFY pgrst, 'reload schema';
