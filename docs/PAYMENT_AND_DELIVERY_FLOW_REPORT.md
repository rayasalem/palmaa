# تقرير: الدفع والتوصيل وربطهما في مشروع بالما

تقرير فني خطوة بخطوة مع أمثلة من الأكواد والملفات.

---

## 1. خطوات الدفع (Payment Flow)

### 1.1 جمع بيانات الدفع من المستخدم

**الملف:** `views/CheckoutPage.tsx`

- المستخدم يملأ نموذج الدفع والشحن في صفحة واحدة.
- **بيانات البطاقة** (للتحقق فقط في الواجهة عند Hosted Checkout؛ لا تُرسل لسيرفرنا):
  - `cardNumber`, `cardExpiryMonth`, `cardExpiryYear`, `cardCvv`, `cardholderName`
  - التحقق: رقم البطاقة 12–19 رقم، شهر/سنة انتهاء، CVV 3–4 أرقام، اسم الحامل (سطور 163–191).
- **لا يتم تخزين بيانات البطاقة** في المشروع؛ في Hosted Checkout يتم إدخالها مباشرة في صفحة Cybersource.

```tsx
// CheckoutPage.tsx – حالة النموذج (بيانات البطاقة للتحقق المحلي فقط)
const [form, setForm] = useState({
  recipient_name: '', addressLine1: '', addressLine2: '', cityId: '', villageId: '',
  cityName: '', villageName: '', phone: '', weight: 1, cod: 0, notes: '', ...
  cardNumber: '', cardExpiryMonth: '', cardExpiryYear: '', cardCvv: '', cardholderName: '',
});
```

- عند الضغط على "متابعة للدفع":
  1. التحقق من الحقول (شحن + بطاقة).
  2. استدعاء `createOrder(...)` ثم `createCybersourceHostedSession(orderId, totalAmount)`.
  3. بناء نموذج HTML مخفي بحقول الجلسة وإرساله POST إلى عنوان Hosted Checkout (تحويل المتصفح).

```tsx
// CheckoutPage.tsx ~262–291
const session = await createCybersourceHostedSession(orderId, totalAmount);
const redirectForm = document.createElement('form');
redirectForm.method = 'POST';
redirectForm.action = actionUrl;
Object.entries(fields).forEach(([name, value]) => { ... });
redirectForm.submit();
```

---

### 1.2 إرسال البيانات للبوابة الخارجية (Cybersource)

**طريقتان في المشروع:**

#### أ) Hosted Checkout (الطريقة المستخدمة حاليًا – Secure Acceptance Redirection)

- **الفرونتند:** `services/checkoutApi.ts`
  - `createCybersourceHostedSession(orderId, amount)` → `POST /api/payments/cybersource/hosted-session`
- **الباكند:** `server/modules/payments/cybersource/cybersource.controller.js` → `createHostedSessionHandler`
- **الخدمة:** `server/modules/payments/cybersource/cybersource.service.js` → `createHostedSession(orderId, amount)`

ما يحدث:
- بناء حقول موقّعة (HMAC-SHA256) حسب توثيق Cybersource:  
  `access_key`, `profile_id`, `transaction_uuid`, `signed_date_time`, `transaction_type`, `reference_number` (= orderId), `amount`, `currency`, `locale`, `signed_field_names`, `signature`.
- **لا تُرسل بيانات البطاقة من سيرفرنا**؛ المستخدم يُدخلها في صفحة Cybersource.
- الاستجابة: `action_url` (رابط Hosted Checkout) و`fields` (الحقول الموقّعة).
- الفرونتند يبني نموذجاً ويُرسله POST إلى `action_url` فيتحول المتصفح لصفحة الدفع لدى Cybersource.

```javascript
// cybersource.service.js – الحقول الموقّعة المرسلة
const REQUIRED_SIGNED_FIELDS = [
  'access_key', 'amount', 'currency', 'locale', 'profile_id',
  'reference_number', 'signed_date_time', 'signed_field_names',
  'transaction_type', 'transaction_uuid',
];
return { actionUrl: cfg.hostedPayUrl, fields: { ...fields, signature } };
```

#### ب) REST API (Simple Order) – احتياطي

