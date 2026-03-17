# دليل تشغيل الاختبار الشامل (E2E) — سيناريوهات الوظائف الأساسية

## تشغيل الاختبارات

1. **تشغيل الواجهة الأمامية والـ API (محلياً):**
   ```bash
   # طرفية 1: الواجهة
   npm run dev

   # طرفية 2: السيرفر (من مجلد المشروع)
   npm run start:server
   ```
   أو استخدم تطبيق منشور (مثلاً Vercel + Render) وضبط `CYPRESS_BASE_URL`.

2. **تشغيل السيناريو الشامل:**
   ```bash
   # ضد تطبيق محلي (مع مستخدم موجود لتخطي التسجيل)
   set CYPRESS_BASE_URL=http://localhost:5173
   set USE_EXISTING_USER=1
   set CYPRESS_TEST_USER_EMAIL=your-customer@example.com
   set CYPRESS_TEST_USER_PASSWORD=YourPassword123
   npx cypress run --spec cypress/e2e/full-flow.cy.ts

   # أو مع تسجيل مستخدم جديد (اترك USE_EXISTING_USER غير مضبوط)
   npx cypress run --spec cypress/e2e/full-flow.cy.ts
   ```

3. **تشغيل واجهة Cypress التفاعلية:**
   ```bash
   npx cypress open
   ```
   ثم اختر `full-flow.cy.ts` وشغّل الاختبار.

---

## السيناريوهات المغطاة (1–9)

| # | السيناريو | الملف / المكوّن | ملاحظات |
|---|-----------|------------------|---------|
| 1 | تسجيل مستخدم جديد | `components/RegisterCustomer.tsx` | يتخطى إذا `USE_EXISTING_USER=1`. إن ظهرت خطوة التحقق من البريد يُدخل الكود. |
| 2 | تسجيل الدخول | `components/Auth.tsx` — `#login-email`, `#login-password` | |
| 3 | إضافة منتج إلى السلة | `views/CustomerView.tsx` — تبويب المتجر، زر أضف للسلة | يحتاج وجود منتجات في المتجر (من الـ API). |
| 4 | فتح صفحة السلة | `cypress/page-objects/CartPage.ts` — `#/cart` | |
| 5 | إتمام الطلب (Checkout) | `views/CheckoutPage.tsx` — نموذج الشحن + `POST /api/orders` | يتم اعتراض الطلب للتحقق من النجاح؛ جلسة الدفع معطّلة لتجنب التحويل الفعلي. |
| 6 | الطلب في قاعدة البيانات + يظهر في طلباتي | `services/checkoutApi.ts` — `createOrder`؛ `views/CustomerView.tsx` — تبويب طلباتي | التحقق من DB يتم عبر استجابة `POST /api/orders` في الخطوة 5. |
| 7 | تسجيل الدخول كتاجر والطلب في طلبات التاجر | `cypress/support/commands.ts` — `loginAsMerchant`؛ لوحة التاجر | يتخطى إذا لم تُضبط `TEST_MERCHANT_EMAIL` و `TEST_MERCHANT_PASSWORD`. |
| 8 | تحديث حالة الطلب (إلغاء) | `views/customer/CustomerOrdersTab.tsx` — زر إلغاء؛ `PATCH /api/orders/:id/cancel` | الباكند يدعم: PENDING → CANCELLED؛ و completed (أدمن فقط). لا يوجد حالياً Accepted / In Progress في الـ API. |
| 9 | تحديث الحالة في الواجهة | نفس تبويب طلباتي بعد الإلغاء | يتحقق من ظهور "ملغى" أو "CANCELLED". |

---

## إذا فشل سيناريو: الملف، السطر، والإصلاح المقترح

### 1. فشل التسجيل (خطوة 1)
- **الملف:** `components/RegisterCustomer.tsx`
- **التحقق:** حقول `name`, `email`, `phone`, `password`, `confirmPassword` مطلوبة (حوالي 54–62).
- **إصلاح مقترح:** التأكد من أن الـ API `POST /api/auth/register` يعيد 200 وليس خطأ تحقق بريد؛ أو في التطوير إرجاع `verificationCode` في الاستجابة لتفعيل الحساب دون بريد حقيقي.

### 2. فشل تسجيل الدخول (خطوة 2)
- **الملف:** `components/Auth.tsx` — حقول `#login-email`, `#login-password` (حوالي 606، 610).
- **إصلاح مقترح:** التحقق من أن `POST /api/auth/login` يعيد JWT/كوكي وأن الـ Frontend يرسل الطلب إلى نفس الـ base URL المضبوط في `VITE_API_URL` أو الافتراضي.

### 3. لا يوجد منتجات أو زر "أضف للسلة" (خطوة 3)
- **الملف:** `views/CustomerView.tsx` — قائمة المنتجات وزر الإضافة (حوالي 660، 663).
- **إصلاح مقترح:** التأكد من وجود منتجات في قاعدة البيانات وأن `GET /api/products` أو مصدر المنتجات يعيد عناصر؛ أو إضافة بيانات بذور (seed) للمنتجات.

