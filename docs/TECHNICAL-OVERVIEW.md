## نظرة تقنية شاملة على مشروع Palma Marketplace

### 1. معمارية المشروع (Architecture)

- **الهيكل العام**:
  - واجهة أمامية (Frontend) مبنية بـ **React + Vite + TypeScript** في جذر المشروع (`App.tsx`, مجلدات `components/`, `views/`, `services/`).
  - واجهة خلفية (Backend) مبنية بـ **Node.js + Express** في مجلد `server/`.
  - قاعدة بيانات **Postgres عبر Supabase** مع سكيمة وتعريفات كاملة في `supabase/setup.sql`.
  - اختبارات **Jest** (وحدات + API + Integration) في مجلد `tests/`، واختبارات **Cypress E2E** في مجلد `cypress/`.

- **طريقة التواصل بين الطبقات**:
  - الواجهة الأمامية تستخدم طبقة استهلاك API (`api/client.ts`, وملفات `services/*Api.ts`) لاستدعاء REST APIs تحت المسار `/api/...`.
  - الواجهة الخلفية تنظم الكود كالتالي:
    - **Routes** → **Controllers** → **Services** → **Supabase/DB**.
  - المصادقة (Auth) تعتمد على **JWT في Cookies**؛ الواجهة الأمامية تستدعي `/api/auth/*`، والباكند يتحقق عبر `authMiddleware`.

### 2. التكديس التقني (Technology Stack)

- **Frontend**:
  - React 18, TypeScript, Vite.
  - TailwindCSS + PostCSS للستايل.
  - Recharts لرسوم التحليلات.
  - lucide-react للأيقونات.

- **Backend**:
  - Express مع:
    - CORS مخصص، Helmet، Compression، Cookie Parser.
    - Middlewares للأمان: Rate limiting, CSRF header, Timeouts, Metrics, Logging.
  - Supabase (Postgres) عبر `@supabase/supabase-js` باستخدام **service role key** فقط في السيرفر.
  - Redis اختياريًا لـ Rate limiting / Cache.
  - تكاملات دفع مع **CyberSource** + وحدة اختيارية للبنك العربي.

- **Database**:
  - جداول مثل: `users`, `products`, `orders`, `order_items`, `carts`, `cart_items`, `notifications`, `product_likes`, `product_comments`, `shop_offers`, `merchant_offers`, `user_points`, `referrals`، وغيرها.
  - Views مهمة مثل `catalog_products_view`.

- **Testing**:
  - Jest + Supertest لاختبارات الـ API.
  - Jest لوحدات الخدمات والـ utils.
  - Cypress للسيناريوهات الكاملة (login → cart → checkout → orders → admin).

### 3. الواجهة الخلفية (Backend) – الـ APIs والبنية الداخلية

- **ملف الدخول**: `server/server.js`
  - تحميل وإحكام المتغيرات البيئية عبر `config/env.js` و `config/supabaseClient.js`.
  - تفعيل:
    - CORS مع `FRONTEND_URL`.
    - Helmet, Compression, CookieParser, CSRF header، RequestId، RequestLogger، Metrics، Request Timeout.
    - Rate limiters: `generalLimiter`, `paymentLimiter`, `cartLimiter`, إلخ.
  - ربط جميع المسارات تحت `/api/...`:
    - `/api/orders`, `/api/products`, `/api/payment`, `/api/payments`, `/api/shipment`, `/api/auth`, `/api/addresses`, `/api/cart`,
      `/api/admin`, `/api/offers`, `/api/analytics`, `/api/broker`, `/api/shared-products`, `/api/follow`, `/api/merchant`,
      `/api/merchant/offers`, `/api/notifications`, `/api/chat`, `/api/health`, إلخ.
  - مسار صريح `/api/status` لفحص اتصال قاعدة البيانات.
  - 404 + `errorHandler` + `sanitizeErrorResponse`.

