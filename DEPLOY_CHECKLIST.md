# قائمة الرفع – Palma Marketplace

## ✅ تحقق قبل الرفع
- [ ] لا توجد أخطاء Lint (تم التحقق)
- [ ] على Render: تأكد من وجود `RESEND_API_KEY` في Environment (لإرسال الإيميل)

---

## 1️⃣ السيرفر (Backend) – ارفع إلى Render

ارفع المشروع كاملاً أو تأكد أن الملفات التالية منشورة:

| الملف | التعديل |
|-------|---------|
| `server/server.js` | حد body 15mb |
| `server/services/authService.js` | نجاح التسجيل عند عدم إرسال الإيميل + رمز التحقق؛ معالجة DNS/شبكة |
| `server/controllers/authController.js` | إرجاع emailSent و verificationCode |
| `server/services/emailService.js` | إرسال عبر Resend API + SMTP احتياطي |
| `server/services/paymentService.js` | عدم التحويل لـ sandbox-bank-url؛ sandboxSimulation |
| `server/controllers/paymentController.js` | إرجاع sandboxSimulation |
| `server/services/addressService.js` | مدن وقرى احتياطية (فلسطين) |
| `server/controllers/addressController.js` | معالجة cityId وإرجاع مصفوفة قرى |

**بعد الرفع:** Save & Deploy على Render.

---

## 2️⃣ الفرونت (Frontend) – ارفع إلى palma.ps (cPanel أو استضافة)

### خطوات:
1. من جذر المشروع شغّل: **`npm run build`**
2. ارفع **كل محتويات مجلد `dist`** إلى السيرفر (استبدال الملفات القديمة).

### الملفات المصدرية المعدّلة (يُضمّنها البناء تلقائياً):

| الملف | التعديل |
|-------|---------|
| `api/client.ts` | getApiBase() وعنوان API صحيح (حل EBADNAME) |
| `api/index.ts` | تصدير getApiBase |
| `services/userService.ts` | استخدام getApiBase() |
| `services/authService.ts` | استخدام getApiBase() |
| `services/productService.ts` | استخدام getApiBase() |
| `services/checkoutApi.ts` | استخدام getApiBase() |
| `services/brokerApi.ts` | استخدام getApiBase() |
| `services/interactionApi.ts` | استخدام getApiBase() |
| `services/adminApi.ts` | استخدام getApiBase() |
| `components/RegisterMerchant.tsx` | عرض رمز التحقق عند عدم إرسال الإيميل |
| `components/RegisterBroker.tsx` | نفس السلوك |
| `components/RegisterCustomer.tsx` | نفس السلوك |
| `views/CheckoutPage.tsx` | عدم التحويل عند sandboxSimulation؛ معالجة القرى |
| `components/Layout.tsx` | تبويب «التسوق» + أيقونة السلة للتاجر والوسيط |
| `App.tsx` | قسم التسوق/السلة للتاجر والوسيط؛ دعم #/shop و #/cart |
| `views/CustomerView.tsx` | shopOnlySection وتبويبا التسوق/السلة |

لا حاجة لرفع الملفات أعلاه يدوياً إذا رفعت المشروع وبنيت من جديد؛ المهم رفع **مخرجات البناء (dist)** بعد `npm run build`.

---

## 3️⃣ ملخص سريع

| ماذا | أين |
|------|-----|
| **الباكند** | Render – ارفع/انشر المشروع (أو على الأقل مجلد `server` + الاعتماديات) |
| **الفرونت** | `npm run build` ثم ارفع محتويات **`dist`** إلى استضافة palma.ps |
| **متغيرات Render** | `RESEND_API_KEY` (واختياري: `RESEND_FROM`) |

بعد الرفع: جرّب التسجيل كتاجر، الدفع والتوصيل (المدن/القرى)، والتسوق والسلة للتاجر والوسيط.