### 4. صفحة السلة لا تفتح أو فارغة (خطوة 4)
- **الملف:** `App.tsx` — التوجيه إلى السلة؛ `views/CustomerView.tsx` — تبويب السلة.
- **إصلاح مقترح:** التأكد من أن الـ hash `#/cart` يوجّه إلى عرض السلة للمستخدم المسجّل وأن السلة (من الـ API أو المحلي) تُحمّل بشكل صحيح.

### 5. فشل إنشاء الطلب أو نموذج الدفع (خطوة 5)
- **الملف:** `views/CheckoutPage.tsx` (حوالي 218–235) — `createOrder`؛ `server/validation/schemas.js` — `orders.create` يتطلب `city`, `recipient_name`, `address`, `phone`, `amount`, `weight`.
- **إصلاح مقترح:** التأكد من تعبئة كل الحقول المطلوبة في النموذج (بما فيها `cityId`/`villageId` أو `city` نصاً) وأن الـ backend يعيد 201 مع `order.id`. إن فشل طلب الدفع (Cybersource) يمكن ترك الاعتراض (intercept) كما هو لتخطي التحويل الفعلي.

### 6. الطلب لا يظهر في "طلباتي" (خطوة 6)
- **الملف:** `views/CustomerView.tsx` — استدعاء `fetchMyOrders()` وتحديث `apiOrders` (حوالي 310–312، 557–558).
- **إصلاح مقترح:** التأكد من أن `GET /api/orders` يتطلب مصادقة ويعيد الطلبات المرتبطة بـ `customer_id`؛ وأن تبويب "طلباتي" يعرض `apiOrders` بعد التحديث.

### 7. الطلب لا يظهر في طلبات التاجر (خطوة 7)
- **الملف:** `server/controllers/orderController.js` — `listMerchantOrders`؛ `server/services/orderService.js` — `getOrdersByMerchantId`.
- **إصلاح مقترح:** التأكد من أن الطلب المُنشأ يحمل `merchant_id` صحيحاً (يُستنتج من المنتج في `orderService.createOrder`) وأن التاجر المسجّل دخوله يطابق هذا `merchant_id`.

### 8. تحديث حالة الطلب (إلغاء) لا يعمل (خطوة 8)
- **الملف:** `views/customer/CustomerOrdersTab.tsx` — زر الإلغاء وتأكيد الإلغاء؛ `server/controllers/orderController.js` — `cancelOrder`؛ `server/services/orderService.js` (حوالي 174–179) — يسمح بالإلغاء فقط عندما `status === 'PENDING'`.
- **إصلاح مقترح:** إن كان الزر لا يظهر أو لا يرسل الطلب، التحقق من أن زر "إلغاء" يظهر للطلبات ذات الحالة PENDING وأن `PATCH /api/orders/:id/cancel` يُستدعى مع JWT العميل. إن الـ API يرفض: التحقق من أن الحالة في DB هي PENDING.

### 9. حالة الطلب لا تتحدث في الواجهة (خطوة 9)
- **الملف:** `views/CustomerView.tsx` — تحديث `apiOrders` بعد الإلغاء (مثلاً 584؛ أو إعادة جلب الطلبات).
- **إصلاح مقترح:** بعد نجاح `PATCH /api/orders/:id/cancel` إما استدعاء `fetchMyOrders()` مرة أخرى أو تحديث القائمة المحلية بحالة CANCELLED للطلب المعني حتى تظهر "ملغى" فوراً.

---

## ملاحظة حول حالات الطلب (Pending / Accepted / In Progress / Completed)

- **الباكند الحالي** يدعم: **PENDING** (افتراضي)، **CANCELLED** (إلغاء من العميل)، **completed** (إتمام من الأدمن عبر `PATCH /api/orders/:id/complete`).
- **لا يوجد في الـ API حالياً:** Accepted، In Progress. إذا أردت دعمها:
  - إضافة مسار مثل `PATCH /api/orders/:id/status` مع قيم `ACCEPTED`, `IN_PROGRESS` (والتحقّق من دور التاجر).
  - في `server/services/orderService.js` إضافة دالة تحديث الحالة وتصديرها من الـ controller.

---

## قائمة مشاكل محتملة حسب الأولوية

1. **عالية:** عدم تشغيل السيرفر أو الـ API أثناء الاختبار → الطلبات أو الدخول يفشل. **الحل:** تشغيل Backend و Frontend قبل `cypress run`.
2. **عالية:** التحقق من البريد عند التسجيل دون إرجاع كود في التطوير → تعليق الخطوة 1. **الحل:** استخدام `USE_EXISTING_USER=1` مع مستخدم جاهز، أو إرجاع `verificationCode` من الـ API في بيئة التطوير.
3. **متوسطة:** عدم وجود منتجات → تخطي إضافة للسلة. **الحل:** seed للمنتجات أو اختبار ضد بيئة تحتوي منتجات.
4. **متوسطة:** انتهاء صلاحية Cypress أو مشكلة التحقق (مثل "Cypress verification timed out") على الجهاز. **الحل:** إعادة تثبيت Cypress أو تشغيل الاختبارات من CI (مثل GitHub Actions) حيث البيئة مستقرة.
