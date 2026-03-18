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
SELECT u.id, 'Demo Merchant', 'https://picsum.photos/seed/palma-merchant-logo/80/80'
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
      -- عصائر / مشروبات / أكل
      jsonb_build_object('title','عصير برتقال طازج','category','عصائر','price',12,'is_bestseller',true),
      jsonb_build_object('title','عصير تفاح','category','عصائر','price',10,'is_bestseller',false),
      jsonb_build_object('title','بيبسي 2 لتر','category','مشروبات غازية','price',8,'is_bestseller',false),
      jsonb_build_object('title','شاي أخضر','category','مشروبات ساخنة','price',25,'is_bestseller',false),
      jsonb_build_object('title','قهوة عربية','category','مشروبات ساخنة','price',45,'is_bestseller',true),
      jsonb_build_object('title','ماء معدني 6 حبات','category','مياه','price',6,'is_bestseller',false),
      jsonb_build_object('title','حليب طازج 1 لتر','category','مشروبات ألبان','price',9,'is_bestseller',false),
      jsonb_build_object('title','لبن زبادي','category','مشروبات ألبان','price',7,'is_bestseller',false),
      jsonb_build_object('title','تفاح أحمر كيلو','category','فواكه','price',15,'is_bestseller',true),
      jsonb_build_object('title','موز طازج','category','فواكه','price',12,'is_bestseller',false),
      jsonb_build_object('title','طماطم كيلو','category','خضروات','price',8,'is_bestseller',false),
      jsonb_build_object('title','خيار طازج','category','خضروات','price',6,'is_bestseller',false),
      jsonb_build_object('title','جبنة بيضاء 500غ','category','ألبان وأجبان','price',28,'is_bestseller',false),
      jsonb_build_object('title','لبنة بلدية','category','ألبان وأجبان','price',22,'is_bestseller',false),
      jsonb_build_object('title','خبز عربي طازج','category','مخبوزات','price',5,'is_bestseller',false),
      jsonb_build_object('title','كرواسون','category','مخبوزات','price',18,'is_bestseller',false),
      jsonb_build_object('title','دجاج طازج كيلو','category','لحوم ودواجن','price',35,'is_bestseller',false),
      jsonb_build_object('title','لحم مفروم كيلو','category','لحوم ودواجن','price',55,'is_bestseller',false),
      jsonb_build_object('title','فول معلب','category','معلبات','price',7,'is_bestseller',false),
      jsonb_build_object('title','ذرة معبأة','category','معلبات','price',6,'is_bestseller',false),
      jsonb_build_object('title','شيبس','category','سناكات','price',5,'is_bestseller',false),
      jsonb_build_object('title','مكسرات مملحة','category','سناكات','price',30,'is_bestseller',true),
      jsonb_build_object('title','كنافة','category','حلويات','price',40,'is_bestseller',false),
      jsonb_build_object('title','بسبوسة','category','حلويات','price',25,'is_bestseller',false),
      jsonb_build_object('title','كمون مطحون','category','بهارات وتوابل','price',15,'is_bestseller',false),
      jsonb_build_object('title','فلفل أسود','category','بهارات وتوابل','price',12,'is_bestseller',false),
      jsonb_build_object('title','أرز بسمتي 5 كغ','category','حبوب وبقول','price',45,'is_bestseller',false),
      jsonb_build_object('title','عدس أحمر كيلو','category','حبوب وبقول','price',10,'is_bestseller',false),
      jsonb_build_object('title','وجبة جاهزة دجاج','category','وجبات جاهزة','price',22,'is_bestseller',false),
      jsonb_build_object('title','زيت زيتون 1 لتر','category','زيوت وصلصات','price',55,'is_bestseller',true),
      jsonb_build_object('title','صلصة طماطم','category','زيوت وصلصات','price',8,'is_bestseller',false),
      jsonb_build_object('title','خضار مجمدة كيلو','category','أطعمة مجمدة','price',18,'is_bestseller',false),
      -- إلكترونيات
      jsonb_build_object('title','iPhone 14','category','هواتف','price',3500,'is_bestseller',true),
      jsonb_build_object('title','سامسونج A54','category','هواتف','price',1200,'is_bestseller',false),
      jsonb_build_object('title','لابتوب جيمنج','category','حواسيب','price',4200,'is_bestseller',true),
      jsonb_build_object('title','شاحن لاسلكي','category','إكسسوارات إلكترونية','price',80,'is_bestseller',false),
      jsonb_build_object('title','فرن كهربائي','category','أجهزة منزلية','price',350,'is_bestseller',false),
      jsonb_build_object('title','غسالة 7 كغ','category','أجهزة منزلية','price',1200,'is_bestseller',false),
      jsonb_build_object('title','كاميرا رقمية','category','كاميرات','price',1500,'is_bestseller',false),
      jsonb_build_object('title','بلايستيشن 5','category','ألعاب إلكترونية','price',2200,'is_bestseller',true),
      -- ملابس وإكسسوارات
      jsonb_build_object('title','قميص رجالي','category','ملابس رجالية','price',85,'is_bestseller',false),
      jsonb_build_object('title','فستان نسائي','category','ملابس نسائية','price',120,'is_bestseller',false),
      jsonb_build_object('title','ملابس أطفال','category','ملابس أطفال','price',45,'is_bestseller',false),
      jsonb_build_object('title','حذاء رياضي','category','أحذية','price',180,'is_bestseller',true),
      jsonb_build_object('title','حقيبة يد','category','شنط وإكسسوارات','price',95,'is_bestseller',false),
      jsonb_build_object('title','ثوب تقليدي','category','ملابس تقليدية','price',250,'is_bestseller',false),
      jsonb_build_object('title','تيشيرت','category','ملابس','price',55,'is_bestseller',false),
      -- منزل وحديقة
      jsonb_build_object('title','كنبة ثلاثية','category','أثاث','price',1500,'is_bestseller',false),
      jsonb_build_object('title','طقم سكاكين مطبخ','category','أدوات مطبخ','price',75,'is_bestseller',false),
      jsonb_build_object('title','لوحة ديكور','category','ديكور منزلي','price',120,'is_bestseller',false),
      jsonb_build_object('title','نبتة زينة','category','حديقة ونباتات','price',35,'is_bestseller',false),
      jsonb_build_object('title','صندوق عدد','category','عدد وأدوات','price',150,'is_bestseller',false),
      -- عناية وجمال
      jsonb_build_object('title','مرطب بشرة','category','العناية بالبشرة','price',65,'is_bestseller',false),
      jsonb_build_object('title','أحمر شفاه','category','مكياج','price',45,'is_bestseller',false),
      jsonb_build_object('title','شامبو','category','العناية بالشعر','price',28,'is_bestseller',false),
      jsonb_build_object('title','عطر رجالي','category','عطور','price',180,'is_bestseller',true),
      jsonb_build_object('title','طلاء أظافر','category','تجميل وكوزمتكس','price',22,'is_bestseller',false),
      -- رياضة ومنزل وغذاء
      jsonb_build_object('title','كرة قدم','category','أدوات رياضية','price',80,'is_bestseller',false),
      jsonb_build_object('title','سجادة يوغا','category','أدوات رياضية','price',90,'is_bestseller',false),
      jsonb_build_object('title','مكنسة كهربائية','category','أدوات منزلية','price',280,'is_bestseller',false),
      jsonb_build_object('title','عسل طبيعي','category','منتجات غذائية','price',70,'is_bestseller',true),
      jsonb_build_object('title','مربى برتقال','category','منتجات غذائية','price',25,'is_bestseller',false),
      jsonb_build_object('title','سماعات لاسلكية','category','إلكترونيات','price',200,'is_bestseller',false),
      jsonb_build_object('title','ساعة ذكية','category','إلكترونيات','price',450,'is_bestseller',true),
      jsonb_build_object('title','سلة يدوية','category','مشغولات يدوية','price',55,'is_bestseller',false),
      jsonb_build_object('title','حفاضات أطفال','category','مستلزمات أطفال','price',45,'is_bestseller',false),
      jsonb_build_object('title','طعام قطط','category','مستلزمات حيوانات أليفة','price',35,'is_bestseller',false),
      jsonb_build_object('title','دفتر وقلم','category','كتب وقرطاسية','price',15,'is_bestseller',false),
      jsonb_build_object('title','رواية عربية','category','كتب وقرطاسية','price',40,'is_bestseller',false),
      jsonb_build_object('title','حامل هاتف سيارة','category','كماليات سيارات','price',35,'is_bestseller',false),
      jsonb_build_object('title','دمية أطفال','category','ألعاب وهدايا','price',65,'is_bestseller',false),
      jsonb_build_object('title','شرشف سرير','category','مفروشات وأقمشة','price',85,'is_bestseller',false),
      jsonb_build_object('title','وسادة ريش','category','مفروشات وأقمشة','price',120,'is_bestseller',false),
      jsonb_build_object('title','خدمة توصيل','category','خدمات','price',20,'is_bestseller',false),
      jsonb_build_object('title','منتج متنوع','category','أخرى','price',50,'is_bestseller',false)
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
  ARRAY[
    CASE
      WHEN i->>'category' = 'عصائر' THEN 'https://source.unsplash.com/600x400/?fresh+juice,orange'
      WHEN i->>'category' = 'مشروبات غازية' THEN 'https://source.unsplash.com/600x400/?soda,cola'
      WHEN i->>'category' = 'مشروبات ساخنة' THEN 'https://source.unsplash.com/600x400/?coffee,tea'
      WHEN i->>'category' = 'مياه' THEN 'https://source.unsplash.com/600x400/?water+bottle'
      WHEN i->>'category' = 'مشروبات ألبان' THEN 'https://source.unsplash.com/600x400/?milk,dairy'
      WHEN i->>'category' = 'فواكه' THEN 'https://source.unsplash.com/600x400/?fresh+fruits,apple'
      WHEN i->>'category' = 'خضروات' THEN 'https://source.unsplash.com/600x400/?vegetables,fresh'
      WHEN i->>'category' = 'ألبان وأجبان' THEN 'https://source.unsplash.com/600x400/?cheese,dairy'
      WHEN i->>'category' = 'مخبوزات' THEN 'https://source.unsplash.com/600x400/?bread,bakery'
      WHEN i->>'category' = 'لحوم ودواجن' THEN 'https://source.unsplash.com/600x400/?chicken,meat'
      WHEN i->>'category' = 'معلبات' THEN 'https://source.unsplash.com/600x400/?canned+food'
      WHEN i->>'category' = 'سناكات' THEN 'https://source.unsplash.com/600x400/?snacks,chips'
      WHEN i->>'category' = 'حلويات' THEN 'https://source.unsplash.com/600x400/?dessert,sweets'
      WHEN i->>'category' = 'بهارات وتوابل' THEN 'https://source.unsplash.com/600x400/?spices'
      WHEN i->>'category' = 'حبوب وبقول' THEN 'https://source.unsplash.com/600x400/?rice,legumes'
      WHEN i->>'category' = 'وجبات جاهزة' THEN 'https://source.unsplash.com/600x400/?ready+meal,food'
      WHEN i->>'category' = 'زيوت وصلصات' THEN 'https://source.unsplash.com/600x400/?olive+oil,sauce'
      WHEN i->>'category' = 'أطعمة مجمدة' THEN 'https://source.unsplash.com/600x400/?frozen+food'
      WHEN i->>'category' = 'هواتف' THEN 'https://source.unsplash.com/600x400/?smartphone,iphone'
      WHEN i->>'category' = 'حواسيب' THEN 'https://source.unsplash.com/600x400/?laptop,computer'
      WHEN i->>'category' = 'إكسسوارات إلكترونية' THEN 'https://source.unsplash.com/600x400/?electronics,charger'
      WHEN i->>'category' = 'أجهزة منزلية' THEN 'https://source.unsplash.com/600x400/?home+appliance'
      WHEN i->>'category' = 'كاميرات' THEN 'https://source.unsplash.com/600x400/?camera,photography'
      WHEN i->>'category' = 'ألعاب إلكترونية' THEN 'https://source.unsplash.com/600x400/?gaming,console'
      WHEN i->>'category' = 'ملابس رجالية' THEN 'https://source.unsplash.com/600x400/?mens+clothing'
      WHEN i->>'category' = 'ملابس نسائية' THEN 'https://source.unsplash.com/600x400/?womens+clothing,dress'
      WHEN i->>'category' = 'ملابس أطفال' THEN 'https://source.unsplash.com/600x400/?kids+clothing'
      WHEN i->>'category' = 'أحذية' THEN 'https://source.unsplash.com/600x400/?shoes,sneakers'
      WHEN i->>'category' = 'شنط وإكسسوارات' THEN 'https://source.unsplash.com/600x400/?bag,accessories'
      WHEN i->>'category' = 'ملابس تقليدية' THEN 'https://source.unsplash.com/600x400/?traditional+clothing'
      WHEN i->>'category' = 'ملابس' THEN 'https://source.unsplash.com/600x400/?clothing,tshirt'
      WHEN i->>'category' = 'أثاث' THEN 'https://source.unsplash.com/600x400/?furniture,sofa'
      WHEN i->>'category' = 'أدوات مطبخ' THEN 'https://source.unsplash.com/600x400/?kitchen,tools'
      WHEN i->>'category' = 'ديكور منزلي' THEN 'https://source.unsplash.com/600x400/?home+decor'
      WHEN i->>'category' = 'حديقة ونباتات' THEN 'https://source.unsplash.com/600x400/?garden,plants'
      WHEN i->>'category' = 'عدد وأدوات' THEN 'https://source.unsplash.com/600x400/?tools,hardware'
      WHEN i->>'category' = 'العناية بالبشرة' THEN 'https://source.unsplash.com/600x400/?skincare,cosmetics'
      WHEN i->>'category' = 'مكياج' THEN 'https://source.unsplash.com/600x400/?makeup,beauty'
      WHEN i->>'category' = 'العناية بالشعر' THEN 'https://source.unsplash.com/600x400/?haircare,shampoo'
      WHEN i->>'category' = 'عطور' THEN 'https://source.unsplash.com/600x400/?perfume,fragrance'
      WHEN i->>'category' = 'تجميل وكوزمتكس' THEN 'https://source.unsplash.com/600x400/?cosmetics,beauty'
      WHEN i->>'category' = 'أدوات رياضية' THEN 'https://source.unsplash.com/600x400/?sports,fitness'
      WHEN i->>'category' = 'أدوات منزلية' THEN 'https://source.unsplash.com/600x400/?vacuum,cleaning'
      WHEN i->>'category' = 'منتجات غذائية' THEN 'https://source.unsplash.com/600x400/?food,groceries'
      WHEN i->>'category' = 'إلكترونيات' THEN 'https://source.unsplash.com/600x400/?electronics,gadget'
      WHEN i->>'category' = 'مشغولات يدوية' THEN 'https://source.unsplash.com/600x400/?handicraft,craft'
      WHEN i->>'category' = 'مستلزمات أطفال' THEN 'https://source.unsplash.com/600x400/?baby,children'
      WHEN i->>'category' = 'مستلزمات حيوانات أليفة' THEN 'https://source.unsplash.com/600x400/?pet,dog+food'
      WHEN i->>'category' = 'كتب وقرطاسية' THEN 'https://source.unsplash.com/600x400/?books,stationery'
      WHEN i->>'category' = 'كماليات سيارات' THEN 'https://source.unsplash.com/600x400/?car+accessories'
      WHEN i->>'category' = 'ألعاب وهدايا' THEN 'https://source.unsplash.com/600x400/?toys,gifts'
      WHEN i->>'category' = 'مفروشات وأقمشة' THEN 'https://source.unsplash.com/600x400/?bedding,fabric'
      WHEN i->>'category' = 'عقارات' THEN 'https://source.unsplash.com/600x400/?real+estate,house'
      WHEN i->>'category' = 'خدمات' THEN 'https://source.unsplash.com/600x400/?service,delivery'
      ELSE 'https://source.unsplash.com/600x400/?product,shopping'
    END
  ]::text[] AS images,
  CASE
    WHEN i->>'category' = 'عصائر' THEN 'https://source.unsplash.com/600x400/?fresh+juice,orange'
    WHEN i->>'category' = 'مشروبات غازية' THEN 'https://source.unsplash.com/600x400/?soda,cola'
    WHEN i->>'category' = 'مشروبات ساخنة' THEN 'https://source.unsplash.com/600x400/?coffee,tea'
    WHEN i->>'category' = 'مياه' THEN 'https://source.unsplash.com/600x400/?water+bottle'
    WHEN i->>'category' = 'مشروبات ألبان' THEN 'https://source.unsplash.com/600x400/?milk,dairy'
    WHEN i->>'category' = 'فواكه' THEN 'https://source.unsplash.com/600x400/?fresh+fruits,apple'
    WHEN i->>'category' = 'خضروات' THEN 'https://source.unsplash.com/600x400/?vegetables,fresh'
    WHEN i->>'category' = 'ألبان وأجبان' THEN 'https://source.unsplash.com/600x400/?cheese,dairy'
    WHEN i->>'category' = 'مخبوزات' THEN 'https://source.unsplash.com/600x400/?bread,bakery'
    WHEN i->>'category' = 'لحوم ودواجن' THEN 'https://source.unsplash.com/600x400/?chicken,meat'
    WHEN i->>'category' = 'معلبات' THEN 'https://source.unsplash.com/600x400/?canned+food'
    WHEN i->>'category' = 'سناكات' THEN 'https://source.unsplash.com/600x400/?snacks,chips'
    WHEN i->>'category' = 'حلويات' THEN 'https://source.unsplash.com/600x400/?dessert,sweets'
    WHEN i->>'category' = 'بهارات وتوابل' THEN 'https://source.unsplash.com/600x400/?spices'
    WHEN i->>'category' = 'حبوب وبقول' THEN 'https://source.unsplash.com/600x400/?rice,legumes'
    WHEN i->>'category' = 'وجبات جاهزة' THEN 'https://source.unsplash.com/600x400/?ready+meal,food'
    WHEN i->>'category' = 'زيوت وصلصات' THEN 'https://source.unsplash.com/600x400/?olive+oil,sauce'
    WHEN i->>'category' = 'أطعمة مجمدة' THEN 'https://source.unsplash.com/600x400/?frozen+food'
    WHEN i->>'category' = 'هواتف' THEN 'https://source.unsplash.com/600x400/?smartphone,iphone'
    WHEN i->>'category' = 'حواسيب' THEN 'https://source.unsplash.com/600x400/?laptop,computer'
    WHEN i->>'category' = 'إكسسوارات إلكترونية' THEN 'https://source.unsplash.com/600x400/?electronics,charger'
    WHEN i->>'category' = 'أجهزة منزلية' THEN 'https://source.unsplash.com/600x400/?home+appliance'
    WHEN i->>'category' = 'كاميرات' THEN 'https://source.unsplash.com/600x400/?camera,photography'
    WHEN i->>'category' = 'ألعاب إلكترونية' THEN 'https://source.unsplash.com/600x400/?gaming,console'
    WHEN i->>'category' = 'ملابس رجالية' THEN 'https://source.unsplash.com/600x400/?mens+clothing'
    WHEN i->>'category' = 'ملابس نسائية' THEN 'https://source.unsplash.com/600x400/?womens+clothing,dress'
    WHEN i->>'category' = 'ملابس أطفال' THEN 'https://source.unsplash.com/600x400/?kids+clothing'
    WHEN i->>'category' = 'أحذية' THEN 'https://source.unsplash.com/600x400/?shoes,sneakers'
    WHEN i->>'category' = 'شنط وإكسسوارات' THEN 'https://source.unsplash.com/600x400/?bag,accessories'
    WHEN i->>'category' = 'ملابس تقليدية' THEN 'https://source.unsplash.com/600x400/?traditional+clothing'
    WHEN i->>'category' = 'ملابس' THEN 'https://source.unsplash.com/600x400/?clothing,tshirt'
    WHEN i->>'category' = 'أثاث' THEN 'https://source.unsplash.com/600x400/?furniture,sofa'
    WHEN i->>'category' = 'أدوات مطبخ' THEN 'https://source.unsplash.com/600x400/?kitchen,tools'
    WHEN i->>'category' = 'ديكور منزلي' THEN 'https://source.unsplash.com/600x400/?home+decor'
    WHEN i->>'category' = 'حديقة ونباتات' THEN 'https://source.unsplash.com/600x400/?garden,plants'
    WHEN i->>'category' = 'عدد وأدوات' THEN 'https://source.unsplash.com/600x400/?tools,hardware'
    WHEN i->>'category' = 'العناية بالبشرة' THEN 'https://source.unsplash.com/600x400/?skincare,cosmetics'
    WHEN i->>'category' = 'مكياج' THEN 'https://source.unsplash.com/600x400/?makeup,beauty'
    WHEN i->>'category' = 'العناية بالشعر' THEN 'https://source.unsplash.com/600x400/?haircare,shampoo'
    WHEN i->>'category' = 'عطور' THEN 'https://source.unsplash.com/600x400/?perfume,fragrance'
    WHEN i->>'category' = 'تجميل وكوزمتكس' THEN 'https://source.unsplash.com/600x400/?cosmetics,beauty'
    WHEN i->>'category' = 'أدوات رياضية' THEN 'https://source.unsplash.com/600x400/?sports,fitness'
    WHEN i->>'category' = 'أدوات منزلية' THEN 'https://source.unsplash.com/600x400/?vacuum,cleaning'
    WHEN i->>'category' = 'منتجات غذائية' THEN 'https://source.unsplash.com/600x400/?food,groceries'
    WHEN i->>'category' = 'إلكترونيات' THEN 'https://source.unsplash.com/600x400/?electronics,gadget'
    WHEN i->>'category' = 'مشغولات يدوية' THEN 'https://source.unsplash.com/600x400/?handicraft,craft'
    WHEN i->>'category' = 'مستلزمات أطفال' THEN 'https://source.unsplash.com/600x400/?baby,children'
    WHEN i->>'category' = 'مستلزمات حيوانات أليفة' THEN 'https://source.unsplash.com/600x400/?pet,dog+food'
    WHEN i->>'category' = 'كتب وقرطاسية' THEN 'https://source.unsplash.com/600x400/?books,stationery'
    WHEN i->>'category' = 'كماليات سيارات' THEN 'https://source.unsplash.com/600x400/?car+accessories'
    WHEN i->>'category' = 'ألعاب وهدايا' THEN 'https://source.unsplash.com/600x400/?toys,gifts'
    WHEN i->>'category' = 'مفروشات وأقمشة' THEN 'https://source.unsplash.com/600x400/?bedding,fabric'
    WHEN i->>'category' = 'عقارات' THEN 'https://source.unsplash.com/600x400/?real+estate,house'
    WHEN i->>'category' = 'خدمات' THEN 'https://source.unsplash.com/600x400/?service,delivery'
    ELSE 'https://source.unsplash.com/600x400/?product,shopping'
  END AS image_url,
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
  'https://picsum.photos/seed/iphone-offer-banner/800/300' AS image_url,
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
  'https://picsum.photos/seed/electronics-sale-banner/800/300',
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

