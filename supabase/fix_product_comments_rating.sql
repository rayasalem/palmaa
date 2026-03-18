-- إضافة عمود التقييم (النجوم) لجدول التعليقات — التقييم والتعليق سجل واحد في DB
-- Run in Supabase SQL Editor once.
ALTER TABLE public.product_comments
  ADD COLUMN IF NOT EXISTS rating SMALLINT DEFAULT 5
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

COMMENT ON COLUMN public.product_comments.rating IS 'تقييم المنتج 1–5 نجوم؛ مع التعليق (content) يشكلان تجربة المستخدم الواحدة';
