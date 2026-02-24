# قائمة التحقق للرفع — Palma Marketplace

## 1. ملخص الأدوار والوظائف

| الدور | الوظائف | مسارات الباكند (الصلاحيات) |
|------|---------|---------------------------|
| **CUSTOMER** | تسجيل، تسوق، سلة، دفع، طلباتي، إعجاب/تعليق/تقييم | `/api/cart` (جميع العمليات)، `/api/orders` (list, create, cancel, get/:id)، `/api/products` (قراءة، like, comment)، `/api/addresses`، `/api/auth/*` |
| **MERCHANT** | لوحة تحكم، منتجات (إضافة/تعديل/حذف)، طلبات، شحن، تسوق/سلة | `/api/merchant/dashboard` (MERCHANT)، `/api/products` (create/update/delete)، `/api/cart`، `/api/orders` (list، updateOrderInvoice)، `/api/shipment/*`، `/api/notifications` |
| **BROKER** | سوق، منتجات موصى بها، إحصائيات، تسوق/سلة | `/api/broker/shared-products` (BROKER)، `/api/cart`، `/api/orders`، `/api/products` (قراءة) |
| **ADMIN** | مستخدمين، منتجات، طلبات، سحوبات، إعدادات المنصة، تسوق/سلة | `/api/admin/*` (ADMIN فقط)، `/api/cart`، `/api/orders` (complete)، `/api/products` (قراءة) |

- **زر الرجوع في المتصفح:** عند الرجوع إلى `#/` أو hash غير معروف يتم عرض الرئيسية (LANDING + home).
- **السلة:** متاحة لجميع الأدوار (CUSTOMER, MERCHANT, BROKER, ADMIN) عبر `requireRole('CUSTOMER','MERCHANT','BROKER','ADMIN')` في `cartRoutes`.

---

## 2. التحقق من عدم التعليق ومعالجة الأخطاء

- **الفرونت:** طلبات الحرجة (سلة، دفع، تسجيل، طلبات) داخل `try/catch` أو تستخدم خدمات تُرجع `{ success, error }` (مثل cartApi، authService).
- **useCart:** `refetch` داخل `try/catch/finally` لضمان عدم بقاء `loading: true` عند فشل الشبكة.
- **الباكند:** معالجة أخطاء في الـ controllers (try/catch)، وعدم وجود حلقات لا نهائية أو انتظار بدون حد زمني في المسارات الحرجة.
- **ملاحظة أمنية:** `GET /api/orders/:id` بدون توكن (لصفحة عودة الدفع). للإنتاج يمكن إضافة `optionalAuth` والتحقق من ملكية الطلب أو دور ADMIN عند الحاجة.

---

## 3. متغيرات البيئة (الباكند)

في السيرفر (مثل Render أو cPanel Node):

| المتغير | مطلوب/موصى به | وصف |
|---------|----------------|-----|
| `NODE_ENV` | موصى به | `production` في الإنتاج |
| `PORT` | نعم | منصة السيرفر (مثلاً 5000 أو المُعطى من المضيف) |
| `SUPABASE_URL` | نعم | عنوان مشروع Supabase |
| `SUPABASE_SERVICE_KEY` | نعم | مفتاح الخدمة (Service Role) |
| `FRONTEND_URL` | نعم للـ CORS | `https://www.palma.ps,https://palma.ps` (وفق النطاق الفعلي) |
| `JWT_SECRET` | نعم | سلسلة عشوائية طويلة (64+ حرف) |
| `COOKIE_SECRET` | موصى به | لتوقيع الكوكيز |
| `EMAIL_*` / Resend | حسب الإيميل | لإرسال التحقق ونسيان كلمة المرور |

**CORS:** التأكد من أن `FRONTEND_URL` يشمل كل النطاقات التي يُفتح منها الموقع (مثل `https://www.palma.ps` و `https://palma.ps`). الـ corsMiddleware يقرأ هذا المتغير.

---

## 4. خطوات الرفع

### الفرونت (مثلاً Vercel / Netlify / استضافة ثابتة)

1. تثبيت الحزم: `npm install`
2. البناء: `npm run build`
3. رفع محتويات مجلد `dist/` أو ربط المشروع بخدمة تستخدم `npm run build` ثم تخدم `dist`.
4. تعيين قاعدة الـ API في الإنتاج: الفرونت يستخدم تلقائياً `https://palmaa.onrender.com` عندما يكون المضيف غير localhost، أو يمكن تعيين `VITE_API_URL` إذا كان الباكند على عنوان آخر.

### الباكند (مثلاً Render / cPanel / VPS)

1. الدخول إلى مجلد السيرفر: `cd server`
2. تثبيت الحزم: `npm install`
3. تعبئة `.env` من `server/.env.example` (جميع المتغيرات أعلاه).
4. التشغيل: `npm start` (أو عبر Process Manager مثل PM2).
5. (اختياري) وحدات الدفع العربية: `npm run build:payment` ثم إعادة تشغيل السيرفر.

### قاعدة البيانات

1. تنفيذ `supabase/setup.sql` في Supabase (SQL Editor) لإنشاء الجداول والفهارس والبيانات الأولية.
2. التأكد من أن الفهارس المضافة للأداء موجودة (users، products، orders، order_items، إلخ).

---

## 5. التحقق السريع بعد الرفع

- [ ] فتح الموقع من النطاق النهائي (مثل https://www.palma.ps).
- [ ] تسجيل دخول كـ Customer ثم إضافة منتج للسلة والانتقال للدفع (بدون دفع فعلي إذا كان sandbox).
- [ ] تسجيل دخول كـ Merchant والتحقق من لوحة التحكم والمنتجات.
- [ ] تسجيل دخول كـ Admin والتحقق من لوحة الإدارة.
- [ ] زر الرجوع في المتصفح يرجع للصفحة السابقة داخل الموقع ثم للرئيسية عند الوصول إلى `#/`.
- [ ] طلب `/health` على الباكند يرجع `{ ok: true }`.

---

## 6. أوامر البناء والتشغيل

| المهمة | الأمر |
|--------|--------|
| بناء الفرونت | `npm run build` (من جذر المشروع) |
| معاينة الفرونت محلياً | `npm run preview` أو `npx serve dist -s` |
| تشغيل الباكند تطوير | من مجلد `server`: `npm run dev` |
| تشغيل الباكند إنتاج | من مجلد `server`: `npm start` |

تم تجهيز المشروع للرفع مع مراعاة الأدوار والوظائف ومعالجة الأخطاء وسلوك زر الرجوع.
