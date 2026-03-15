# تقرير الفحص الشامل بعد التحسينات — Palma Marketplace

**تاريخ الفحص:** بعد تطبيق تحسينات الأداء والاستقرار  
**الهدف:** تقييم الجاهزية للإنتاج وقدرة النظام على 1,000 تاجر × 10,000 منتج وزيادة الزوار.

---

## 1. Backend (Node.js + Express)

### 1.1 Async/Await Wrappers (asyncHandler)

| الحالة | التفاصيل |
|--------|----------|
| **مطبق على معظم الـ routes** | جميع مسارات API التي تستدعي دوال async مُغلّفة بـ `asyncHandler`: auth, admin, cart, order, product, shipment, payment, notification, mfa, analytics, broker, address, follow, merchant, offers, sharedProducts, chat. |
| **استثناءات متعمدة (sync)** | `/api/auth/ping`, `/api/auth/check-key`, `/health`, `/metrics` — دوال متزامنة ولا تحتاج wrapper. |
| **Cybersource REST** | `POST /api/payments/cybersource/rest/process` يستخدم `.catch(next)` يدوياً لتمرير الرفض إلى error handler. |
| **توصية** | لا حاجة لتعديل؛ أي route async جديد يجب أن يُمرَّر عبر `asyncHandler`. |

**الخلاصة:** حماية جيدة من unhandled promise rejections في مسارات API.

---

### 1.2 أداء الـ APIs الرئيسية

| API | الملاحظات |
|-----|-----------|
| **Catalog (GET /api/products)** | Pagination (limit/offset أو cursor)، فلترة من السيرفر (q, category, sort)، cache 600 ثانية عند وجود Redis. الفهرس المركّب `idx_products_catalog_list` يدعم الاستعلام. **بوتلنك محتمل:** بحث `q` يعتمد على `ILIKE` بدون full-text index — قد يبطئ عند ملايين الصفوف. |
| **Cart (GET/POST /api/cart)** | `getOrCreateCart` + جلب عناصر + جلب المنتجات بـ `in('id', ...)`. منضبط لعدد عناصر عادي. Rate limit 150/15 min. |
| **Orders (GET/POST /api/orders)** | إنشاء الطلب لا يستدعي الشحن؛ الشحن خطوة منفصلة. قوائم الطلبات تدعم cursor pagination. فهارس على `customer_id`, `merchant_id`, `created_at`. |
| **Checkout** | إنشاء الطلب = insert في DB فقط. لا استدعاء خارجي متزامن في مسار الطلب نفسه. |

**نقاط القوة:** فصل الطلب عن الشحن، cursor للقوائم، cache للكتالوج، rate limits.

**نقاط الضعف / التوصيات:**
- إضافة Full-Text Search (FTS) أو فهرس مساعد لـ `products(name, description)` عند نمو البحث فوق مئات آلاف الصفوف.
- مراقبة زمن استجابة `GET /api/products` مع فلتر `q` على بيانات حقيقية.

---

### 1.3 Environment Variables — أمان الاستخدام

| البند | الحالة |
|-------|--------|
| **Supabase (عمليات DB)** | `server/config/supabaseClient.js` يستخدم فقط `SUPABASE_SERVICE_KEY` أو `SUPABASE_SERVICE_ROLE_KEY`. لا fallback لـ `VITE_SUPABASE_ANON_KEY` في العمليات. |
| **نسخ URL فقط** | في `server.js`: `VITE_SUPABASE_URL` يُنسخ إلى `SUPABASE_URL` عند الحاجة للعنوان فقط. |
| **Health / check-key** | `/ready` و `/check-key` يقرآن أي مفتاح متوفر (بما فيه anon) **للعرض التشخيصي فقط** وليس لتنفيذ استعلامات. |
| **أسرار أخرى** | JWT_SECRET، ENCRYPTION_KEY، LOGESTECHS_*, CYBERSOURCE_*, RESEND_* تُقرأ من `process.env` دون hardcode. |

**توصية:** التأكد في الإنتاج أن `SUPABASE_SERVICE_KEY` مضبوط في متغيرات بيئة السيرفر فقط وليس في الـ frontend أو المستودع.

---

## 2. Database (Supabase/Postgres)

### 2.1 استعلامات الكتالوج والطلبات

