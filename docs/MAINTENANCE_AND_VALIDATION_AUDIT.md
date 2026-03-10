# تقييم الصيانة والتحقق المركزي

## 1. تقسيم adminService إلى خدمات أصغر

تم تقسيم `server/services/adminService.js` إلى خدمات حسب النطاق:

| الخدمة       | الملف                                           | الوظائف                                                  |
| ------------ | ----------------------------------------------- | -------------------------------------------------------- |
| **Users**    | `server/services/admin/adminUsersService.js`    | listUsers, updateUserStatus, softDeleteUser, restoreUser |
| **Orders**   | `server/services/admin/adminOrdersService.js`   | listOrders                                               |
| **Products** | `server/services/admin/adminProductsService.js` | listProducts, adminUpdateProduct, adminDeleteProduct     |
| **Platform** | `server/services/admin/adminPlatformService.js` | getPlatformEarnings                                      |

- `server/services/adminService.js` بقي كـ **facade** يعيد تصدير الدوال نفسها لضمان عدم كسر أي استدعاء خارجي.
- الـ controller يستورد من `admin/*` مباشرة.

---

## 2. التحقق المركزي (Joi) – المسارات التي تستخدمه

| المسار       | التحقق                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**     | login, register, verify-email, forgot-password, reset-password, resend-verification (body)                                                               |
| **Cart**     | addItem (body), updateQuantity (body)                                                                                                                    |
| **Orders**   | create (body)                                                                                                                                            |
| **Products** | list (query: limit, offset, q, category), create (body), update (body), productComment.add (body)                                                        |
| **MFA**      | verify-setup (body), verify (body)                                                                                                                       |
| **Admin**    | listUsers (query), updateUserStatus (body), softDeleteUser (body), listOrders (query), listProducts (query), updateProduct (body), updateSettings (body) |

مسارات بدون تحقق Joi (معالجة بسيطة أو params فقط):

- Admin: restoreUser (id في path)، deleteProduct (id في path)، getSettings، getPlatformEarnings (بدون body/query).
- مسارات أخرى: GET بالـ id فقط أو بدون body (يُفضّل إضافة تحقق للـ query حيث يلزم).

---

## 3. AdminView والتبويبات Lazy-load

- **الحالي:** كل التبويبات (Users, Orders, Products, Treasury, Platform) داخل `AdminView.tsx`؛ تحميل بيانات products/orders/platform عند أول زيارة للتبويب.
- **المستهدف:** تقسيم كل تبويب إلى مكون lazy-load مستقل (خمس chunks) كما هو موثّق في `views/admin/README.md`.
- تم إعداد `AdminViewContext.tsx` لتمرير القيم والمعالجات دون كسر السلوك الحالي؛ الخطوة التالية هي استخراج مكونات التبويبات الخمسة وربطها بـ `React.lazy` و `Suspense` حسب التعليمات في نفس الملف.

---

## 4. OpenAPI/Swagger

- تم إنشاء **`docs/openapi.yaml`** يغطي:
  - Health: `/health`, `/ready`, `/metrics`
  - Auth: login, register, logout, verify-email, forgot/reset password, MFA
  - Products: list (مع q, category, limit, offset), create, get, update, delete, like, comment
  - Orders: list, create, get, patch (cancel, invoice, complete)
  - Cart: get, add item, update quantity, remove item, clear
  - Admin: users, orders, products, settings, platform-earnings
  - Payment, Addresses, Notifications, Merchant, Broker, Follow, Shipment, Chat

- يمكن استخدام الملف مع Swagger UI أو أي أداة متوافقة مع OpenAPI 3.

---

## 5. مقاييس الأداء وSLOs والتنبيهات

- تم إنشاء **`docs/SLO_AND_ALERTS.md`** ويتضمن:
  - SLOs مقترحة: Availability (99.5%)، Latency p95 (≤2s)، Error rate (&lt;1%).
  - استعلامات Grafana للطلبات/ثانية، معدل الأخطاء، زمن الاستجابة، الذاكرة، تجاوزات حد المعدل.
  - لوحة مراقبة مقترحة (Availability، طلبات/ثانية، p95، معدل أخطاء، ذاكرة).
  - قواعد تنبيه: HighErrorRate، HighLatencyP95، LowAvailability، HighRateLimitHits، HighMemoryRSS.
  - تكامل Prometheus ومراجعة دورية.

المقاييس الفعلية (مثل `palma_http_*`, `palma_process_*`) مُعرّفة في التطبيق وتُعرض على `GET /metrics` كما هو موثّق في `docs/PRODUCTION_SCALING_AND_MONITORING.md`.
