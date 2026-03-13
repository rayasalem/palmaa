# توافق LogesTechs API مع مجموعة Postman

مرجع: **[LogesTechs APIs - Postman Collection](https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis)**

اقرأ مجموعة Postman من الرابط أعلاه وطابق كل طلب فيها مع الجدول أدناه. كل طلب في المجموعة يجب أن يكون له مقابل في الكود أو في متغيرات البيئة.

---

## مراجعة سريعة من Postman (اقرأهن منيح)

| # | طلب في Postman | Method | المسار النموذجي | في المشروع | الملف / الملاحظة |
|---|----------------|--------|-----------------|------------|-------------------|
| 1 | **Cities / المحافظات** | GET | `guests/{companyId}/cities` أو `guests/cities` | ✅ | `addressService.js` → getCities()، مسارات بديلة مُجرَّبة |
| 2 | **Get Villages / Get Villages-Districts** | GET | `guests/{companyId}/villages` أو `guests/villages-districts` مع أو بدون `?cityId=` | ✅ | `addressService.js` → getVillages(), getDistrictsAndVillages() |
| 3 | **Create Shipment / Create Package / by-email** | POST | `ship/request/by-email` أو `guests/{companyId}/packages` | ✅ | `shipmentService.js` → callCreateShipmentApi(); المسار الافتراضي `/ship/request/by-email`، للتغيير: `LOGESTECHS_CREATE_SHIPMENT_PATH` |
| 4 | **Package Status / Get status** | GET | `guests/{companyId}/packages/status?id=` أو `?barcode=` | ✅ | `shipmentService.js` → getPackageStatus(); للتغيير: `LOGESTECHS_STATUS_PATH` |
| 5 | **Print AWB / PDF** | POST | `guests/{companyId}/packages/pdf` مع body `{ ids: [...] }` | ✅ | `shipmentService.js` → printAwb() |
| 6 | **Cancel Shipment** | PUT | `guests/{companyId}/packages/{id}/cancel` مع body `{ email, password }` | ✅ | `shipmentService.js` → cancelShipment() |

**الهيدر في كل الطلبات:** `Content-Type: application/json` و `company-id: <LOGESTECHS_COMPANY_ID>` (افتراضي 634).

**إنشاء الشحنة – الـ Body في الكود يطابق ما في Postman:**  
`email`, `password`, `pkgUnitType: "METRIC"`, `pkg` (cod, notes, invoiceNumber, senderName, businessSenderName, senderPhone, receiverName, receiverPhone, serviceType, shipmentType, quantity, description), `destinationAddress` (addressLine1, cityId, villageId, regionId), `originAddress` (نفس الحقول).

---

## الإعداد (Environment)

| متغير البيئة | الاستخدام | ملاحظة |
|-------------|-----------|--------|
| `SHIPMENT_API_BASE` | Base URL للـ API (مثال: `https://apisv2.logestechs.com/api`) | مطلوب للتوصيل والعناوين |
| `LOGESTECHS_COMPANY_ID` | معرف الشركة (مثال: `634`) | يُرسل في الهيدر `company-id` وفي بعض المسارات |
| `LOGESTECHS_EMAIL` | بريد تسجيل الدخول لـ LogesTechs | مطلوب لإنشاء الشحنات والإلغاء |
| `LOGESTECHS_PASSWORD` | كلمة مرور تسجيل الدخول | مطلوب مع الإيميل |
| `LOGESTECHS_CREATE_SHIPMENT_PATH` | مسار إنشاء الشحنة إذا اختلف عن الافتراضي | اختياري |
| `LOGESTECHS_STATUS_PATH` | مسار حالة الشحنة إذا اختلف | اختياري |

---

## الهيدرات (Headers)

كل الطلبات التي تتجه لـ LogesTechs تستخدم:

- `Content-Type: application/json`
- `company-id: <LOGESTECHS_COMPANY_ID>` (قيمة من env، افتراضي `634`)

---

## 1) العناوين – المدن/المحافظات (Cities / Districts)

**الغرض:** جلب قائمة المحافظات (المدن) لعرضها في قائمة منسدلة.

