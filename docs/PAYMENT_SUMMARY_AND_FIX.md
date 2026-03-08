# تلخيص مهم + حل المشكلة — الدفع Cybersource

---

## حل سريع: البنك قال "ما في قيم للتست"

- **المشكلة:** البنك يقول إنه في حساب الاختبار لا توجد قيم لـ outlet/terminal ولا يعطونك إياها — المطلوب من التوثيق.
- **الحقيقة من التوثيق:** الحقول `outlet_id` و `terminal_id` **ليست من الحقول الإلزامية** في Secure Acceptance (Required Signed Fields). لا يوجد في توثيق Cybersource قيم اختبار جاهزة لهذه الحقول.
- **الحل المطبّق في الكود:**
  1. الكود **لا يرسل** outlet/terminal إلا إذا وضعت في `.env` قيماً **حقيقية** (ليست فارغة وليست قيماً وهمية مثل `TEST_*`).
  2. للاختبار: **لا تضف** في `server/.env` أي من: `CYBS_ILS_OUTLET_ID`, `CYBS_ILS_TERMINAL_ID`, `CYBS_USD_OUTLET_ID`, `CYBS_USD_TERMINAL_ID`. اتركها غير معرّفة. بهذا الشكل لن تُرسل هذه الحقول ولن يظهر خطأ 150 بسببها.
  3. إذا كانت قديمة في `.env` (مثل `TEST_ILS_OUTLET`) احذفها أو اتركها معلّقة؛ الكود يتجاهل أي قيمة تبدأ بـ `TEST_` ولا يرسلها.
- **مطلوب منك:** إعداد البروفايل في Business Center (بطاقات، عملة، Security Keys، Customer Redirect، Merchant POST URL) وإيقاف Service Fee إن وُجد. بعدها جرّب الدفع بدون أي قيم outlet/terminal.

---

## ١) التلخيص المهم

| البند | الوضع |
|-------|--------|
| **طريقة الدفع في الموقع** | Hosted Checkout (الزبون يضغط "متابعة للدفع" → صفحة الدفع والشحن → ثم يُحوّل لصفحة Cybersource لإدخال البطاقة). |
| **الكود** | جاهز: توقيع HMAC-SHA256، كل الحقول المطلوبة، استقبال إشعار التاجر على `/api/payments/cybersource/notify`. |
| **ما يعتمد على إعدادك** | البروفايل في Business Center (بطاقات، عملة، مفاتيح أمان، صفحة الاستجابة، إشعار التاجر). |
| **ما قد يطلبه البنك/المعالج** | عملة محددة (USD أو ILS)، إيقاف Service Fee، تفعيل حقل الدولة، وقيم `outlet_id` و `terminal_id` إن كانت إلزامية. |

**الخلاصة:** التكامل في المشروع صحيح. إذا ظهر خطأ (400 أو 150 أو 101) فالمصدر عادة: إعدادات البروفايل أو متطلبات البنك، وليس خطأ في الكود.

---

## ٢) المشكلة

- **Hosted Checkout:** بعد الضغط على "متابعة للدفع" يظهر **400 Bad Request** من Cybersource، مع رسائل مثل:
  - Reason **150**: Service Fee غير مضبوط، أو `ils_outlet_id` / `ils_terminal_id` ناقص أو غير صالح.
  - Reason **101**: حقول مطلوبة ناقصة (مثل `bill_country`).
- **أو** عند استخدام REST API للاختبار يظهر **401 Authentication Failed** لأن مفاتيح REST غير صحيحة أو غير مفعّلة لهذا التاجر.

---

## ٣) الحل — خطوة بخطوة

### أ) حل Hosted Checkout (400 / 150 / 101)

**1. إعداد البروفايل في Business Center (Test)**

