# توافق LogesTechs API مع مجموعة Postman

مرجع: [LogesTechs APIs - Postman Collection](https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis)

يُستخدم هذا الملف للتحقق من أن كل استدعاءات الـ API في المشروع تطابق الطلبات في مجموعة Postman.

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

- `GET {base}/guests/{companyId}/villages?cityId=...`
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