- **الفرونتند:** `processCybersourceRestPayment(orderId, amount, currency)` في `checkoutApi.ts`.
- **الباكند:** `server/modules/payments/cybersource/cybersource.rest.controller.js` و `cybersource.rest.service.js`.
- هنا يتم إرسال تفاصيل البطاقة من الفرونتند إلى الباكند، والباكند يرسلها إلى Cybersource REST (pts/v2/payments). في الـ Hosted Checkout الحالي لا تُستخدم هذه المسار من صفحة الدفع الرئيسية.

---

### 1.3 التأكد من نجاح الدفع أو فشله

- **مصدر الحقيقة:** إشعار من Cybersource إلى السيرفر (Server-to-Server).
- **المسار:** `POST /api/payments/cybersource/notify`  
  **المعالج:** `server/modules/payments/cybersource/cybersource.controller.js` → `notificationHandler`  
  **المنطق:** `server/modules/payments/cybersource/cybersource.service.js` → `handleNotification(payload)`

الخطوات:
1. التحقق من التوقيع (HMAC) باستخدام `verifySignature(payload, cfg.secretKey)`.
2. استخراج `decision` (ACCEPT = نجاح، غير ذلك = فشل) و`orderId` من `req_reference_number` أو `reference_number`.
3. استدعاء `paymentService.handlePaymentCallback(orderId, 'success', idempotencyKey)` عند ACCEPT، أو `'failed'` عند غير ذلك.

```javascript
// cybersource.service.js
if (decision === 'ACCEPT') {
  const { error } = await paymentService.handlePaymentCallback(orderId, 'success', idempotencyKey);
  ...
}
// For non-ACCEPT:
await paymentService.handlePaymentCallback(orderId, 'failed', idempotencyKey);
```

- **العودة للمستخدم:** بعد الدفع تعيد Cybersource توجيه المستخدم إلى عنوان العودة (يُضبط في Business Center). يُفترض أن يكون الرابط يحتوي على `orderId` و`payment=success` أو `payment=failed` حتى تعرض التطبيق صفحة النتيجة وتستدل على الفشل دون الاعتماد على الإشعار فقط.

---

### 1.4 أين وكيف تُخزن حالة الدفع في قاعدة البيانات

- **الجدول:** `public.orders`
- **الحقول ذات الصلة:** `status`, `payment_method`, (وغيرها مثل `updated_at`)

**تحديث الحالة يتم في:**

`server/services/paymentService.js`

- `updateOrderStatus(orderId, status)` — يحدّث `orders.status` و`orders.updated_at`.
- `handlePaymentCallback(orderId, status, idempotencyKey)`:
  - يحدد الحالة الجديدة: `success` → `paid`, غير ذلك → `failed`.
  - يستدعي `updateOrderStatus(orderId, newStatus)`.
  - عند `paid`:
    - `decrementStockForOrder(orderId)` — خصم الكميات من المنتجات.
    - `profitService.recordProfitsForOrder(orderId)` — تسجيل أرباح الوسيط/التاجر.
    - `transactionService.recordOrderSettlement(...)` — تسجيل تسوية الطلب (عمولة، غرامة ضريبية إن وجدت).
  - Idempotency: إذا وُمرّر `idempotencyKey` يتم تخزين النتيجة في ذاكرة السيرفر لتجنب معالجة نفس الإشعار مرتين.

```javascript
// paymentService.js
async function handlePaymentCallback(orderId, status, idempotencyKey) {
  const newStatus = normalized === 'success' ? 'paid' : 'failed';
  const result = await updateOrderStatus(orderId, newStatus);
  if (!result.error && newStatus === 'paid') {
    await decrementStockForOrder(orderId);
    await profitService.recordProfitsForOrder(orderId);
    await transactionService.recordOrderSettlement(orderId, totalAmount, ...);
  }
  return result;
}
```

- **محاولات الدفع (سجل فقط):** `server/services/transactionService.js` → `recordPaymentAttempt(...)` يدرج صفاً في `transactions` من نوع PAYMENT (COMPLETED/FAILED) دون تغيير حالة الطلب؛ تغيير الحالة يتم فقط عبر `handlePaymentCallback` (من الإشعار أو من REST عند النجاح).

---

### 1.5 ملخص الملفات المسؤولة عن الدفع

