-- =============================================================================
-- إزالة كل البيانات التجريبية: منتجات + تجار/وسطاء/زبائن تجريبيين
-- الإبقاء على حساب الأدمن فقط (info@palma.ps)
-- =============================================================================
-- شغّل هذا السكربت في Supabase SQL Editor مرة واحدة لتنظيف الداتابيس الحالية.
-- =============================================================================

-- 1) حذف بيانات الطلبات والعمولات والمعاملات
DELETE FROM public.commissions;
DELETE FROM public.transactions;
DELETE FROM public.order_items;
DELETE FROM public.orders;

-- 2) حذف عناصر السلة والسلات (مرتبطة بمنتجات ومستخدمين)
DELETE FROM public.cart_items;
DELETE FROM public.carts;

-- 3) حذف مشاركات المنتجات، الإعجابات، التعليقات، التقييمات
DELETE FROM public.shared_products;
DELETE FROM public.likes;
DELETE FROM public.comments;
DELETE FROM public.reviews;

-- 4) حذف كل المنتجات
DELETE FROM public.products;

-- 5) حذف سحوبات وملفات تجار وعلاقات تخص المستخدمين التجريبيين (اختياري)
DELETE FROM public.withdrawals
WHERE user_id IN (SELECT id FROM public.users WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo'));

DELETE FROM public.follows
WHERE follower_id IN (SELECT id FROM public.users WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo'))
   OR following_id IN (SELECT id FROM public.users WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo'));

DELETE FROM public.merchant_profiles
WHERE user_id IN (SELECT id FROM public.users WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo'));

-- 6) حذف المستخدمين التجريبيين فقط (الإبقاء على الأدمن وأي مستخدمين حقيقيين)
DELETE FROM public.users
WHERE email IN ('merchant@palma.demo', 'broker@palma.demo', 'customer@palma.demo');

-- ملاحظة: إذا كان عندك إشعارات في جدول notifications وبدك تحذف ما يخص المستخدمين المحذوفين،
-- أضف: DELETE FROM public.notifications WHERE user_id NOT IN (SELECT id FROM public.users);
