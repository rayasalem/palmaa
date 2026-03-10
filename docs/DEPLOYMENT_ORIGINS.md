# أصول النشر (Deployment Origins) – CORS و Cookie

استخدم هذا الملف لتوثيق أصول الواجهة والـ API لكل بيئة حتى تتوافق إعدادات CORS و Cookie مع النشر الفعلي.

## Feature flags (تحكم تدريجي)

| المتغير                | القيمة                   | الوصف                                                                              |
| ---------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `ENABLE_CSRF_HEADER`   | `true`                   | يطلب رأس X-Requested-With: XMLHttpRequest لطلبات POST/PUT/PATCH/DELETE في الإنتاج. |
| `ALLOW_AUTH_CHECK_KEY` | `true`                   | يسمح بظهور GET /api/auth/check-key في الإنتاج (غير موصى به إلا للتصحيح).           |
| `MFA_ENFORCE_MODE`     | `warn` \| `enforce`      | تحذير فقط أو منع تسجيل الدخول لـ ADMIN/MERCHANT بدون MFA.                          |
| `MFA_GRACE_PERIOD_END` | ISO date                 | نهاية فترة السماح قبل تفعيل الإلزام (مثال: 2025-06-01T00:00:00Z).                  |
| `JWT_EXPIRES_IN_ADMIN` | مدة (مثل 1d)             | مدة صلاحية JWT لحسابات ADMIN (افتراضي 1d).                                         |
| `FRONTEND_URL`         | قائمة أصول مفصولة بفاصلة | أصول CORS المسموحة بالإضافة إلى القائمة الثابتة.                                   |

## القالب (يُحدَّث عند النشر)

| البيئة      | نطاق الواجهة (Origin) | عنوان الـ API               | FRONTEND_URL (في خادم API)            | CORS المسموح (من corsMiddleware)            | ملاحظات Cookie                            |
| ----------- | --------------------- | --------------------------- | ------------------------------------- | ------------------------------------------- | ----------------------------------------- |
| **إنتاج**   | https://www.palma.ps  | https://palmaa.onrender.com | https://www.palma.ps,https://palma.ps | نفس FRONTEND_URL + القائمة الثابتة في الكود | sameSite=none, secure=true (cross-origin) |
| **Staging** | …                     | …                           | …                                     | …                                           | …                                         |
| **محلي**    | http://localhost:5173 | http://localhost:5000       | http://localhost:5173                 | localhost في القائمة الثابتة                | sameSite=lax في dev                       |

## مراجعة دورية

- عند إضافة نطاق واجهة جديد (مثلاً نطاق احتياطي أو تطبيق موبايل ويب): إضافته إلى `FRONTEND_URL` أو `CORS_ALLOWED_ORIGINS` في بيئة الخادم وتوثيقه هنا.
- عند إيقاف نطاق: إزالته من القائمة في الإنتاج لتقليل سطح الهجوم.

## المراجع

- قائمة الأصول الثابتة: `server/middlewares/corsMiddleware.js` (ALLOWED_ORIGINS + getAllowedOrigins(envFrontendUrl)).
- خيارات الكوكي: `server/services/jwtService.js` (getCookieOptions).