| الاستعلام | الآلية | الفهارس ذات الصلة |
|-----------|--------|-------------------|
| قائمة منتجات نشطة (كتالوج) | `products` مع `is_active/status` + `ORDER BY created_at DESC` (أو price) + `range` أو `lt('created_at', cursor)` | `idx_products_catalog_list` (is_active, status, created_at DESC), `idx_products_is_active_status`, `idx_products_merchant_id` |
| بحث نصي (q) | `ILIKE` على name/title/description | **لا فهرس FTS** — عند 10M صف قد يكون المسح بطيئاً. |
| قائمة طلبات عميل/تاجر | `orders` مع `customer_id` أو `merchant_id` + ترتيب + range أو cursor | `idx_orders_customer_id`, `idx_orders_merchant_id`, `idx_orders_created_at_desc` |
| عناصر الطلب | `order_items` بـ `order_id` | `idx_order_items_order_id` |
| سلة المستخدم | `carts` بـ `user_id`, `cart_items` بـ `cart_id` | `unique_carts_user_id` أو `idx_carts_user_id_unique` |

**الخلاصة:** الفهارس الحالية كافية للقوائم والترتيب والانضمامات. نقطة الضعف الوحيدة هي **بحث ILIKE بدون FTS** عند حجم كبير.

### 2.2 فهارس مطلوبة لـ 10M منتج

| الفهرس | الملف | الحالة |
|--------|-------|--------|
| products(merchant_id) | 010 / add_indexes_safe | موجود |
| products(is_active, status) | 010 / add_indexes_safe | موجود |
| products(is_active, status, created_at DESC) | 021_products_catalog_index | موجود |
| orders(customer_id), (merchant_id), (created_at DESC) | 010 / add_indexes_safe | موجود |
| order_items(order_id) | 010 / add_indexes_safe | موجود |

**مفقود/مقترح:** فهرس Full-Text على `products` (مثلاً `to_tsvector(name || ' ' || coalesce(description,''))`) أو دمج محرك بحث خارجي لاحقاً.

### 2.3 Bottlenecks واستعلامات بطيئة محتملة

1. **بحث المنتجات (q)**  
   استعلامات `ILIKE '%...%'` لا تستخدم فهرس B-tree عادي. مع 10M صف: إما FTS في Postgres أو محرك بحث (Meilisearch/Elasticsearch).

2. **جلب أسماء التجار بعد قائمة المنتجات**  
   يتم في `getActiveProducts`: جلب المنتجات ثم `getMerchantNamesMap(merchantIds)`. عدد الـ merchant_ids محدود بعدد الصفحة (مثلاً 24) — مقبول.

3. **قائمة منتجات تاجر (10K منتج)**  
   `getProductsByMerchantId` يستخدم `merchant_id` + `range(offset, offset+limit-1)`. الفهرس على `merchant_id` موجود. الصفحات العميقة (offset كبير) تبقى أبطأ من cursor؛ يمكن لاحقاً إضافة cursor للقائمة حسب التاجر إذا لزم.

---

## 3. Frontend (React)

### 3.1 Lazy Loading

| العنصر | الحالة |
|--------|--------|
| **المكونات الثقيلة** | PublicWebsite, PublicCatalog, CustomerView, MerchantView, AdminView, ProfileView, PublicProductDetails، وتابات الفرع (CustomerShopTab, AdminUsersTab, إلخ) محمّلة عبر `React.lazy`. |
| **الصور** | `ProductCard`, `OfferCard`, PublicWebsite, MerchantProductsTab, CustomerShopTab, PublicCatalog (قسم Recently Viewed)، وغيرها تستخدم `loading="lazy"` للصور. |

**الخلاصة:** Lazy loading للمكونات والصور مُطبَّق بشكل جيد.

### 3.2 Bundle Size و Re-renders

| البند | الملاحظة |
|-------|----------|
| **حجم الحزم** | بناء Vite أظهر تحذيراً: بعض الـ chunks أكبر من 500 KB (مثلاً index principal). يمكن تحسينه لاحقاً بـ manualChunks أو مزيد من التقسيم. |
| **Re-renders** | `ProductCard` و `OfferCard` مُغلّفان بـ `React.memo`. قائمة الكتالوج تعتمد على state الصفحة من السيرفر وليست قائمة ضخمة واحدة في الذاكرة. |
| **Virtualization** | غير مُطبَّق. مع صفحة بحجم 24–48 منتجاً الـ DOM معقول؛ إذا زاد عرض القوائم إلى مئات الصفوف في شاشة واحدة يُنصح بإضافة virtualization (مثلاً react-window). |

### 3.3 الكتالوج: Server-Side Pagination