**المسارات المُجرَّبة بالترتيب (حتى يعمل أحدها):**

- `GET {base}/guests/{companyId}/cities`
- `GET {base}/guests/cities`
- `GET {base}/addresses/cities`
- `GET {base}/guests/{companyId}/villages-districts`
- `GET {base}/guests/villages-districts`
- `GET {base}/guests/districts`

**الملف:** `server/services/addressService.js` → `getCities()`

**في Postman:** تحقق من الطلب الذي يعيد قائمة المدن/المحافظات وطابق المسار والهيدر مع ما أعلاه.

---

## 2) العناوين – القرى/الأحياء (Villages / Get Villages-Districts)

**الغرض:** جلب القرى (أو القرى+المحافظات) – إما لكل محافظة أو دفعة واحدة.

**المسارات المُجرَّبة للقرى حسب المحافظة:**  
(يُرسل في الطلب معاملات الاستعلام: `cityId`, `city_id`, `search` حسب ما يدعمه الـ API)

- `GET {base}/guests/{companyId}/villages?cityId=...&city_id=...&search=...`
- `GET {base}/guests/{companyId}/villages-districts?cityId=...`
- `GET {base}/guests/villages-districts?cityId=...`
- `GET {base}/guests/villages?cityId=...`
- `GET {base}/guests/districts?cityId=...`
- `GET {base}/addresses/villages?cityId=...`
- `GET {base}/villages?cityId=...`
- `GET {base}/districts?cityId=...`

**المسارات المُجرَّبة لجلب المحافظات+القرى معاً (districts-villages):**

- `GET {base}/guests/{companyId}/villages-districts`
- `GET {base}/guests/villages-districts`
- `GET {base}/guests/districts/villages`
- `GET {base}/addresses/villages-districts`

**الملفات:**  
`server/services/addressService.js` → `getVillages()`, `getDistrictsAndVillages()`

**في Postman:** راجع طلب "Get Villages/Districts" وطابق المسار ووجود `company-id` و query مثل `cityId` إن وُجد.

---

## 3) إنشاء شحنة (Create Shipment)

**الغرض:** إنشاء شحنة بعد الدفع.

**الطلب الافتراضي في الكود:**

- **Method:** `POST`
- **URL:** `{SHIPMENT_API_BASE}/ship/request/by-email`
- **Override:** يمكن تعيين `LOGESTECHS_CREATE_SHIPMENT_PATH` (مثلاً `/guests/634/packages`) إن كان المسار في Postman مختلفاً.
- **Headers:** `company-id`, `Content-Type: application/json`
- **Body (مثال):**  
  `email`, `password`, `pkgUnitType`, `pkg`, `destinationAddress`, `originAddress`

**الملف:** `server/services/shipmentService.js` → `callCreateShipmentApi()`, `buildShipmentPayload()`

**في Postman:** راجع طلب "Create Shipment" أو "Create Package" وتأكد من:
- المسار (Path) مطابق أو مضبوط عبر `LOGESTECHS_CREATE_SHIPMENT_PATH`
- الهيدرات والـ body (email, password, pkg, destinationAddress, originAddress) كما في الكود.

---

## 4) حالة الشحنة (Package Status)

**الغرض:** الاستعلام عن حالة شحنة بـ id أو barcode.

**الطلب في الكود:**

- **Method:** `GET`
- **URL (افتراضي):** `{base}/guests/{companyId}/packages/status?id=...` أو `?barcode=...`
- **Override:** `LOGESTECHS_STATUS_PATH` إذا كان المسار في Postman مختلفاً (مثلاً `/guests/packages/status`).
- **Headers:** `company-id`, `Content-Type: application/json`

**الملف:** `server/services/shipmentService.js` → `getPackageStatus()`

**في Postman:** راجع طلب "Get package status" أو "Packages status" وطابق المسار والهيدر ومعاملات الاستعلام.

---

## 5) طباعة AWB (Print AWBs)

**الغرض:** الحصول على PDF لبطاقات الشحن.

**الطلب في الكود:**

- **Method:** `POST`
- **URL:** `{base}/guests/{companyId}/packages/pdf`
- **Headers:** `company-id`, `Content-Type: application/json`
- **Body:** `{ ids: [ ... shipment ids ... ] }`

