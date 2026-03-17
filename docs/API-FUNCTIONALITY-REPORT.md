# تقرير تحليل الوظائف والـ APIs — مشروع Palma Marketplace

**تاريخ التقرير:** 2025-03-14  
**نطاق التحليل:** الوظائف (Functions)، الـ APIs، الربط بين Frontend و Backend و Database.

---

## 1. ملخص تنفيذي

تم فحص مسارات الـ Backend والـ Frontend والتحقق من توافقها، وتم إصلاح **مشكلة حرجة** في تدفق إتمام الطلب من واجهة العميل (CustomerView): الطلبات كانت تُحفظ محلياً فقط ولا تُرسل إلى الـ API. تم تعديل الكود لاستخدام `createOrder` و `createShipment` من `checkoutApi` بحيث تُسجَّل الطلبات والشحنات على السيرفر وتظهر في لوحة التاجر والأدمن.

---

## 2. الوظائف التي تعمل بشكل صحيح

### 2.1 المصادقة (Auth)
- **تسجيل المستخدم (Register):** `POST /api/auth/register` — الـ validation والربط مع Supabase يعملان.
- **تسجيل الدخول (Login):** `POST /api/auth/login` — إصدار JWT و Cookie (same-origin) أو Bearer (cross-origin) يعمل.
- **استرداد الجلسة:** `GET /api/auth/me` — يعيد بيانات المستخدم عند وجود JWT/كوكي صالح.
- **استعادة كلمة المرور / التحقق من البريد:** المسارات موجودة ومربوطة.

### 2.2 الطلبات (Orders)
- **إنشاء الطلب:** `POST /api/orders` — بعد الإصلاح، مسار إنشاء الطلب من صفحة الدفع (CheckoutPage) ومن نموذج الطلب داخل CustomerView يستخدمان نفس الـ API ويخزّنان في قاعدة البيانات.
- **قائمة طلباتي:** `GET /api/orders` — للمستخدم المسجّل.
- **طلبات التاجر:** `GET /api/orders/merchant` — مع المصادقة ودور MERCHANT.
- **جلب طلب واحد:** `GET /api/orders/:id` — مع دعم اختياري لـ `X-Order-Guest-Token` للضيوف.
- **إلغاء الطلب:** `PATCH /api/orders/:id/cancel`.
- **ربط طلب الضيف بالمستخدم:** `PATCH /api/orders/:id/claim`.
- **تحديث فاتورة الطلب:** `PATCH /api/orders/:id/invoice`.
- **إتمام الطلب (أدمن):** `PATCH /api/orders/:id/complete`.

### 2.3 السلة (Cart)
- **عرض السلة / إضافة / تحديث الكمية / حذف:** `GET/POST/PATCH/DELETE /api/cart` و `/api/cart/items` — متوافقة مع استدعاءات `cartApi.ts`.

### 2.4 المنتجات
- **قائمة المنتجات، جلب منتج، منتجات التاجر:** المسارات تعمل مع تطبيق عروض الأسعار (applyOfferPrices) وحقول `final_price` و `discount_percent`.

### 2.5 الدفع
- **إنشاء جلسة Cybersource (Hosted Checkout):** `POST /api/payment/cybersource/hosted/session` — مستخدم من CheckoutPage.
- **استدعاء الدفع المباشر:** `POST /api/payment/cybersource/charge` — متوافق مع الفرونت.

### 2.6 الشحن (Shipment)
- **إنشاء شحنة:** `POST /api/shipment/create` — يحدّث الطلب بـ `shipment_id` و `shipment_status`.
- **حالة الشحنة:** `GET /api/shipment/status` — مع مزامنة الحالة مع الطلب عند الطلب.
- **إلغاء الشحنة:** يحدّث حالة الطلب إلى CANCELLED عند الإلغاء من LogesTechs.

### 2.7 العناوين
- **المحافظات والقرى:** `GET /api/addresses/cities` و `/api/addresses/villages` و `/api/addresses/districts-villages` — مستخدمة في نموذج الشحن والدفع.

### 2.8 التحليلات
- **نظرة عامة للأدمن:** `GET /api/analytics/admin/overview`.
- **نظرة عامة للتاجر:** `GET /api/analytics/merchant/overview`.

### 2.9 الإشعارات
- **تعليم كمقروء:** `PATCH /api/notifications/:id/read` — متوافق مع `interactionApi.ts`.

### 2.10 العروض، الوسيط، التاجر، الشات، الصحة
- مسارات العروض (offers)، المنتجات المشتركة، المتابعة، لوحة التاجر، الإشعارات، الشات، ومسارات الصحة (`/api/health`, `/api/status`) موجودة ومربوطة.

---

## 3. المشاكل التي وُجدت وتم إصلاحها

### 3.1 (تم الإصلاح) طلبات من نموذج الطلب داخل CustomerView لا تُحفظ على السيرفر

- **الملف:** `views/CustomerView.tsx` — دالة `finalizeCheckout`.
- **المشكلة:** كانت تستخدم `marketStore.placeOrder()` الذي يحفظ الطلب في التخزين المحلي (Frontend فقط) ولا يرسل أي طلب إلى `POST /api/orders`.
- **الإصلاح:** تم استبدال التدفق لاستخدام:
  - `createOrderApi()` من `services/checkoutApi.ts` لإنشاء الطلب على الـ Backend.
  - `createShipmentApi()` من نفس الملف لإنشاء الشحنة عبر `POST /api/shipment/create` وتحديث الطلب.
  - بعد النجاح يتم استدعاء `fetchMyOrders()` لتحديث قائمة الطلبات في الواجهة.
- **ملاحظة:** واجهة `CreateOrderBody` في `checkoutApi.ts` تم توسيعها بحقول اختيارية `payment_method`, `cityId`, `villageId` ليتوافق الطلب مع الـ validation في السيرفر.

