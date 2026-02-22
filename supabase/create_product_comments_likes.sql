-- Create product_likes and product_comments tables (required by API)
-- Run in Supabase SQL Editor if you get: "Could not find the table 'public.product_comments' in the schema cache"
-- product_id is TEXT to match products.id (e.g. PRD-FASH-03)

-- Product likes
CREATE TABLE IF NOT EXISTS public.product_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_product_likes_product_id ON public.product_likes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_likes_user_id ON public.product_likes(user_id);

-- Product comments
CREATE TABLE IF NOT EXISTS public.product_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_comments_product_id ON public.product_comments(product_id);

-- Reload schema cache (important for Supabase/PostgREST)
NOTIFY pgrst, 'reload schema';
