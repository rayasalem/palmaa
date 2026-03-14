-- إصلاح نوع product_id في shop_offers ليتوافق مع products.id (TEXT)
-- نفّذ هذا السكربت في Supabase SQL Editor إذا ظهر خطأ: foreign key ... uuid and text
-- ملاحظة: إن كان الجدول يحتوي على قيم product_id (UUID)، بعد التحويل قد لا تطابق products.id (مثل PRD-xxx). إن كان الجدول فارغاً فلا مشكلة.

-- 1) إسقاط قيد المفتاح الخارجي إن وُجد
ALTER TABLE public.shop_offers
  DROP CONSTRAINT IF EXISTS shop_offers_product_id_fkey;

-- 2) تحويل عمود product_id من UUID إلى TEXT
ALTER TABLE public.shop_offers
  ALTER COLUMN product_id TYPE TEXT USING (product_id::TEXT);

-- 3) إعادة ربط المفتاح الخارجي بجدول products
ALTER TABLE public.shop_offers
  ADD CONSTRAINT shop_offers_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
