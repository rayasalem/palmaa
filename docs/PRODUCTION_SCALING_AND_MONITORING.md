# بيئة الإنتاج: التوسع ومراقبة الأداء

## 1. تشغيل أكثر من Node instance خلف Load Balancer

### الإعداد

- **Trust proxy:** التطبيق يضبط `trust proxy = 1` في الإنتاج حتى يكون `req.ip` هو IP العميل (من رأس `X-Forwarded-For`) وليس IP الـ load balancer.
- **عدم الاعتماد على الذاكرة المحلية:** الجلسات غير مخزنة على الخادم (JWT فقط). حد المعدل (rate limit) والكاش يستخدمان Redis عند ضبط `REDIS_URL` حتى تكون الحالة مشتركة بين كل الـ instances.

### توصيات

- استخدم **health check** على `/health` (liveness) و `/ready` (readiness مع فحص DB).
- لا تطبق rate limiting على `/health`, `/ready`, `/metrics` — هذه المسارات مُسجَّلة قبل `generalLimiter`.
- تأكد أن الـ load balancer يمرر رأس `X-Forwarded-For` (أو المشابه) عند تفعيل `trust proxy`.

---

## 2. Redis: كاش مشترك ومخزن حد المعدل

### تفعيل Redis

- عيّن **REDIS_URL** في بيئة الإنتاج (مثال: `redis://default:password@host:6379`).
- **الكاش:** `cacheMiddleware` يستخدم Redis تلقائياً عند وجود `REDIS_URL`؛ مفتاح الكاش = المسار + query؛ TTL افتراضي 600 ثانية لـ GET المنتجات.
- **حد المعدل (rate limit):** عند وجود `REDIS_URL` تستخدم كل المحددات (general, auth, payment, products, cart, comments) **Redis store** بدل الذاكرة، فيصبح الحد موحّداً عبر كل الـ instances.

### إبطال الكاش

- عند إنشاء/تحديث/حذف منتج يُستدعى `invalidateProductsCache()` لحذف مفاتيح قوائم المنتجات من Redis.

---

## 3. الـ Pagination والبحث على الخادم (الكتالوج العام)

### GET /api/products (الكتالوج)

- **Query parameters (Joi-validated):**
  - `limit`: 1–100، افتراضي 24.
  - `offset`: ≥ 0، افتراضي 0.
  - `q`: نص بحث (اختياري، حتى 150 حرف) — يطبق `ilike` على `name`, `title`, `description`.
  - `category`: فلتر حسب الفئة (اختياري).
- الفلترة والبحث يتمان على الخادم (Supabase)؛ يُفضّل وجود فهرس على `category` وملاءمة الفهارس للبحث النصي إذا زاد حجم الجدول.

---

## 4. القياسات وربط Prometheus/Grafana

### Endpoint القياسات

- **GET /metrics** — نص بصيغة Prometheus (لا يُطبَّق عليه الـ general rate limit).

### المقاييس المعرّضة

| المقياس                                          | النوع     | الوصف                                                       |
| ------------------------------------------------ | --------- | ----------------------------------------------------------- |
| `palma_http_requests_total{method,route,status}` | counter   | عدد الطلبات لكل مسار/حالة                                   |
| `palma_http_errors_total{method,route,status}`   | counter   | الطلبات ذات 4xx/5xx                                         |
| `palma_http_request_duration_seconds_*`          | histogram | زمن الاستجابة (مجموع، عدد، buckets) لكل method/route/status |
| `palma_http_rate_limit_hits_total{route}`        | counter   | عدد مرات 429 لكل route                                      |
| `palma_http_validation_failures_total{source}`   | counter   | فشل التحقق (400) حسب المصدر                                 |
| `palma_http_mfa_failures_total{label}`           | counter   | فشل MFA                                                     |
| `palma_process_resident_memory_bytes`            | gauge     | حجم الذاكرة المقيمة (RSS)                                   |
| `palma_process_heap_used_bytes`                  | gauge     | استخدام heap لـ V8                                          |
| `palma_process_heap_total_bytes`                 | gauge     | إجمالي heap لـ V8                                           |
| `palma_process_external_memory_bytes`            | gauge     | الذاكرة الخارجية                                            |

- **route** يكون مُطبَّقاً (مثلاً `/api/orders/:id`) لتحليل latency لكل endpoint.

### إعداد Prometheus

```yaml
scrape_configs:
  - job_name: 'palma-api'
    metrics_path: /metrics
    static_configs:
      - targets: ['your-api-host:5000']
    scrape_interval: 15s
```

### Grafana

- استيراد لوحة جاهزة لـ Node.js/Express أو بناء لوحة باستخدام:
  - `rate(palma_http_requests_total[5m])` لطلبات/ثانية.
  - `histogram_quantile(0.95, rate(palma_http_request_duration_seconds_bucket[5m]))` لـ p95 latency.
  - `palma_process_resident_memory_bytes` و `palma_process_heap_used_bytes` لاستخدام الذاكرة وCPU (بمقارنة مع الوقت إن لزم).

---

## 5. ضغط الاستجابات وحدود حجم الـ payload

- **ضغط الاستجابة:** تفعيل `compression()` middleware على التطبيق؛ الاستجابات المؤهلة (مثل JSON) تُضغط تلقائياً (gzip وغيرها حسب القبول).
- **حد حجم body الطلب:** `express.json({ limit: '15mb' })` — مطلوب لرفع صور/بيانات كبيرة (مثلاً إنشاء منتج). لا يوجد حد صريح لحجم الاستجابة من الخادم؛ التحكم عملياً عبر الـ pagination (مثلاً حد 100 عنصر للكتالوج).
- **استخدام الموارد (CPU/RAM):** مراقبة عبر `palma_process_*` في Prometheus/Grafana؛ لقياس CPU بدقة أكبر يمكن استخدام عقدة أو أدوات المنصة (مثل مراقبة Render/PM2).

---

## 6. ملخص متغيرات البيئة ذات العلاقة

| المتغير               | الاستخدام                                              |
| --------------------- | ------------------------------------------------------ |
| `REDIS_URL`           | تفعيل Redis للكاش وحد المعدل المشترك بين الـ instances |
| `NODE_ENV=production` | تفعيل trust proxy وHTTPS enforce وCSP                  |
| `REQUEST_TIMEOUT_MS`  | مهلة الطلب (افتراضي 15000 ms)                          |
| `RATE_LIMIT_*`        | ضبط حدود المعدل (عام، auth، منتجات، سلة، إلخ)          |