**الملف:** `server/services/shipmentService.js` → `printAwb()`

**في Postman:** راجع طلب طباعة الـ PDF وطابق المسار والـ body.

---

## 6) إلغاء شحنة (Cancel Shipment)

**الغرض:** إلغاء شحنة.

**الطلب في الكود:**

- **Method:** `PUT`
- **URL:** `{base}/guests/{companyId}/packages/{shipmentId}/cancel`
- **Headers:** `company-id`, `Content-Type: application/json`
- **Body:** `{ email, password }`

**الملف:** `server/services/shipmentService.js` → `cancelShipment()`

**في Postman:** راجع طلب "Cancel shipment" وطابق المسار والهيدر والـ body.

---

## التحقق السريع من Postman

1. افتح [المجموعة على Postman](https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis).
2. لكل طلب في الجدول أعلاه:
   - قارن **Method** و **URL** (مع أو بدون `{companyId}`) بما في الكود.
   - تأكد أن الهيدر `company-id` مستخدم حيث يطلبه الـ API.
   - إذا كان المسار في Postman مختلفاً (مثلاً بدون `companyId` في الـ path)، استخدم متغيرات env أعلاه لضبط المسار دون تغيير المنطق الداخلي.

---

## تعديل المسار دون تغيير الكود

| إذا كان في Postman | ضبط في البيئة |
|--------------------|----------------|
| إنشاء شحنة على مسار آخر (مثلاً `/guests/634/packages`) | `LOGESTECHS_CREATE_SHIPMENT_PATH=/guests/634/packages` |
| حالة الشحنة على مسار بدون companyId (مثلاً `/guests/packages/status`) | `LOGESTECHS_STATUS_PATH=/guests/packages/status` |

بعد التعديل أعد تشغيل/نشر الخدمة حتى تُقرأ المتغيرات الجديدة.

---

## الطلب اللوجستيك ما يظهر عند الشركة — فحص سريع

عند الدفع واكتمال الطلب، الشحنة تُنشأ تلقائياً في السيرفر وتُرسل لـ LogesTechs **فقط** إذا تحققت الشروط التالية.

### 1) بيانات الدخول (على Render أو السيرفر)

- **`LOGESTECHS_EMAIL`** و **`LOGESTECHS_PASSWORD`** معبّأة ولا فارغة.
- بعد إضافة أو تعديل أي متغير بيئة: **إعادة نشر (Redeploy)** الخدمة حتى يقرأ السيرفر القيم الجديدة.

**في اللوج عند التشغيل:**

- إذا ظهر: `[shipmentService] LogesTechs: configured (credentials set). Real API will be used.` ← الـ API الحقيقي يُستدعى.
- إذا ظهر: `LogesTechs not configured ...` ← الشحنة تُحاكى محلياً ولا تُرسل للشركة.

### 2) الطلب يحتوي عنوان توصيل كامل

عند إنشاء الطلب (صفحة الدفع) يجب إرسال **المحافظة والقرية** مع الطلب حتى يحفظها السيرفر ويستخدمها لإنشاء الشحنة:

- في الـ Backend: الطلب يُخزّن في `orders` مع **`shipping_city_id`** و **`shipping_village_id`**.
- بعد الدفع، السيرفر يتحقق من وجود هذين الحقلين؛ إذا ناقص لا يُنشأ طلب لوجستيك.

**في اللوج بعد الدفع:**

- إذا ظهر: `paymentService createShipment skipped: order missing shipping_city_id or shipping_village_id` ← الطلب وُجد بدون محافظة/قرية (تحقق من أن صفحة الدفع ترسل `cityId` و `villageId`).
- إذا ظهر: `paymentService creating shipment for order (LogesTechs)` ثم `[shipmentService] Calling LogesTechs API to create shipment for order` ← تم استدعاء إنشاء الشحنة.

### 3) نجاح استدعاء LogesTechs

- إذا ظهر: `[shipmentService] LogesTechs API create-shipment success` ← الطلب قُبل من الـ API ويُفترض أن يظهر عند الشركة.
- إذا ظهر: `shipmentService Create shipment API error` ← راجع رسالة الخطأ (مسار، body، صلاحيات) وطابق مع مجموعة Postman.

