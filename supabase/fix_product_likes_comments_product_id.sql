-- Fix product_id column type in product_likes and product_comments
-- Products use TEXT IDs (e.g. PRD-FASH-03), not UUID
-- Run in Supabase SQL Editor if you get 500 errors on /api/products/:id/comments or /api/products/:id/liked

DO $$
BEGIN
  -- product_likes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_likes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_likes' AND column_name = 'product_id') THEN
      ALTER TABLE public.product_likes ALTER COLUMN product_id TYPE TEXT USING product_id::text;
      RAISE NOTICE 'product_likes.product_id changed to TEXT';
    END IF;
  END IF;

  -- product_comments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_comments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_comments' AND column_name = 'product_id') THEN
      ALTER TABLE public.product_comments ALTER COLUMN product_id TYPE TEXT USING product_id::text;
      RAISE NOTICE 'product_comments.product_id changed to TEXT';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'fix_product_likes_comments_product_id: %', SQLERRM;
END $$;