| الملف | الدور |
|-------|--------|
| `views/CheckoutPage.tsx` | جمع بيانات الشحن والتحقق من البطاقة، إنشاء الطلب، طلب جلسة Hosted ثم التحويل لـ Cybersource |
| `services/checkoutApi.ts` | `createOrder`, `createCybersourceHostedSession`, `createShipment`, عناوين المدن/القرى |
| `server/controllers/orderController.js` | `createOrder` – التحقق من الجسم واستدعاء orderService |
| `server/services/orderService.js` | إنشاء سجل في `orders` و`order_items`، حالة أولية PENDING |
| `server/modules/payments/cybersource/cybersource.routes.js` | ربط `POST /hosted-session`, `POST /notify` |
| `server/modules/payments/cybersource/cybersource.controller.js` | `createHostedSessionHandler`, `notificationHandler` |
| `server/modules/payments/cybersource/cybersource.service.js` | إنشاء جلسة Hosted، معالجة الإشعار والتحقق من التوقيع واستدعاء handlePaymentCallback |
| `server/modules/payments/cybersource/cybersource.signature.js` | توقيع HMAC-SHA256 والتحقق منه |
| `server/services/paymentService.js` | `updateOrderStatus`, `handlePaymentCallback`, خصم المخزون، تسوية الطلب عند الدفع |
| `server/services/transactionService.js` | `recordOrderSettlement`, `recordPaymentAttempt` |
| جدول `orders` | تخزين `status` (PENDING → paid/failed)، `payment_method` |

---

## 2. خطوات التوصيل (Delivery / Shipment)

### 2.1 جمع بيانات الشحن

**الملف:** `views/CheckoutPage.tsx`

يتم جمع كل بيانات الشحن في نفس نموذج الدفع:

- **المدينة والقرية:** قائمة مدن من `getCities()` ثم قرى من `getVillages({ cityId })` (من `services/checkoutApi.ts` → `/api/addresses/cities`, `/api/addresses/villages`).
- **العنوان:** `addressLine1`, `addressLine2`.
- **الهاتف:** `phone` (المرسل والمستلم إن وُجد).
- **الوزن:** `weight` (كغ)، مع اقتراح حسب عدد القطع.
- **COD:** `cod` (قيمة التحصيل).
- **إضافي:** `quantity`, `notes`, `invoiceNumber`, `senderName`, `senderPhone`, `receiverName`, `receiverPhone`, `description`.

بعد إنشاء الطلب وقبل التحويل لـ Cybersource، تُحفظ تفاصيل الشحن في `localStorage` مفتاحها `checkout-shipment-${orderId}` لاستخدامها في صفحة العودة عند إنشاء الشحنة.

```tsx
// CheckoutPage.tsx ~230–259
const shipmentPayload = {
  orderId, addressLine1, addressLine2, cityId, cityName, villageId, villageName,
  recipient_name, phone, weight, cod, notes, invoiceNumber,
  senderName, senderPhone, receiverName, receiverPhone, quantity, description,
  serviceType: 'STANDARD', shipmentType: 'COD',
};
window.localStorage.setItem(`checkout-shipment-${orderId}`, JSON.stringify(shipmentPayload));
```

---

### 2.2 ربط التوصيل بالطلب بعد الدفع

- **لا يتم إنشاء الشحنة قبل تأكيد الدفع.**
- بعد عودة المستخدم من Cybersource إلى الموقع (مع `orderId` و`payment=success`)، تعرض التطبيق **صفحة العودة من الدفع** (`views/CheckoutReturnPage.tsx`):
  1. إذا كان `payment=success`: تبدأ استطلاعاً (polling) لـ `GET /api/orders/:orderId` كل 2 ثانية حتى تصبح `order.status === 'paid'` (أو حتى انتهاء مهلة 60 ثانية).
  2. عند ظهور `paid`: تنتقل إلى خطوة "جاري إنشاء الشحنة" وتقرأ من `localStorage` مفتاح `checkout-shipment-${orderId}`.
  3. تستدعي `createShipment({ ...payload, orderId })` من `services/checkoutApi.ts` → `POST /api/shipment/create`.

```tsx
// CheckoutReturnPage.tsx – استطلاع ثم إنشاء الشحنة
useEffect(() => {
  if (step !== 'waiting_payment' || !orderId) return;
  const poll = async () => {
    const status = await fetchOrder();
    if (status === 'paid') setStep('paid_creating_shipment');
    else if (status === 'failed') setStep('payment_failed');
    else setTimeout(poll, POLL_MS);
  };
  poll();
}, [step, orderId, fetchOrder]);

useEffect(() => {
  if (step !== 'paid_creating_shipment') return;
  const stored = window.localStorage.getItem(`checkout-shipment-${orderId}`);
  const res = await createShipment({ ...JSON.parse(stored), orderId });
  if (res.success) setStep('done');
}, [step, orderId, ...]);
```