---

## 4. مشاكل محتملة أو تحت مراقبة

### 4.1 إنشاء الشحنة من الفرونت (Flashline vs Backend)

- **السياق:** في `CustomerView` بعد الإصلاح نستخدم `createShipmentApi` (Backend) لإنشاء الشحنة. خدمة `flashlineService.createShipment` عند تعطيل الـ Mock ترجع "Real API disabled in config" ولا تتصل بالـ Backend.
- **التوصية:** التأكد من أن أي مسار آخر يستخدم إنشاء الشحنات إما عبر `checkoutApi.createShipment` (Backend) أو تفعيل التكامل الحقيقي في `flashlineService` حسب البنية المطلوبة.

### 4.2 سيناريو الدفع الرقمي في CustomerView

- **السياق:** `paymentProcessor.processDigitalPayment()` يُستدعى قبل إنشاء الطلبات. إن كان هذا المحاكي أو يتصل ببوابة دفع حقيقية، يجب التأكد أن الطلبات لا تُنشأ إلا بعد تأكيد الدفع حسب سياسة التطبيق.

### 4.3 طلبات متعددة المنتجات من تجار مختلفين

- **السياق:** الـ Backend يستنتج `merchant_id` من **أول منتج** في الطلب. إذا كانت السلة تحتوي منتجات من أكثر من تاجر، الطلب الحالي سيكون مرتبطاً بتاجر واحد فقط.
- **التوصية:** إما تجميع عناصر السلة حسب التاجر وإنشاء طلب منفصل لكل تاجر (منطق إضافي في الفرونت أو الباكند)، أو توثيق أن الطلب الحالي يدعم تاجراً واحداً لكل طلب.

---

## 5. السيناريوهات الأساسية ونتائج التحقق

| السيناريو | الحالة | ملاحظات |
|-----------|--------|---------|
| تسجيل المستخدم | يعمل | مسار Register والـ validation يعملان. |
| تسجيل الدخول | يعمل | Login و JWT/Cookie و /api/auth/me. |
| إرسال الطلب | يعمل بعد الإصلاح | من CheckoutPage ومن نموذج CustomerView عبر createOrder API. |
| قبول/رفض الطلب من مزود الخدمة | يعمل | التاجر يغيّر الحالة؛ إلغاء الطلب عبر PATCH cancel. |
| تحديث حالة الطلب | يعمل | عبر الـ controllers والـ services (إلغاء، إتمام، فاتورة، شحن). |
| تتبع الطلب من قبل المستخدم | يعمل | GET /api/orders/:id و GET /api/shipment/status مع مزامنة الحالة. |

---

## 6. قائمة المشاكل حسب الأولوية

### أولوية عالية (تم التعامل معها)
1. **طلبات من نموذج الطلب في CustomerView لا تُسجّل على السيرفر** — تم الإصلاح باستخدام `createOrderApi` و `createShipmentApi` وتحديث القائمة عبر `fetchMyOrders`.

### أولوية متوسطة (مراقبة / تحسين)
2. **إنشاء الشحنات:** التأكد أن كل مسارات إنشاء الشحنات إما عبر Backend أو مدمجة بشكل صريح مع الخدمة الخارجية.
3. **دفع رقمي في CustomerView:** ربط منطق `processDigitalPayment` بسياسة الدفع (لا إنشاء طلب قبل التأكيد إن لزم).
4. **سلة متعددة التجار:** توثيق أو تطوير منطق "طلب واحد لكل تاجر" إذا كان مطلوباً.

### أولوية منخفضة
5. **تحسين رسائل الخطأ:** توحيد شكل الأخطاء المرجعة من الـ API (مثلاً `error` أو `message`) لسهولة العرض في الفرونت.
6. **التحقق من وجود حقل `city`:** الـ validation يتطلب `city` (نص). الفرونت يرسله في CheckoutPage (`form.cityName || form.cityId`) وفي CustomerView بعد الإصلاح (`shippingData.cityName || String(shippingData.cityId)`).

---

## 7. اقتراحات لتحسين الاستقرار والأداء

1. **الطلبات:** إبقاء استخدام `createOrder` و `createShipment` من الـ API في أي مسار checkout آخر (تجنب الاعتماد على التخزين المحلي فقط للطلبات النهائية).
2. **التحقق (Validation):** الحفاظ على Joi في الباكند لجميع مدخلات الطلبات والدفع والشحن؛ الفرونت يرسل `city`, `cityId`, `villageId` و `payment_method` حيث مطلوب.
3. **الذاكرة والأداء:** تم في جلسات سابقة تخفيف حجم الكاش وعدد الـ workers وتحديد حد لـ idempotency في الدفع؛ الاستمرار في مراقبة استهلاك الذاكرة على Render.
4. **السجلات (Logs):** الاعتماد على الـ logger في السيرفر بدلاً من `console.log` في المسارات الحساسة (مثل الدفع والشحن) لتسهيل تتبع الأخطاء.
5. **اختبار آلي:** إضافة اختبارات تكاملية لـ POST /api/orders و POST /api/shipment/create و PATCH cancel/claim لضمان عدم كسر التدفق عند التعديلات المستقبلية.

---

## 8. الملفات المعدّلة في هذا التقرير

- `services/checkoutApi.ts`: إضافة حقول اختيارية `payment_method`, `cityId`, `villageId` إلى `CreateOrderBody`.
- `views/CustomerView.tsx`: استيراد `createOrder` و `createShipment` من checkoutApi؛ إعادة كتابة `finalizeCheckout` لاستخدام الـ API ثم `fetchMyOrders` وتحديث `apiOrders` بعد النجاح.

---

*نهاية التقرير.*
