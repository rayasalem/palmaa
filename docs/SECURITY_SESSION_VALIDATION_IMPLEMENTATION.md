# تطبيق الأمان والجلسات والتحقق (Security, Session, Validation)

تم تنفيذ التحسينات التالية دون كسر الوظائف الحالية.

---

## 1. إدارة الجلسات / تسجيل الخروج من كل الأجهزة (Logout-All)

| العنصر                          | الحالة                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **حقل `token_version`**         | إضافة في جدول `users` عبر `supabase/migrations/011_token_version_and_mfa.sql`. القيمة الافتراضية 0.                                      |
| **JWT و `ver`**                 | عند تسجيل الدخول أو التحقق من البريد يُضمَّن في التوكن `ver = user.token_version`. التوكنات القديمة بدون `ver` تبقى مقبولة (توافق رجعي). |
| **التحقق في الـ middleware**    | إذا كان التوكن يحتوي على `ver`، يتم مقارنته مع `token_version` في قاعدة البيانات. إذا كان `ver` أقل من القيمة الحالية يُرفض الطلب (401). |
| **`POST /api/auth/logout-all`** | يتطلب مصادقة. يزيد `token_version` للمستخدم، يمسح الكوكي، ويرجع `{ success: true, message: 'Logged out from all devices' }`.             |

**ملاحظة:** تشغيل migration 011 على قاعدة الإنتاج ضروري لتفعيل logout-all و MFA.

---

## 2. تحديد معدل الطلبات لكل مسار (Rate Limiting)

| المسار                                      | الحد الافتراضي          | متغير البيئة                |
| ------------------------------------------- | ----------------------- | --------------------------- |
| `GET /api/products` (قائمة + قائمة بالتاجر) | 100 طلب / 15 دقيقة / IP | `RATE_LIMIT_PRODUCTS_LIST`  |
| `GET /api/products/:id` (وجميع تحت `/:id`)  | 300 طلب / 15 دقيقة / IP | `RATE_LIMIT_PRODUCTS_BY_ID` |

- عند تجاوز الحد: استجابة 429، تسجيل في السجل مع `requestId` و IP مُقنَّع (مثلاً `x.x.x.*`)، وزيادة عداد في `/metrics` (`palma_http_rate_limit_hits_total`).

---

## 3. التحقق من المدخلات (Joi)

- **Middleware:** `validate(schema, 'body'|'query', source)` في `server/middlewares/validate.js`. عند الفشل: 400، تسجيل بوسم `validation`، وزيادة `recordValidationFailure(source)` في المقاييس.
- **المسارات المغطاة:**
  - Auth: login, register, verify-email, forgot-password, reset-password, resend-verification
  - Cart: addItem
  - Orders: create
  - Products: create, update
  - MFA: verify-setup, verify
- المخططات في `server/validation/schemas.js`.

---

## 4. MFA (اختياري، تفعيل تدريجي)

| العنصر                                | الوصف                                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **الحقول في DB**                      | `mfa_enabled` (افتراضي false)، `mfa_secret` (نص، يمكن أن يكون null). في migration 011.                                                                                                      |
| **`GET /api/auth/mfa/status`**        | يتطلب مصادقة. يرجع `{ success: true, mfa_enabled: boolean }`.                                                                                                                               |
| **`POST /api/auth/mfa/setup`**        | يتطلب مصادقة. يولد سر TOTP ويحفظه مع `mfa_enabled: false`. يرجع `secret` و `otpauthUrl` لعرض QR.                                                                                            |
| **`POST /api/auth/mfa/verify-setup`** | Body: `{ code }` (أو `token`). يتطلب مصادقة. يتحقق من الرمز ثم يضع `mfa_enabled: true`.                                                                                                     |
| **`POST /api/auth/mfa/verify`**       | Body: `{ mfaChallengeToken, code }`. يُستدعى بعد تسجيل الدخول عندما يكون للمستخدم MFA مفعّل. يتحقق من الرمز ثم يصدر JWT عادي ويضبط الكوكي.                                                  |
| **تسجيل الدخول مع MFA**               | إذا كان `user.mfa_enabled`، لا يُضبط كوكي؛ يُرجع `{ requiresMfa: true, mfaChallengeToken, message: 'MFA code required' }`. الواجهة تستدعي بعدها `POST /api/auth/mfa/verify` بالتوكن والرمز. |

المكتبة: `speakeasy` لـ TOTP. الاعتماد في `server/package.json`.

---

## 5. التخزين المحلي ومفاتيح Supabase

- **localStorage (الواجهة):** يُفترض أن يُستخدم فقط لبيانات العرض (مثل `palma_current_user`، `palma_cart`، لغة). لا يُخزَّن JWT في localStorage؛ يُستخدم httpOnly cookie أو Bearer من sessionStorage عند cross-origin.
- **SUPABASE_SERVICE_KEY:** مستخدم فقط في الباكند (مثلاً `server/.env`). لا يظهر في كود الواجهة؛ الواجهة تستخدم `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` فقط.
- **Logger:** لا يُمرَّر أي مفتاح سري (JWT_SECRET، SUPABASE_SERVICE_KEY، إلخ) إلى الـ logger. `sanitizeForLog` يحذف حقول مثل password, token, secret, api_key, jwt_secret, supabase_service_key.

---

## 6. المراقبة والمقاييس (`/metrics`)

- **فشل التحقق (400):** `palma_http_validation_failures_total{source="..."}`.
- **تجاوز حد المعدل (429):** `palma_http_rate_limit_hits_total{route="..."}`.
- **فشل MFA:** `palma_http_mfa_failures_total{label="mfa_verify"|"mfa_verify_setup"}`.
- طلبات، أخطاء، ومدة الطلبات (p95/p99 من الـ histogram) كما هي في نفس endpoint.

---

## خطوات النشر الموصى بها

1. تشغيل migration 011 على قاعدة البيانات (إضافة `token_version`, `mfa_enabled`, `mfa_secret`).
2. تثبيت الاعتماديات: `npm install` في `server` (joi, speakeasy إن لم تكونا مثبتتين).
3. (اختياري) ضبط متغيرات البيئة: `RATE_LIMIT_PRODUCTS_LIST`, `RATE_LIMIT_PRODUCTS_BY_ID` إن رغبت في تغيير القيم الافتراضية.
4. إعادة تشغيل الباكند والتحقق من `/health` و `/ready` و `/metrics`.
5. التحقق من تسجيل الدخول، logout، و logout-all، ثم (إن رغبت) تفعيل MFA لمستخدم تجريبي واختبار المسار كاملاً.

جميع التغييرات مصممة لتكون متوافقة رجعياً مع السلوك الحالي (بدون MFA وبدون استدعاء logout-all يبقى السلوك كما هو).