---

### 2.3 إنشاء الشحنة وتحديث الطلب

**الباكند:**

- **المسار:** `POST /api/shipment/create`
- **المتحكم:** `server/controllers/shipmentController.js` → `createShipment`
- **الخدمة:** `server/services/shipmentService.js` → `createShipment(orderId, shipmentInput)`

الخطوات داخل `shipmentService.createShipment`:
1. التحقق من وجود الطلب وعدم وجود `delivery_id` مسبقاً.
2. إنشاء جسم الطلب لـ LogesTechs حسب `buildShipmentPayload` (مدينة، قرية، عنوان، مرسل، مستقبل، وزن، COD، نوع الخدمة، إلخ).
3. استدعاء LogesTechs: `POST ${SHIPMENT_API_BASE}/ship/request/by-email` مع `company-id` وبيانات الحزمة.
4. عند النجاح: استخراج `shipmentId` من الاستجابة واستدعاء `updateOrderShipment(orderId, shipmentId, shipmentStatus)`.

```javascript
// shipmentService.js
async function updateOrderShipment(orderId, shipmentId, shipmentStatus) {
  const updatePayload = {
    delivery_id: shipmentId,
    delivery_status: shipmentStatus,
    updated_at: now,
  };
  if (String(shipmentStatus).toLowerCase() === 'delivered') {
    updatePayload.completed_at = now;
    updatePayload.delivery_confirmed_at = now;
    updatePayload.status = 'completed';
  }
  await supabase.from(ORDERS_TABLE).update(updatePayload).eq('id', orderId).select().single();
}
```

- إذا لم تكن بيانات LogesTechs مضبوطة في `.env`، الخدمة تُنشئ شحنة محاكاة (sim) وتحدّث الطلب بـ `delivery_id` و`delivery_status` فقط.

---

### 2.4 تحديث حالة التوصيل في النظام

- **في قاعدة البيانات:** جدول `orders` — الحقول `delivery_id`, `delivery_status`. عند "delivered" يُحدَّث أيضاً `completed_at`, `delivery_confirmed_at`, `status = 'completed'`.
- **مصدر التحديث:**
  - عند الإنشاء: من استجابة LogesTechs داخل `createShipment` → `updateOrderShipment`.
  - لاحقاً: عبر استعلام حالة الشحنة من LogesTechs وعرضها في الواجهة (لا يوجد webhook في الكود الحالي لتحديث تلقائي لـ `delivery_status` عند تغيّر الحالة في LogesTechs).

**استعلام حالة الشحنة:**

- **الباكند:** `server/services/shipmentService.js` → `getPackageStatus({ id, barcode })` — يستدعي LogesTechs `GET /guests/packages/status?id=...` أو `?barcode=...`.
- **المسار:** `GET /api/shipment/status?id=...` أو `?barcode=...`
- **الفرونتند:** لوحة التاجر وطلبات الزبون تستدعي `getShipmentStatusApi` أو `getShipmentStatus` (مثلاً من `services/shipmentApi.ts` و`services/flashlineService.ts` أو من داخل المكونات) وتُحدَّث واجهة المستخدم فقط (لا يظهر في الكود تحديث تلقائي لـ `orders.delivery_status` من نتيجة هذا الاستعلام؛ يمكن إضافته لاحقاً).

---

### 2.5 ملخص الملفات المسؤولة عن التوصيل

| الملف | الدور |
|-------|--------|
| `views/CheckoutPage.tsx` | جمع مدينة، قرية، عنوان، هاتف، وزن، COD، وحفظها في localStorage مع orderId |
| `views/CheckoutReturnPage.tsx` | بعد العودة من الدفع: استطلاع حالة الطلب ثم استدعاء createShipment وقراءة localStorage |
| `services/checkoutApi.ts` | `createShipment`, `getCities`, `getVillages` |
| `server/controllers/shipmentController.js` | التحقق من الجسم واستدعاء shipmentService.createShipment، getStatus، printPdf، cancel |
| `server/services/shipmentService.js` | buildShipmentPayload، callCreateShipmentApi (LogesTechs)، updateOrderShipment، getPackageStatus، printAwb، cancelShipment |
| `server/services/addressService.js` | توفير المدن والقرى لـ /api/addresses |
| جدول `orders` | تخزين `delivery_id`, `delivery_status`, وعند التسليم `completed_at`, `status` |