| البند | الحالة |
|-------|--------|
| **PublicCatalog** | يستخدم `productService.getCatalogPage()` مع limit, offset/cursor, q, category, sort. لا يستدعي `getAll()` للشبكة الرئيسية. |
| **PublicWebsite (اللاندينغ)** | لا يزال يستدعي `productService.getAll()` ثم `slice(0, 24)` للمنتجات المميزة. ينجم عنه طلب واحد لـ 24 منتجاً (الافتراضي من السيرفر). للتقليل يمكن استبداله بـ `getCatalogPage({ limit: 24 })` لعدم جلب أكثر من حاجة اللاندينغ. |

**الخلاصة:** الكتالوج الرئيسي يعتمد على الـ server-side pagination وcursor. اللاندينغ يمكن تحسينه لاستخدام `getCatalogPage` فقط.

---

## 4. Orders & Checkout

### 4.1 أداء إضافة للسلة والـ Checkout

| المرحلة | الملاحظات |
|---------|-----------|
| **إضافة للسلة** | استدعاءات DB محدودة: getOrCreateCart، جلب المنتج، تطبيق العروض (platform + merchant)، insert/update عنصر السلة. منضبط. |
| **إنشاء الطلب** | insert في `orders` + insert في `order_items`. لا استدعاء شحن أو دفع خارجي داخل مسار إنشاء الطلب. |
| **الشحن** | مسار منفصل `POST /api/shipment/create`. مُحمى بـ circuit breaker + timeout 8 ثوانٍ. عند فشل أو بطء LogesTechs يُرجع خطأ دون تعليق الطلب الأساسي. |

**الخلاصة:** المسار الحرج (طلب + سلة) لا يعتمد على APIs خارجية متزامنة؛ الشحن معزول ومُحدّد بوقت.

### 4.2 الدفع والشحن وعدم التعليق

| الخدمة | الحماية |
|--------|---------|
| **إنشاء الشحن (LogesTechs)** | `withCircuitBreaker('shipment', ..., { timeoutMs: 8000 })`. بعد 3 فشل يتفتح الـ circuit ولا يُستدعى API حتى انتهاء فترة الإعادة. |
| **العناوين (مدن/قرى)** | نفس الـ circuit breaker بمفتاح `'address'` و timeout 8 ثوانٍ. |
| **الدفع (Cybersource)** | المعالج يُستخدم مع `.catch(next)`؛ لا circuit breaker في الكود الحالي. إذا رغبت بعدم تعليق الواجهة عند بطء الدفع يمكن إضافة timeout أو circuit breaker حول استدعاء Cybersource. |

**توصية:** مراقبة زمن استجابة مسارات الدفع؛ إضافة timeout أو circuit breaker لاستدعاءات Cybersource إذا لزم.

---

## 5. Catalog & Merchant Flow

### 5.1 قدرة 1,000 تاجر × 10,000 منتج

| الجانب | التقييم |
|--------|---------|
| **قائمة الكتالوج** | Pagination وcursor وفلترة من السيرفر؛ فهرس مركّب للترتيب والفلتر. حجم الصفحة محدود (24–100). |
| **قائمة منتجات التاجر** | Pagination بـ offset؛ فهرس على `merchant_id`. تاجر بـ 10K منتج: الصفحات الأولى سريعة؛ الصفحات العميقة (offset كبير) قد تكون أبطأ. |
| **Bulk upload** | `POST /api/products/bulk` حتى 50 منتجاً لكل طلب؛ rate limit 50 طلب/15 دقيقة لكل تاجر. يقلل الضغط مقارنة بإضافة منتج واحد في كل مرة. |
| **Dashboard المنتجات** | يعتمد على `GET /api/products/merchant/:merchantId` مع limit/offset. يُنصح بالاحتفاظ بحجم صفحة معقول (مثلاً 50) وتجنب تحميل آلاف الصفوف دفعة واحدة. |

**بوتلنك محتمل:** بحث المنتجات (حقل البحث) يعتمد ILIKE؛ مع 10M منتج يُفضّل FTS أو محرك بحث.

### 5.2 البحث ولوحة التاجر

- البحث في الواجهة يمرّ عبر `q` إلى السيرفر؛ الفلترة والترتيب من السيرفر.
- لوحة التاجر تستخدم نفس API للمنتجات مع pagination؛ مناسبة لآلاف المنتجات مع صفحة بحجم ثابت.

---

## 6. Infrastructure

### 6.1 Redis

