-- Add 'follow' notification type and optional message column
-- Run in Supabase SQL Editor

-- 1. Add message column (nullable, for custom text like "قام أحمد بمتابعتك")
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;

-- 2. Drop existing CHECK and add new one including 'follow'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_product', 'like', 'comment', 'follow'));
