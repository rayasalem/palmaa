-- Allow notifications.reference_id to store product IDs (TEXT like PRD-xxx)
-- Run in Supabase SQL Editor if you get type errors on notification insert
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'reference_id') THEN
    ALTER TABLE public.notifications ALTER COLUMN reference_id TYPE TEXT USING reference_id::text;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'fix_notifications_reference_id: %', SQLERRM;
END $$;