| البند | الحالة |
|-------|--------|
| **التخزين المؤقت** | عند وجود `REDIS_URL`، `cacheMiddleware` يخزّن استجابات GET (مثلاً قائمة المنتجات) في Redis. |
| **Rate limiting** | عند وجود `REDIS_URL`، `getRateLimitStore()` يوفّر Redis store لـ express-rate-limit بحيث الحدود مشتركة بين كل الـ instances. |
| **التوصية** | في الإنتاج يُفضّل ضبط `REDIS_URL` دائماً عند تشغيل أكثر من instance. |

### 6.2 CDN و Load Balancer

- **CDN:** غير مُطبَّق في الكود؛ يُنصح بتقديم الـ static assets (وإن أمكن صفحات التطبيق) عبر CDN في الإنتاج.
- **Load balancer:** الكود لا يعتمد على جلسات لزجة؛ JWT وحدود المعدل عبر Redis تسمح بتشغيل عدة instances خلف load balancer دون تغيير في التطبيق.

### 6.3 تحمّل الزوار والمستخدمين المتزامنين

| الآلية | التقييم |
|--------|----------|
| **Request timeout** | 15 ثانية (قابل للتعديل عبر `REQUEST_TIMEOUT_MS`). يمنع الطلبات من البقاء مفتوحة إلى ما لا نهاية. |
| **Rate limits** | عام، auth، منتجات، سلة، دفع، تعليقات، إنشاء منتجات تاجر — كلها مضبوطة ويمكن ضبطها عبر env. |
| **Circuit breaker** | يمنع إغراق الخدمة باستدعاءات متكررة لـ APIs خارجية معطلة أو بطيئة. |

**توصية:** مراقبة استهلاك الذاكرة وعدد الاتصالات وقوائم الانتظار عند زيادة الحمل؛ ضبط عدد الـ instances وحدود المعدل حسب القياسات.

### 6.4 تكوين Rate Limits و Timeouts

- **Timeouts:** طلب عام 15 ثانية؛ استدعاءات الشحن والعناوين 8 ثوانٍ داخل circuit breaker.
- **Rate limits:** مُوثّقة في `server/middlewares/security.js`؛ قابلة للضبط عبر متغيرات مثل `RATE_LIMIT_MAX`, `RATE_LIMIT_PRODUCTS_LIST`, `RATE_LIMIT_MERCHANT_PRODUCTS_CREATE`, إلخ.

---

## 7. Security & Stability

### 7.1 Unhandled Promise Rejections

| البند | الحالة |
|-------|--------|
| **معالجة عامة** | في `server.js`: `process.on('unhandledRejection', ...)` يسجّل ويخرج العملية. يمنع رفض promises غير معالجة من الاختفاء. |
| **مسارات API** | جميع المسارات التي تستدعي دوال async مُغلّفة بـ `asyncHandler` الذي يمرّر الرفض إلى `next(err)` وبالتالي إلى `errorHandler`. |
| **استثناءات** | `/health`, `/metrics`, `/ping`, `/check-key` متزامنة ولا تطرح promises. |

**الخلاصة:** إدارة جيدة لرفض الـ promises على مستوى التطبيق والعملية.

### 7.2 ErrorBoundary في React

| البند | الحالة |
|-------|--------|
| **الموقع** | `components/ErrorBoundary.tsx` يلف التطبيق من `index.tsx`. |
| **السلوك** | عند خطأ في الـ render يُعرض fallback مع رسالة وتنبيه "تحديث الصفحة" بدلاً من شاشة بيضاء. |
| **توصية** | يمكن لاحقاً إضافة ErrorBoundary حول أقسام فرعية (مثلاً لوحة التاجر أو الإدارة) لعزل الأخطاء وتقليل تأثيرها. |

### 7.3 حماية متغيرات البيئة الحساسة

| البند | الحالة |
|-------|--------|
| **مفتاح Supabase للـ DB** | لا يُستخدم anon key في عمليات السيرفر؛ فقط service role. |
| **JWT_SECRET** | مطلوب في `validateEnv`؛ بدونه التطبيق لا يبدأ. |
| **أسرار أخرى** | لا توجد أسرار مكتوبة في الكود؛ القراءة من `process.env` فقط. |
| **تحذيرات الإنتاج** | عند `PALMA_SHOW_ENV_WARNINGS=true` يُذكّر بعدم كشف SUPABASE_SERVICE_KEY. |

**توصية:** التأكد من عدم وجود ملف `.env` أو قيم حساسة في المستودع؛ استخدام متغيرات بيئة المنصة (مثل Render) للإنتاج.

---

