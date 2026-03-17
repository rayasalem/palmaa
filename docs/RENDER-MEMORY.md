# تجنب تجاوز حد الذاكرة على Render (Web Service palmaa)

إذا ظهرت رسالة **"An instance of your Web Service exceeded its memory limit"** من Render، التطبيق يطبق تلقائياً إعدادات تقلل استهلاك الذاكرة عندما يعمل على Render.

## ما يفعله التطبيق تلقائياً على Render

- **عملية واحدة (Single process):** عند وجود `RENDER=true` (تضبطه Render تلقائياً) يتم تعطيل الـ cluster، فيعمل سيرفر واحد فقط بدلاً من عملية رئيسية + worker، مما يقلل استهلاك الذاكرة بشكل كبير.
- **كاش ذاكرة أصغر:** عدد العناصر المخزنة في الذاكرة (بدون Redis) يُحدّ إلى 50 بدلاً من 200، وحجم الاستجابة المخزنة إلى 256KB بدلاً من 512KB.
- **حد أصغر لـ body طلبات المنتجات:** طلبات `POST/PUT` لـ `/api/products` تُقبل حتى 5MB بدلاً من 15MB لتقليل ذروة الذاكرة عند رفع صور/بيانات كبيرة.

## إعدادات اختيارية في Render (Environment)

يمكنك ضبطها في **Dashboard → Web Service → Environment**:

| المتغير | الوصف | مقترح عند استمرار مشكلة الذاكرة |
|--------|--------|----------------------------------|
| `DISABLE_CLUSTER` | `1` = عملية واحدة (التطبيق يفعّله تلقائياً على Render) | التأكد أنه غير معطّل إن أضفته يدوياً |
| `REDIS_URL` | Redis للكاش و rate limit خارج الذاكرة | **مُستحسن:** إنشاء Redis على Render واستخدامه لتفريغ الذاكرة |
| `MEMORY_CACHE_MAX_ENTRIES` | أقصى عدد عناصر كاش الذاكرة | تقليله (مثلاً `30`) إن لم تستخدم Redis |
| `MEMORY_CACHE_MAX_BODY_BYTES` | أقصى حجم استجابة تُخزَّن في الكاش (بايت) | تقليله (مثلاً `131072` = 128KB) |
| `BODY_LIMIT_PRODUCTS_MB` | حد حجم body لـ /api/products بالميجابايت | الإبقاء على 5 أو تقليله إلى 3 |
| `NODE_OPTIONS` | خيارات Node | يمكن تجربة `--max-old-space-size=384` لربط حد الذاكرة (بحسب خطة Render) |

## توصيات إضافية

1. **استخدام Redis (REDIS_URL):** ينقل الكاش و(إن دعمه إعدادك) rate limit خارج عملية Node، مما يقلل استهلاك الذاكرة كثيراً على الخدمات الصغيرة.
2. **ترقية نوع الـ Instance:** إن استمرت المشكلة بعد الإعدادات أعلاه، ترقية الـ instance في Render يعطي ذاكرة أكبر.
3. **مراجعة السجلات:** في Render استخدم **Logs** و **Metrics** لمعرفة إن كان الارتفاع يحدث عند ذروة زيارات أو عند طلبات معينة (مثل رفع منتجات كبيرة).

## مراجع الكود

- تعطيل الـ cluster على Render: `server/server.js` (متغير `isRender` و `disableCluster`).
- حدود الكاش في الذاكرة: `server/middlewares/cacheMiddleware.js` (قيم افتراضية مختلفة عند `RENDER=true`).
- حد body مسار المنتجات: `server/server.js` (استخدام `productBodyLimitMb` و `BODY_LIMIT_PRODUCTS_MB`).
