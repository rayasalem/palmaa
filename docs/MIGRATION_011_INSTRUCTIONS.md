# تشغيل Migration 011 (token_version و MFA)

هذا الـ migration يضيف أعمدة آمنة لجدول `users` بدون كسر المستخدمين الحاليين:

- `token_version` (افتراضي 0) — لإبطال كل الجلسات عند "تسجيل الخروج من كل الأجهزة"
- `mfa_enabled` و `mfa_secret` — لتفعيل MFA اختياري

## الطريقة 1: Supabase Dashboard (موصى بها للإنتاج)

1. افتح [Supabase Dashboard](https://app.supabase.com) → مشروعك → **SQL Editor**
2. انسخ والصق محتوى الملف `supabase/migrations/011_token_version_and_mfa.sql`
3. اضغط **Run**

## الطريقة 2: Supabase CLI

إذا كان المشروع مربوطًا بـ Supabase CLI:

```bash
npx supabase db push
```

أو تشغيل الملف فقط:

```bash
npx supabase db execute -f supabase/migrations/011_token_version_and_mfa.sql
```

## التحقق

بعد التشغيل تأكد من وجود الأعمدة:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
  AND column_name IN ('token_version', 'mfa_enabled', 'mfa_secret');
```

يجب أن ترى: `token_version` (integer, default 0), `mfa_enabled` (boolean, default false), `mfa_secret` (text, nullable).
