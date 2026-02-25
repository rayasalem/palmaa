# قائمة المتغيرات: ماذا تحتاج تدخله في .env أو على السيرفر (Render)

## 1) الباكند — `server/.env` (محلي) أو Render → Environment

| المتغير | مطلوب؟ | أين تحصل على القيمة | مثال |
|--------|--------|----------------------|------|
| **SUPABASE_URL** | ✅ نعم | Supabase → Project Settings → API → Project URL | `https://xxxx.supabase.co` |
| **SUPABASE_SERVICE_KEY** | ✅ نعم | Supabase → Project Settings → API → service_role (secret) | `eyJhbGci...` |
| **JWT_SECRET** | ✅ نعم | أي نص عشوائي طويل (64+ حرف أفضل) | `5b0c2b9f4e7d1a68...` |
| **FRONTEND_URL** | ✅ نعم | روابط موقعك (للـ CORS)، مفصولة بفاصلة | `https://palma.ps,https://www.palma.ps` |
| **RESEND_API_KEY** | ✅ للإيميل | Resend → API Keys → Create API Key | `re_7BKZWchT_...` |
| **RESEND_FROM** | اختياري | مرسل من دومين موثّق عند Resend | `Palma <noreply@palma.ps>` |
| **PORT** | اختياري | منصة الاستضافة تحددها عادة (مثلاً Render يضع 10000) | `5000` محلياً |
| **NODE_ENV** | اختياري | `development` أو `production` | `production` على Render |

### اختياري — الشحن (LogesTechs)

| المتغير | مطلوب؟ | ملاحظة |
|--------|--------|--------|
| LOGESTECHS_COMPANY_ID | إذا استخدمت الشحن الحقيقي | من LogesTechs |
| LOGESTECHS_EMAIL | إذا استخدمت الشحن الحقيقي | إيميل حساب LogesTechs |
| LOGESTECHS_PASSWORD | إذا استخدمت الشحن الحقيقي | كلمة مرور الحساب |
| SHIPMENT_API_BASE | اختياري | افتراضي: `https://apisv2.logestechs.com/api` |

### اختياري — دفع عربي بنك

| المتغير | مطلوب؟ |
|--------|--------|
| ARABIC_BANK_API_URL | إذا فعّلت البوابة |
| ARABIC_BANK_MERCHANT_ID | إذا فعّلت البوابة |
| ARABIC_BANK_SECRET_KEY | إذا فعّلت البوابة |

---

## 2) الفرونت — `.env` في جذر المشروع (للبناء والتطوير المحلي)

| المتغير | مطلوب؟ | أين تحصل على القيمة | مثال |
|--------|--------|----------------------|------|
| **VITE_SUPABASE_URL** | ✅ نعم | نفس SUPABASE_URL من Supabase | `https://xxxx.supabase.co` |
| **VITE_SUPABASE_ANON_KEY** | ✅ نعم | Supabase → API → anon public | `eyJhbGci...` |
| **VITE_CLOUDINARY_CLOUD_NAME** | ✅ للصور | Cloudinary → Dashboard | `palma.ps` |
| **VITE_CLOUDINARY_UPLOAD_PRESET** | ✅ للصور | Cloudinary → Settings → Upload → Preset | `palma_uploads` |
| **VITE_API_URL** | اختياري | رابط الباكند. إن لم تضعه، الموقع يستخدم `palmaa.onrender.com` تلقائياً عند فتح من palma.ps | `https://palmaa.onrender.com` |

**ملاحظة:** الفرونت يُبنى مرة ويُرفع كملفات ثابتة (مثلاً على cPanel). القيم أعلاه تُضمّن في البناء عند `npm run build`؛ لا حاجة لـ .env على السيرفر الثابت إلا إذا كان لديك بناء ديناميكي.

---

## 3) على Render (السيرفر) — ماذا تدخل

في **Render** → مشروع الباكند → **Environment** أضف نفس متغيرات الباكند أعلاه، خاصة:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `FRONTEND_URL` = `https://palma.ps,https://www.palma.ps`
- `RESEND_API_KEY` = المفتاح من Resend
- `RESEND_FROM` = `Palma <noreply@palma.ps>` (اختياري)

لا تحتاج إدخال أي شيء للفرونت على Render إذا الفرونت مستضاف على cPanel؛ فقط الباكند.

---

## ملخص سريع

| المكان | الملف / الواجهة | القيم الأساسية |
|--------|------------------|----------------|
| محلي – باكند | `server/.env` | SUPABASE_*, JWT_SECRET, FRONTEND_URL, RESEND_API_KEY, RESEND_FROM |
| محلي – فرونت | `.env` (جذر المشروع) | VITE_SUPABASE_*, VITE_CLOUDINARY_* |
| السيرفر (Render) | Environment Variables | نفس متغيرات الباكند (SUPABASE_*, JWT_SECRET, FRONTEND_URL, RESEND_*) |
