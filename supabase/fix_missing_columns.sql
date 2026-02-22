-- =============================================================================
-- إصلاح الأعمدة والجداول الناقصة لتسجيل التاجر / Fix Missing Columns for Merchant Registration
-- شغّل هذا الملف في Supabase SQL Editor / Run in Supabase SQL Editor
-- =============================================================================

-- 1. إضافة عمود is_email_verified إن لم يكن موجوداً (الكود يستخدمه بدل email_verified)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_email_verified') THEN
    ALTER TABLE public.users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;
    -- نسخ القيم من email_verified إن وُجد
    UPDATE public.users SET is_email_verified = COALESCE(email_verified, false) 
    WHERE email_verified IS NOT NULL;
  END IF;
END $$;

-- 2. إنشاء جدول otp_codes إن لم يكن موجوداً (للتحقق من البريد وكلمة المرور)
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_type ON public.otp_codes(email, type);

-- 3. التأكد من وجود أعمدة terms (للتجار)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'terms_accepted') THEN
    ALTER TABLE public.users ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'terms_accepted_at') THEN
    ALTER TABLE public.users ADD COLUMN terms_accepted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'terms_version') THEN
    ALTER TABLE public.users ADD COLUMN terms_version TEXT;
  END IF;
END $$;

-- 4. إعطاء الصلاحيات
GRANT ALL ON public.otp_codes TO anon, authenticated, service_role;

-- 5. تحديث كلمات المرور النصية إلى bcrypt (مثلاً admin ومسجّلين قديمين)
-- شغّل هذا بعد تفعيل pgcrypto: CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE public.users
SET password = crypt(password, gen_salt('bf', 12))
WHERE password IS NOT NULL
  AND LENGTH(password) < 60
  AND NOT (password LIKE '$2%');
