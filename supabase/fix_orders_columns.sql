-- =============================================================================
-- إضافة عمود updated_at لجدول الطلبات / Add updated_at to orders table
-- شغّل هذا في Supabase SQL Editor إذا ظهر: "Could not find the 'updated_at' column of 'orders'"
-- =============================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

NOTIFY pgrst, 'reload schema';