- ادخل: [businesscentertest.cybersource.com](https://businesscentertest.cybersource.com)
- **Payment Configuration** → **Secure Acceptance Settings** → اختر البروفايل (أو أنشئ واحداً).
- **Payment Settings** → **Add Card Types** → فعّل Visa/Mastercard والعملة المناسبة (USD أو ILS حسب البنك).
- **Security** → **Create Key** → HMAC-SHA256 → انسخ **Access Key** و **Secret Key** وضعهم في `server/.env`:
  - `CYBS_PROFILE_ID=...`
  - `CYBS_ACCESS_KEY=...`
  - `CYBS_SECRET_KEY=...`
- **Customer Response** → أدخل **Customer Redirect after Checkout** (مثل `https://palma.ps/#/checkout-return`).
- **Notifications** → **Merchant POST URL** = `https://نطاق-الباكند-لديك/api/payments/cybersource/notify`
- **تفعيل البروفايل:** **Promote Profile** → Confirm.

**2. إيقاف Service Fee (إن كان يسبب 150)**

- في نفس البروفايل: **Payment Settings**.
- إذا وجدت خيار **Service Fee** أو **Service Fee applies on this profile** → أوقفه أو تأكد أن الحساب لا يفرض رسوم خدمة على هذا البروفايل.
- احفظ التغييرات.

**3. تفعيل حقل الدولة (إن كان يسبب 101)**

- **Payment Form** (أو Checkout Configuration) → **Billing Information**.
- فعّل حقل **Country** (Display/Edit/Require حسب الحاجة) حتى يرسل الزبون أو النظام `bill_to_address_country`.
- إذا أردت أن يملأها موقعك: أضف في الطلب من الباكند حقل `bill_to_address_country` (مثلاً من عنوان الزبون) في جلسة Hosted؛ الكود الحالي لا يرسلها — يمكن إضافتها لاحقاً إن طلب البنك.

**4. قيم outlet_id و terminal_id — مهم للاختبار**

- **في بيئة الاختبار:** البنك غالباً لا يعطي قيماً. حسب التوثيق الرسمي Cybersource، الحقول **ليست من الحقول المطلوبة** (Required Signed Fields).
- **الحل:** لا تضف في `server/.env` أي متغيرات لـ outlet/terminal للاختبار (اترك `CYBS_ILS_OUTLET_ID` و `CYBS_ILS_TERMINAL_ID` وغيرها **غير معرّفة**). الكود **لا يرسل** هذه الحقول إلا إذا وُجدت قيم حقيقية (ولا يرسل قيماً وهمية مثل TEST_*)، وبالتالي لن يظهر خطأ 150 بسببها.
- **للإنتاج لاحقاً:** عندما يعطيك البنك قيماً حقيقية، أضفها في `.env`:
  - `CYBS_ILS_OUTLET_ID=القيمة_من_البنك`
  - `CYBS_ILS_TERMINAL_ID=القيمة_من_البنك`
  - أو للـ USD: `CYBS_USD_OUTLET_ID` و `CYBS_USD_TERMINAL_ID`
- أعد تشغيل الباكند بعد أي تعديل على `.env`.

**5. تطابق العملة**

- في البروفايل: العملة المُفعّلة (USD أو ILS) يجب أن تطابق ما يرسله الكود.
- في `server/.env`: `CYBS_CURRENCY=USD` أو `CYBS_CURRENCY=ILS` حسب ما فعّلته في البروفايل والبنك.

---

### ب) حل REST API 401 (إن كنت تختبر REST)

- 401 = Cybersource رفض المفتاح (Key ID / Shared Secret غير صحيح أو غير مفعّل لـ REST على هذا Merchant).
- **الحل:** استخدم مفاتيح **REST API** من Cybersource (ليست مفاتيح Hosted Checkout).
- في Business Center: **Key Management** أو **API Keys** → أنشئ مفتاحاً من نوع **REST** أو **Simple Order API** لبيئة **Test**، ثم ضع في `server/.env`:
  - `CYBS_REST_MERCHANT_ID=...`
  - `CYBS_REST_KEY_ID=...`
  - `CYBS_REST_SECRET_KEY=...`
- إن استمر 401: راسل البنك أو Cybersource واطلب التأكد أن مفتاح REST مفعّل لـ Merchant ID المستخدم في بيئة Test.

---

## ٤) ترتيب التنفيذ (اقتراح)

1. إكمال إعداد البروفايل (بطاقات، عملة، Security Keys، Customer Response، Merchant POST URL) ثم **Promote Profile**.
2. إيقاف Service Fee في البروفايل إن وُجد.
3. تفعيل حقل **Country** في Billing إن كان مطلوباً (101).
4. إذا ظهر 150 بسبب outlet/terminal: الحصول على القيم من البنك ووضعها في `.env` ثم إعادة تشغيل الباكند.
5. التأكد أن `CYBS_CURRENCY` في `.env` مطابق للعملة في البروفايل.
6. اختبار الدفع من الموقع (سلة → متابعة للدفع → إكمال البيانات → التحويل لصفحة Cybersource وإدخال بطاقة اختبار مثل 4111111111111111).

---

## ٥) مراجع داخل المشروع

- تفعيل البروفايل بالتفصيل: `docs/CYBERSOURCE_HOSTED_CHECKOUT_ACTIVATION.md`
- التحقق من الروابط والكود: `docs/CYBERSOURCE_LINKS_VERIFICATION.md`

---

**باختصار:** الكود جاهز. المشكلة من إعداد البروفايل أو متطلبات البنك. نفّذ الخطوات أعلاه (بروفايل كامل، إيقاف Service Fee، دولة وعملة وoutlet/terminal إن لزم)، وإذا استمر خطأ معين أرسل **Reason Code** والرسالة من Cybersource لضبط الحل بدقة.
