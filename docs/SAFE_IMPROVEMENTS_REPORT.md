# تقرير التحسينات الآمنة — Palma Marketplace

**تاريخ التطبيق:** يُملأ بعد النشر والقياس  
**الهدف:** توثيق التحسينات المطبقة ونتائج القياس دون كسر الكود الحالي.

---

## 1. التحسينات المطبقة

### 1.1 Full-Text Search (FTS)

| البند | التفاصيل |
|-------|----------|
| **Migration** | `supabase/migrations/022_products_fulltext_search.sql`: إضافة عمود `tsv` (tsvector) وفهرس GIN. |
| **التفعيل** | ضبط `USE_PRODUCT_FTS=true` في بيئة السيرفر بعد تشغيل الـ migration. بدونها يُستخدم ILIKE كما سابقاً. |
| **Fallback** | إذا وُجد خطأ من الاستعلام (مثلاً عمود `tsv` غير موجود)، يتم إعادة المحاولة تلقائياً باستخدام ILIKE. |
| **تشغيل الـ migration** | يُنفَّذ على **staging** أولاً، ثم على الإنتاج. كل جملة يمكن تشغيلها منفردة في Supabase SQL Editor. |

### 1.2 اللاندينغ (PublicWebsite)

- استبدال `productService.getAll()` + `slice(0, 24)` بـ `productService.getCatalogPage({ limit: 24 })`.
- نفس التعديل في معالج `focus` لإعادة جلب المنتجات عند العودة للصفحة.
- النتيجة: طلب واحد لـ 24 منتجاً فقط بدلاً من جلب القائمة الافتراضية ثم القص.

### 1.3 Frontend

- **React.memo:** مُطبَّق على `ProductCard` و `OfferCard` (بدون تغيير state أو props).
- **Lazy loading:** الصور تستخدم `loading="lazy"`؛ المكونات الثقيلة محمّلة عبر `React.lazy` (PublicWebsite, PublicCatalog, CustomerView, MerchantView, AdminView, إلخ).

### 1.4 Rate Limits و Circuit Breakers

- **الشحن والعناوين:** timeout 8 ثوانٍ و circuit breaker مُطبَّقان في `shipmentService` و `addressService`.
- **Cybersource REST:** إضافة timeout 15 ثانية (قابل للتعديل عبر `CYBERSOURCE_REQUEST_TIMEOUT_MS`) حتى لا يعلق الطلب عند بطء الـ API الخارجي؛ منطق الدفع كما هو.

### 1.5 Monitoring و Logging

- **استجابة الـ APIs:** تسجيل زمن الاستجابة لـ `GET /api/products`, `/api/cart`, `/api/orders` تحت مفتاح `api_timing` (path, durationMs, status, requestId) دون مقاطعة المستخدم.
- **الأخطاء:** تُعالج عبر `errorHandler` و `ErrorBoundary` الحاليين دون تغيير.

### 1.6 Bundle و Caching

- **Vite:** إضافة `manualChunks` لتقسيم الحزم: `react-vendor`, `lucide`, `supabase`, `vendor`؛ ورفع `chunkSizeWarningLimit` إلى 600 KB.
- **Caching:** GET requests للكتالوج والمنتجات تستخدم Redis عند وجود `REDIS_URL` (بدون تغيير في الـ imports).

### 1.7 قاعدة البيانات

- **Migration 022:** إضافة عمود وفهرس فقط؛ لا حذف ولا تعديل لبيانات موجودة.
- **التسلسل الموصى به:** تشغيل على staging أولاً، التحقق من الاستعلامات والبحث، ثم تشغيل على الإنتاج.

---

## 2. قياسات ما بعد النشر (يُملأ بعد التشغيل)

### 2.1 زمن استجابة الـ APIs

قياس متوسط أو P95 (بالميلي ثانية) بعد النشر ومرور حمل عادي:

| API | قبل (إن وُجد) | بعد | ملاحظات |
|-----|----------------|-----|---------|
| GET /api/products (بدون q) | | | |
| GET /api/products?q=... (بحث) | | | قارن مع FTS معطّل vs مُفعّل |
| GET /api/cart | | | |
| GET /api/orders | | | |

المصدر: سجلات `api_timing` أو أدوات مراقبة (مثل Render، Datadog).

### 2.2 حجم الـ Bundle

بعد `npm run build`:

| الحزمة (chunk) | الحجم (تقريبي) | ملاحظات |
|----------------|----------------|---------|
| index (main) | | |
| react-vendor | | |
| vendor | | |
| أخرى | | |

الهدف: تقليل حجم الـ chunk الرئيسي وتأخير تحميل الحزم الكبيرة.

### 2.3 البحث النصي قبل وبعد FTS

على بيئة تحتوي على عدد جيد من المنتجات (مثلاً 10K+):

| السيناريو | زمن الاستجابة (تقريبي) | ملاحظات |
|-----------|-------------------------|---------|
| بحث بـ ILIKE (بدون FTS) | | |
| بحث بـ FTS (بعد تفعيل USE_PRODUCT_FTS) | | |

---

## 3. تحسينات مؤجّلة (بدون تنفيذ في هذه المرحلة)

- **Virtualization:** إضافتها فقط إذا ظهرت قوائم طويلة جداً في واجهة واحدة.
- **CDN:** تكوين تقديم الـ static من CDN في الإنتاج.
- **مزيد من تقسيم الحزم:** حسب الحاجة بعد مراجعة أحجام الـ chunks الفعلية.

---

## 4. التحقق بعد النشر

- [ ] تشغيل migration 022 على staging والتحقق من عدم وجود أخطاء.
- [ ] تفعيل `USE_PRODUCT_FTS=true` على staging واختبار البحث.
- [ ] تشغيل migration 022 على الإنتاج بعد الموافقة.
- [ ] تفعيل `USE_PRODUCT_FTS=true` على الإنتاج.
- [ ] التحقق من اللاندينغ (المنتجات المميزة 24 منتجاً).
- [ ] التحقق من مسار الدفع (Cybersource) مع timeout 15 ثانية.
- [ ] مراجعة سجلات `api_timing` و`request` للتأكد من عدم وجود أخطاء إضافية.

---

*يُحدَّث هذا التقرير بعد كل قياس فعلي (أوقات الاستجابة، أحجام الحزم، نتائج البحث).*