### 4) ملخص التدفق

1. العميل يكمّل الدفع (مثلاً Cybersource).
2. الـ Backend يستقبل notify ويحدّث الطلب إلى `paid`.
3. يتحقق من وجود `shipping_city_id` و `shipping_village_id` على الطلب.
4. إذا وُجدا ولم يُنشأ للطلب شحنة سابقاً، يستدعي `shipmentService.createShipment(orderId, order)`.
5. إذا `LOGESTECHS_EMAIL` و `LOGESTECHS_PASSWORD` معبّأة، يُرسل طلب إنشاء شحنة لـ LogesTechs؛ وإلا تُحاكى الشحنة فقط ولا تظهر عند الشركة.

---

## خطوات المراجعة من مجموعة Postman (اقرأ بتمعن)

1. افتح [المجموعة](https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis?sideView=agentMode).
2. لكل طلب (Request) في المجموعة:
   - قارن **Method** و **URL** مع الجدول أعلاه ومع الكود (المسارات في `addressService.js` و `shipmentService.js`).
   - تأكد أن **Headers** تحتوي `Content-Type: application/json` و `company-id` حيث مطلوب.
   - للـ Create Shipment: قارن **Body** (email, password, pkg, destinationAddress, originAddress, pkgUnitType) مع `buildShipmentPayload()` في `shipmentService.js`.
3. إذا كان **المسار** في Postman يختلف عن الافتراضي في الكود (مثلاً إنشاء الشحنة على `POST /guests/634/packages` بدل `POST /ship/request/by-email`)، ضبط المتغير في البيئة:
   - `LOGESTECHS_CREATE_SHIPMENT_PATH=/guests/634/packages`
   - `LOGESTECHS_STATUS_PATH=/guests/634/packages/status` (إن اختلف)
4. بعد أي تعديل على متغيرات البيئة: **أعد تشغيل السيرفر** (محلياً) أو **Redeploy** (على Render).

---

## تأكيد نهائي – ماذا يفعل الكود بالضبط

| الوظيفة | الملف | الدالة | Method | المسار (أو الافتراضي) | الهيدرات | Body / Query |
|---------|-------|--------|--------|------------------------|----------|--------------|
| المحافظات | addressService.js | getCities() | GET | guests/{companyId}/cities ثم guests/cities ثم addresses/cities ثم villages-districts ثم districts | company-id, Content-Type: application/json | — |
| القرى | addressService.js | getVillages() | GET | guests/{companyId}/villages ثم villages-districts ثم villages ثم districts ثم addresses/villages ثم villages ثم districts | نفس أعلاه | cityId, city_id, search |
| محافظات+قرى دفعة واحدة | addressService.js | getDistrictsAndVillages() | GET | guests/{companyId}/villages-districts ثم guests/villages-districts ثم guests/districts/villages ثم addresses/villages-districts | نفس أعلاه | — |
| إنشاء شحنة | shipmentService.js | callCreateShipmentApi() | POST | /ship/request/by-email (أو LOGESTECHS_CREATE_SHIPMENT_PATH) | company-id, Content-Type: application/json | email, password, pkgUnitType, pkg, destinationAddress, originAddress |
| حالة الشحنة | shipmentService.js | getPackageStatus() | GET | guests/{companyId}/packages/status (أو LOGESTECHS_STATUS_PATH) | نفس أعلاه | ?id= أو ?barcode= |
| طباعة AWB | shipmentService.js | printAwb() | POST | guests/{companyId}/packages/pdf | نفس أعلاه | { ids: [ ... ] } |
| إلغاء شحنة | shipmentService.js | cancelShipment() | PUT | guests/{companyId}/packages/{shipmentId}/cancel | نفس أعلاه | { email, password } |

**Base URL:** `SHIPMENT_API_BASE` أو `LOGESTECHS_API_URL` (افتراضي في shipmentService: `https://apisv2.logestechs.com/api`).  
**company-id:** من `LOGESTECHS_COMPANY_ID` (افتراضي `634`).