- **تنظيم الملفات الخلفية**:
  - `server/routes/*.js`: تعريف المسارات فقط.
  - `server/controllers/*.js`: منطق HTTP (يستقبل req/ res ويستدعي الخدمات).
  - `server/services/*.js`: منطق الأعمال (Business Logic) والتعامل مع Supabase.
  - `server/validation/schemas.js`: كل مخططات Joi للتحقق من الـ body / query / params.
  - `server/middlewares/*.js`: مصادقة، أدوار، تحقق من المدخلات، Rate limiting، CSRF، Cache، Logging، Metrics، Timeout.
  - `server/utils/*.js`: `pagination`, `asyncHandler`, `logger`, `metrics`, `userFacingError`, `circuitBreaker`, إلخ.
  - `server/modules/payments/cybersource/*`: تكامل CyberSource (Hosted + REST).

- **أمثلة على مجموعات الـ API** (كلها تحت `/api/...`):
  - **Auth**: `/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout`, `/auth/logout-all`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/resend-verification`, `/auth/check-key`, `/auth/ping`, ومسارات `/auth/mfa/*`.
  - **Orders**: `/orders` (قائمة طلباتي)، `/orders/merchant`, `/orders/:id`, `/orders/:id/status`, `/orders/:id/cancel`, `/orders/:id/complete`, `/orders/:id/invoice`, `/orders/:id/claim`.
  - **Products**: `/products`, `/products/merchant/:merchantId`, `/products/:id`, `/products/:id/likes-count`, `/products/:id/liked`, `/products/:id/comments`, `/products/:id/like` (POST/DELETE), `/products/:id/comment`, `/products/bulk`, `/products` (POST)، `/products/:id` (PUT/DELETE).
  - **Cart**: `/cart` (GET/DELETE)، `/cart/items` (POST)، `/cart/items/:productId` (PATCH/DELETE).
  - **Payment / Payments**: `/payment/create`, `/payment/callback`, `/payment/cybersource/charge`, ومسارات `/payments/cybersource/*` + `/payments/cybersource/rest/process`.
  - **Shipment**: `/shipment/create`, `/shipment/status`, `/shipment/print-pdf`, `/shipment/:shipmentId/cancel`.
  - **Admin**: `/admin/users`, `/admin/users/:id/status`, `/admin/users/:id/delete`, `/admin/users/:id/restore`, `/admin/orders`, `/admin/products`, `/admin/products/:id`, `/admin/settings`, `/admin/platform-earnings`, `/admin/offers`.
  - **Analytics**: `/analytics/admin/overview`, `/analytics/merchant/overview`.
  - **Offers**: `/offers` (shop offers)، `/merchant/offers` (عروض التاجر).
  - **Broker/Shared/Follow/Merchant**: `/broker/shared-products*`, `/shared-products`, `/follow/:merchantId`, `/merchant/dashboard`, `/merchant/:id`, `/merchant/:id/followers-count`, `/merchant/:id/following`.
  - **Notifications**: `/notifications`, `/notifications/:id/read`.
  - **Chat**: `/chat` (بوت دعم).
  - **Health**: `/health`, `/ready`, `/metrics`, بالإضافة إلى `/api/status`.

- **الـ Middleware**:
  - `authMiddleware`:
    - `authenticate`: يتطلب JWT سليم (من Cookie أو Header).
    - `requireRole(...roles)`: يتحقق من الدور (CUSTOMER, MERCHANT, BROKER, ADMIN).
    - `optionalAuth`: يضع `req.auth` إن وجد توكن، بدون فرض 401.
  - `validate`: يطبّق Schema من `validation/schemas.js` ويعيد 400 عند الخطأ.
  - `security.js`: Helmet + مجموعة Rate limiters (عام، دفع، سلة، منتجات، طلبات).
  - `csrfHeaderMiddleware`: يتأكد من Header معين لمنع CSRF مع Cookies.
  - `requestId`, `requestLogger`, `metricsMiddleware`, `requestTimeoutMiddleware`, `cacheMiddleware`, `sanitizeErrorResponse`, `errorHandler`.

### 4. قاعدة البيانات (Database)

- **نفاذ البيانات**:
  - لا يوجد ORM تقليدي؛ التعامل يتم عبر Supabase Client (`supabase.from('table')...`).
  - الخدمات (`services/*.js`) تحتوي استعلامات القراءة/الكتابة.

- **أهم الجداول** (من `supabase/setup.sql`):
  - `users`: مع حقول للدور (role)، حالة المستخدم، الاشتراك، MFA، `token_version` (لـ logout-all).
  - `products`: بيانات المنتج + خصومات + حالة + فهارس بحث نصي كامل (`tsv`).
  - `orders`: يربط الزبون/التاجر/الوسيط، حالات الطلب (PENDING، ACCEPTED، IN_PROGRESS، ON_THE_WAY، COMPLETED، CANCELLED)، مرجع `order_reference`، توكن وصول للضيف، حقول الشحن والفاتورة.
  - `order_items`, `order_profits`, `transactions`: لتسجيل تفاصيل العناصر، الأرباح لكل طرف، والمعاملات المالية.
  - `carts`, `cart_items`: عربة لكل مستخدم + عناصرها.
  - `notifications`, `product_comments`, `product_likes`: للتفاعل والإشعارات.
  - `shop_offers`, `merchant_offers`: عروض عامة وعروض التاجر.
  - `user_points`, `referrals`: نقاط الولاء، برنامج الإحالة.
  - Views مثل:
    - `products_with_merchant`
    - `catalog_products_view`

### 5. التوثيق الأمني والمصادقة (Auth & Security)

- **JWT + Cookies**:
  - عند تسجيل الدخول (`/api/auth/login`) يُنشئ السيرفر JWT ويضعه في Cookie HTTP-only.
  - كل طلب محمي يمر عبر `authenticate` الذي يتحقق من التوكن ويضيف `req.auth`.
  - الـ Claim `ver` في التوكن يُقارن مع `users.token_version` في DB.  
    عند استدعاء `/api/auth/logout-all` يتم زيادة `token_version` فيبطل مفعول كل التوكنات القديمة.

- **منع CSRF**:
  - CORS محكوم بـ `FRONTEND_URL`.
  - `csrfHeaderMiddleware` يطلب Header معين (مثل X-Requested-With) لتفريق الطلبات الشرعية عن Cross-site.

- **Rate limiting**:
  - حدود مختلفة للـ APIs العامة، الدفع، السلة، المنتجات، إلخ.
  - التخزين عبر Redis أو in-memory حسب وجود `REDIS_URL`.

- **التحقق من المدخلات**:
  - كل Route حساس يمر عبر `validate(schema, 'body'|'query'|'params', key)`.
  - أي خطأ يرجع 400 مع رسالة منظمة.

- **إخفاء الأخطاء الداخلية**:
  - `sanitizeErrorResponse` يمنع تسريب stack traces.
  - `errorHandler` يعطي JSON موحّد للأخطاء.

### 6. منطق الأعمال الأساسي (Business Flows)

#### أ) تسجيل المستخدم

1. الواجهة الأمامية:
   - مكوّن `Auth` يرسل `POST /api/auth/register` حسب الدور (CUSTOMER / MERCHANT / BROKER).
2. الواجهة الخلفية:
   - `authController.registerUser` يستدعي `services/auth/registration.js`.
   - إنشاء مستخدم في Supabase + حقول الاشتراك حسب الدور.
   - إرسال OTP للتفعيل عبر البريد (`emailService` + `auth/services/otp.js`).
3. بعد التسجيل:
   - App تحفظ المستخدم في `localStorage` وتحوّل العرض إلى Dashboard أو Home حسب الدور.

#### ب) تسجيل الدخول

1. Frontend:
   - `authService.login` → `POST /api/auth/login`.
   - عند النجاح تنادي `authService.getMe` للحصول على بيانات المستخدم.
2. Backend:
   - يتحقق من البريد/كلمة السر ويرجع JWT في Cookie.
   - `GET /api/auth/me` يستخدم `optionalAuth` ويعيد بيانات المستخدم إن كان التوكن صالحاً.
3. App:
   - في `initApp` تستدعي `/api/auth/me` مرة واحدة عند التحميل لتحديد حالة الجلسة.

#### ج) تصفح المنتجات

1. Frontend:
   - `productService.getAll()` لتحميل الكتالوج (يستعمل `PublicCatalog`, `CustomerView`, `PublicWebsite`).
   - `PublicProductDetails` تستخدم `productService.fetchById`.
2. Backend:
   - `/api/products` تستخدم `productListLimiter` و `cacheMiddleware` + `productService.list` (مع `parsePagination`).
3. DB:
   - تعتمد على فهارس `idx_products_*` و `catalog_products_view` لسرعة الاستعلام.

#### د) السلة (Cart)

- **ضيف (غير مسجّل)**:
  - `localCart` في `App.tsx`، تخزين في `localStorage` (`palma_cart`).
  - توابع `addToCart`, `removeFromCart`, `updateQuantity`, `clearCart` تعمل على الـ state المحلي.

- **مستخدم مسجّل**:
  - Hook `useCart(user.id)` يستدعي `/api/cart`:
    - GET: جلب السلة من DB.
    - POST /items: إضافة عنصر.
    - PATCH /items/:productId: تعديل الكمية.
    - DELETE /items/:productId أو DELETE /: تفريغ السلة.

- **دمج سلة الضيف عند تسجيل الدخول**:
  - بعد Login، App تمر على عناصر `localCart` وتستدعي `cartApi.addCartItem` لكل عنصر، ثم تحذف `localCart`.

#### هـ) الدفع (Checkout) ودورة حياة الطلب

1. Checkout:
   - Logged-in:
     - `CheckoutPage` يستخدم `checkoutApi` لإنشاء الطلب + بدء الدفع (CyberSource/غيرها).
   - Guest "Buy Now":
     - يحفظ نية الشراء في `sessionStorage` (`palma_pending_buy_now`)، ثم يوجّه لـ Login.
     - بعد تسجيل الدخول يعيد تشغيل عملية الشراء ويحضر المنتج من الـ API ويفتح `CheckoutPage`.

2. بعد الدفع:
   - عند نجاح الدفع، `CheckoutPage` يستدعي callback في `App` لتعيين `checkoutReturnOrderId` و `checkoutReturnPayment='success'`.
   - App:
     - تظهر `CheckoutReturnPage`.
     - تفرّغ السلة (backend أو local حسب الحالة).

3. دورة حياة الطلب (Order Lifecycle):
   - الزبون ينشئ الطلب عبر `/api/orders` (من السلة أو buy-now).
   - التاجر يرى طلباته عبر `/api/orders/merchant`.
   - التاجر يحدّث الحالة عبر `/api/orders/:id/status` وفقًا لـ `MERCHANT_NEXT_STATUS` في `orderService` (PENDING → ACCEPTED → IN_PROGRESS → ON_THE_WAY → COMPLETED).
   - يمكن للتاجر استخدام `/api/orders/:id/complete`، `/invoice`، `/cancel` حسب الحالة.
   - Admin يمكنه عرض كل الطلبات عبر `/api/admin/orders`.

#### و) مسارات التاجر والإدمن

- **التاجر (MERCHANT)**:
  - Dashboard عبر `MerchantView`:
    - طلبات (`/api/orders/merchant`).
    - تحليلات (`/api/analytics/merchant/overview`).
    - عروض (`/api/merchant/offers`).
  - إدارة المنتجات عبر `/api/products` (POST/PUT/DELETE).

- **الإدمن (ADMIN)**:
  - Tabs داخل `AdminView`:
    - `AdminUsersTab`: `/api/admin/users`, `/users/:id/status`, `/users/:id/delete`, `/users/:id/restore`.
    - `AdminOrdersTab`: `/api/admin/orders`.
    - `AdminProductsTab`: `/api/admin/products` + تعديل/حذف منتجات.
    - `AdminPlatformTab` + `AdminTreasuryTab`: `/api/admin/settings`, `/api/admin/platform-earnings`.
    - `AdminOffersTab`: `/api/admin/offers`.

### 7. الواجهة الأمامية (Frontend) – البنية

- **الصفحات الرئيسية**:
  - عامة: `PublicWebsite`, `PublicCatalog`, `PublicProductDetails`, `PublicProfileView`, `PublicBrokerPage`.
  - Auth: `Auth`, `MerchantTermsView`, `VerifyEmail`, `PendingReview`.
  - Logged-in:
    - `CustomerView`, `MerchantView`, `BrokerView`, `AdminView`, `ProfileView`, `NotificationsView`, `CheckoutPage`, `CheckoutReturnPage`.

- **النظام الملاحي**:
  - لا يستخدم React Router؛ يعتمد على **hash routing** في `App.tsx`:
    - `#/welcome`, `#/catalog`, `#/login`, `#/join`, `#/dashboard`, `#/cart`, `#/orders`, `#/admin`, إلخ.
  - دالة `applyHashToState` تقرأ `window.location.hash` وتضبط `publicState` و `currentView`.
  - دالة `updateHash` تحدّث الـ hash عند تغيير التبويب أو الصفحة.

- **إدارة الحالة**:
  - معظم الحالة داخل `AppContent` عبر `useState`, `useEffect`, `useCallback`.
  - `ToastProvider` لإظهار التوست.
  - `SupportChat` لواجهة محادثة الدعم.
  - `marketStore` في `store.ts` لتخزين بيانات مشتركة مثل `getUserById`.

- **طبقة الـ API**:
  - `api/client.ts`: مسئول عن `getApiBase()` ومعالجة الـ fetch (مع Credentials و Headers).
  - `services/*`:
    - `authService`, `userService`, `productService`, `cartApi`, `checkoutApi`, `offersApi`, `merchantOffersApi`, `storageService`.

### 8. الاختبارات (Testing)

- **Jest**:
  - Unit:
    - `pagination.test.js`, `asyncHandler.test.js`, `orderService.test.js`, `cartService.test.js`.
  - API:
    - Health, Auth, Products, Cart, Orders, Admin, Offers, Shipment, Analytics, Notifications, Chat, Broker, Merchant, Shared-products، Address، Payment.
  - Integration:
    - `orderFlow.test.js` (تأكد من استخدام الـ Pagination في عدة Endpoints).

- **Cypress**:
  - ملفات مثل: `auth.cy.ts`, `cart.cy.ts`, `checkout.cy.ts`, `catalog.cy.ts`, `admin.cy.ts`, `full-flow.cy.ts`, `order-status.cy.ts`, إلخ.
  - تغطي مسارات كاملة من الواجهة (login → cart → checkout → orders → admin).

### 9. التشغيل والنشر (Deployment)

- **محليًا**:
  - Frontend:
    - `npm run dev` لتشغيل Vite.
    - `npm run build` + `npm run preview` للنسخة المبنية.
  - Backend:
    - `npm run build:server` (إن لزم).
    - `npm run start:server` أو `cd server && node server.js`.
  - API tests:
    - `cd server && set PORT=5001&& node server.js` في طرفية.
    - `npm run test:api` في طرفية أخرى.
  - E2E:
    - تشغيل الواجهة + الـ API.
    - `set CYPRESS_BASE_URL=http://localhost:5173` ثم `npm run test:e2e`.

- **الإنتاج (مثل Render)**:
  - استخدام `npm run build:for-render` لنسخ `dist/` إلى `server/public/`.
  - السيرفر يخدم:
    - `/api/*` كـ API.
    - الملفات الثابتة من `server/public/` كواجهة أمامية.
  - إعداد المتغيرات البيئية (`JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FRONTEND_URL`, `REDIS_URL`, إلخ).

---

هذا الملف يلخّص البنية التقنية الفعلية لمشروع **Palma Marketplace** كما هي في الكود، ويجهّز أي مطوّر/مهندس لمناقشة تفاصيل المعمارية، الأمان، الـ APIs، البيانات، الاختبارات، وأدوار المستخدمين مع الفريق التقني بثقة. 