---

## 3. ربط الدفع مع التوصيل

### 3.1 عند نجاح الدفع

1. **Cybersource** يرسل إشعاراً إلى `POST /api/payments/cybersource/notify` → `handleNotification` → `handlePaymentCallback(orderId, 'success')`.
2. **paymentService.handlePaymentCallback**:
   - يحدّث الطلب إلى `status = 'paid'`.
   - يخصم المخزون، يسجّل الأرباح، ويسجّل تسوية الطلب في `transactions`.
3. المستخدم يُعاد توجيهه إلى الموقع مع `orderId` و`payment=success`.
4. **CheckoutReturnPage** تستطلع الطلب حتى `status === 'paid'` ثم تستدعي **createShipment** بالبيانات المحفوظة في localStorage.
5. **shipmentService.createShipment** تنشئ الشحنة في LogesTechs وتحدّث الطلب بـ `delivery_id` و`delivery_status`.
6. لا يوجد في الكود إرسال إشعار داخلي (مثل notification) عند نجاح الدفع أو عند إنشاء الشحنة؛ يمكن إضافته لاحقاً (مثلاً عبر `notificationService` أو بريد).

**أكواد الربط:**

- تحديث الطلب إلى paid: `server/services/paymentService.js` → `handlePaymentCallback` → `updateOrderStatus(orderId, 'paid')`.
- إنشاء الشحنة فقط بعد paid: `views/CheckoutReturnPage.tsx` — الانتقال إلى `paid_creating_shipment` ثم استدعاء `createShipment` بعد التأكد من `status === 'paid'`.

---

### 3.2 عند فشل الدفع

1. **Cybersource** يرسل إشعاراً بقرار غير ACCEPT → `handlePaymentCallback(orderId, 'failed')`.
2. **paymentService** يحدّث الطلب إلى `status = 'failed'`.
3. لا يتم استدعاء `createShipment` لأن **CheckoutReturnPage** عند `payment=failed` تعرض "فشل الدفع" ولا تدخل خطوة الاستطلاع ولا إنشاء الشحنة. وعند `payment=success` إذا بقي الطلب غير `paid` (مثلاً تأخر الإشعار) تبقى الصفحة في "جاري تأكيد الدفع" حتى المهلة ثم يتوقف الاستطلاع؛ في هذه الحالة أيضاً لا تُنشأ شحنة لأن الشرط هو `status === 'paid'`.

```tsx
// CheckoutReturnPage.tsx
if (step === 'payment_failed') {
  return ( ... <XCircle /> فشل الدفع، زر العودة للتسوق ... );
}
// الشحنة تُنشأ فقط عندما step === 'paid_creating_shipment' بعد أن أصبح status === 'paid'
```

---

### 3.3 خلاصة الربط

| الحدث | التأثير على الطلب | التأثير على التوصيل |
|-------|-------------------|----------------------|
| نجاح الدفع (إشعار Cybersource) | `orders.status = 'paid'`، خصم مخزون، تسوية، أرباح | المستخدم يُوجّه لصفحة العودة؛ عند ظهور paid تُنشأ الشحنة وتُحدَّث `delivery_id` و`delivery_status` |
| فشل الدفع | `orders.status = 'failed'` | لا يُنشأ أي شحن؛ صفحة العودة تعرض فشل الدفع |
| إنشاء الشحنة | — | تحديث `orders.delivery_id`, `orders.delivery_status` (وعند delivered: `status = 'completed'`) |

**ملاحظة:** عنوان العودة من Cybersource (return URL) يُضبط في Business Center لـ Secure Acceptance بحيث يعيد المستخدم إلى الموقع مع `orderId` و`payment=success` أو `payment=failed`. التطبيق يعتمد على معلمة `payment` لاختيار عرض "جاري التأكيد" أو "فشل الدفع"، وعلى استطلاع حالة الطلب للتأكد من `paid` قبل إنشاء الشحنة.

---

*تم إعداد التقرير بناءً على فحص المشروع وتتبع مسارات الدفع والتوصيل في الكود.*