## 8. ملخص نقاط القوة

1. **Backend:** تغليف مسارات API بـ asyncHandler، فصل إنشاء الطلب عن الشحن، استخدام service key فقط لـ Supabase.
2. **Database:** فهارس مناسبة للكتالوج والطلبات والعناصر والسلة؛ دعم cursor للقوائم الكبيرة.
3. **Frontend:** Lazy loading للمكونات والصور، كتالوج يعتمد على server-side pagination وcursor، React.memo للمكونات المعروضة بكثرة.
4. **الاستقرار:** Circuit breaker وtimeout للشحن والعناوين، request timeout عام، معالجة unhandled rejections، ErrorBoundary في الواجهة.
5. **البنية:** دعم Redis للـ cache وrate limit؛ جاهزية لتعدد الـ instances خلف load balancer.
6. **التجار:** bulk upload للمنتجات وrate limit لإنشاء المنتجات.

---

## 9. نقاط الضعف و Bottlenecks

1. **بحث المنتجات (q):** اعتماد على ILIKE بدون FTS — أول مرشح للتحسين عند نمو البيانات (FTS أو محرك بحث خارجي).
2. **اللاندينغ:** استدعاء `getAll()` ثم slice للمنتجات المميزة؛ يُفضّل استبداله بـ `getCatalogPage({ limit: 24 })`.
3. **الصفحات العميقة لقائمة منتجات التاجر:** offset كبير قد يكون أبطأ؛ إضافة cursor اختياري تحسين مستقبلي.
4. **Cybersource:** لا circuit breaker أو timeout صريح في الكود الحالي؛ يُنصح بهما إذا كان الدفع خارجياً وبطيئاً أحياناً.
5. **Bundle size:** بعض الـ chunks كبيرة؛ يمكن تحسينها بـ manualChunks أو مزيد من code splitting.
6. **CDN:** غير مُطبَّق؛ يُنصح به للإنتاج لتسريع الـ static وتحسين التحمل.

---

## 10. التوصيات النهائية قبل الإطلاق

### ذات أولوية عالية

1. **ضبط البيئة:** التأكد من `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `REDIS_URL` في الإنتاج وعدم تعريضها للعميل أو المستودع.
2. **تشغيل الـ migrations:** تنفيذ كل الـ migrations بما فيها `021_products_catalog_index.sql` على قاعدة الإنتاج.
3. **مراقبة أولية:** مراقبة زمن استجابة `GET /api/products` (مع وبدون q)، ومسارات الطلبات والسلة، وأي مسار دفع/شحن.

### ذات أولوية متوسطة

4. **استبدال getAll في اللاندينغ:** استخدام `getCatalogPage({ limit: 24 })` في PublicWebsite للمنتجات المميزة.
5. **بحث المنتجات:** عند تجاوز حجم معقول (مثلاً 100K+ منتج)، إضافة FTS في Postgres أو تكامل محرك بحث.
6. **دفع Cybersource:** إضافة timeout أو circuit breaker حول استدعاءات الدفع الخارجية إن لزم.

### ذات أولوية لاحقة

7. **CDN:** تقديم الـ static من CDN.
8. **تحسين الحزم:** تقليل حجم الـ chunks الكبيرة (manualChunks أو تقسيم إضافي).
9. **Virtualization:** إضافتها فقط إذا ظهرت قوائم طويلة جداً في واجهة واحدة (مثلاً مئات الصفوف).
10. **Queue للشحن:** نقل إنشاء الشحن إلى job queue واعتماد استجابة فورية (مثلاً 202) لتحسين التحمل كما في خارطة الطريق.

---

## الخلاصة التنفيذية

- **الاستقرار والأمان:** في وضع جيد (asyncHandler، معالجة الأخطاء، ErrorBoundary، استخدام آمن لمفاتيح Supabase، rate limits وtimeouts).
- **الأداء:** القوائم والكتالوج والطلبات والسلة منضبطة بفهارس وpagination وcursor؛ نقطة التحسين الرئيسية هي **بحث النص (q)** عند نمو البيانات.
- **البنية:** جاهز لتعدد الـ instances مع Redis؛ يبقى ضبط CDN ومراقبة الحمل والإنتاج.

**التقييم الإجمالي:** المشروع في حالة مناسبة للإطلاق الإنتاجي مع تطبيق التوصيات ذات الأولوية العالية ومراقبة الأداء؛ التحسينات ذات الأولوية المتوسطة واللاحقة تدعم استقراراً وأداءً أفضل مع النمو.
