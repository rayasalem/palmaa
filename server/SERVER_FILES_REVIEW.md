# مراجعة ملفات السيرفر (Server Files Review)

تمت مراجعة الملفات الرئيسية للسيرفر مباشرة. هذا ملخص سريع.

---

## 1. نقطة الدخول والإعداد

| الملف | الحالة | ملاحظات |
|-------|--------|---------|
| `server.js` | ✅ | تحميل dotenv، نسخ VITE_* → SUPABASE_*، تسجيل الـ routes بالترتيب الصحيح، معالجة الأخطاء، `/api/status` مسجّل صراحةً |
| `config/env.js` | ✅ | JWT_SECRET مطلوب فقط؛ Supabase اختياري (تحذير فقط عند الغياب) |
| `config/supabaseClient.js` | ✅ | عند غياب المتغيرات يُستخدم stub فلا يقع السيرفر؛ يقرأ VITE_* و SUPABASE_* |
| `config/redisClient.js` | ✅ | اختياري؛ يرجع null عند غياب REDIS_URL |
| `config/rateLimitStore.js` | ✅ | يعتمد على redisClient؛ لا يرمي عند التشغيل |

---

## 2. المسارات (Routes)

| المسار | الملف | الحالة |
|--------|--------|--------|
| `/health`, `/ready`, `/metrics`, `/status` | `routes/healthRoutes.js` | ✅ معرّفة؛ و`/api/status` مكرّر صراحةً في server.js |
| `/api/auth/*` | `routes/authRoutes.js` | ✅ login, logout, me, register, verify-email, forgot-password, reset-password, check-key, ping |
| `/api/products/*` | `routes/productRoutes.js` | ✅ list عام، listByMerchant، getById، create/update/delete (مع auth) |
| `/api/orders/*` | `routes/orderRoutes.js` | ✅ listMyOrders, listMerchantOrders, createOrder, getOrder, cancel, claim, invoice, complete |
| الباقي | payment, shipment, cart, admin, broker, addresses, notifications, chat, follow, merchant, shared-products | ✅ مسجّلة في server.js |

---

## 3. الـ Middlewares

| الملف | الوظيفة |
|-------|---------|
| `corsMiddleware.js` | ✅ قائمة ALLOWED_ORIGINS (palma.ps, onrender, localhost…) + isLocalOrigin لأي localhost |
| `security.js` | ✅ Helmet، generalLimiter، authLimiter، paymentLimiter، productListLimiter، إلخ |
| `authMiddleware.js` | ✅ authenticate، requireRole، optionalAuth؛ JWT من cookie أو Authorization |
| `validate.js` | ✅ يربط Joi بالـ body/query ويرجع 400 عند الخطأ |
| `errorHandler.js` | ✅ معالج أخطاء عام؛ يخفي الـ stack في الإنتاج |
| `requestIdMiddleware`, `requestLogger`, `requestTimeout`, `sanitizeErrorResponse` | ✅ مسجّلة في server.js |

---

## 4. التحكم والمصادقة

| الملف | ملاحظات |
|-------|---------|
| `controllers/authController.js` | ✅ login (trim email/password، تأكيد البريد، MFA)، getMe، register، verify، forgot/reset |
| `services/auth/login.js` | ✅ استعلام Supabase (users)، مقارنة bcrypt، دعم demo admin؛ تسجيل أخطاء Supabase |
| `services/authService.js` | ✅ re-export من auth/index (login, getUserById, getTokenVersion، إلخ) |
| `services/jwtService.js` | ✅ في الإنتاج يتطلب JWT_SECRET (32+ حرف)؛ cookie options مع SameSite=none في الإنتاج |

---

## 5. المنتجات والطلبات

| الملف | ملاحظات |
|-------|---------|
| `controllers/productController.js` | ✅ list, getById, listByMerchant مع try/catch و 500 عند خطأ |
| `services/productService.js` | ✅ getActiveProducts، getProductById، getMerchantNamesMap؛ يستخدم supabase من config |
| `controllers/orderController.js` | ✅ createOrder، getOrder (UUID أو ORD-xxxxxxxx)، listMyOrders، claimOrder |
| `services/orderService.js` | ✅ createOrder (order_reference، cityId/villageId)، getOrderById (UUID أو order_reference) |

---

## 6. التحقق (Validation)

| الملف | ملاحظات |
|-------|---------|
| `validation/schemas.js` | ✅ auth.login: email trim + required، password min(1)； orders.create مع cityId, villageId |

---

## 7. تسلسل الطلبات في server.js (مختصر)

1. dotenv + نسخ VITE_* → SUPABASE_*
2. CORS, Helmet, compression, cookieParser, express.json, csrfHeader
3. requestId → **healthRoutes** (/, /api) → **app.get('/api/status')** → generalLimiter → requestLogger → metrics → requestTimeout → sanitizeErrorResponse
4. POST /api/payments/cybersource/rest/process
5. /api/orders, /api/products, /api/payment, /api/payments, /api/shipment, /api/auth, /api/addresses, /api/cart, /api/admin, /api/broker, /api/shared-products, /api/follow, /api/merchant, /api/notifications, /api/chat
6. sandbox-pay، static، **404 handler** `res.status(404).json({ error: 'Not found' })`، errorHandler

---

## 8. خلاصة للمشاكل الشائعة

- **السيرفر يقع عند البدء:** تم التعامل معه بعدم رمي خطأ عند غياب Supabase (stub في supabaseClient + تحذير فقط في env).
- **`/api/status` يرجع Not found:** المسار مكرّر صراحةً في server.js كـ `app.get('/api/status', ...)` حتى لو لم تُنشر آخر نسخة من healthRoutes.
- **401 على /api/auth/me:** طبيعي عند عدم تسجيل الدخول؛ الواجهة تتوقع ذلك.
- **المنتجات أو الدخول لا يعملان:** تحقق من أن متغيرات Supabase مضبوطة على Render (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY أو SUPABASE_*)، ويفضّل استخدام مفتاح **service_role** للباكند.

---

---

## 9. مشاكل مشابهة تم تفاديها (مراجعة إضافية)

| المشكلة | الحل |
|--------|------|
| **validate(schema)** عندما `schema` غير معرّف | في `validate.js`: التحقق من وجود `schema` و `schema.validate` قبل الاستدعاء؛ إرجاع 500 مع رسالة واضحة بدل crash. |
| **orderId** بصيغة ORD-xxx في التحديثات | في `orderService`: cancelOrder، updateOrderInvoice، completeOrder تستخدم `getOrderById(orderId)` ثم `order.id` (UUID) في `.eq('id', id) حتى تعمل مع الطلبات بالمرجع القصير. |
| **paymentService** REST card payment | استخدام `order.id` (من getOrderById) في تحديث payment_method بدل `orderId` عندما يكون المرجع ORD-xxx. |
| **shipmentService.updateOrderShipment** | حلّ orderId عبر `getOrderById` ثم التحديث بـ `order.id` ليدعم UUID و ORD-xxx. |
| **mfaService** عند غياب أعمدة mfa_enabled/mfa_secret | في getMfaStatus/getMfaSecret: عند خطأ 42703 إرجاع enabled: false أو secret: null بدون رمي. في setupMfa/verifyAndEnableMfa/disableMfa: معالجة 42703 برسالة "run migration 011" أو no-op. |

*آخر مراجعة: بناءً على محتويات الملفات الحالية في server/.*
