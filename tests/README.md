# Palma Marketplace – الاختبارات

## هيكل المجلدات

- **tests/unit/** – Unit tests (services, utils, business logic) مع Jest
- **tests/api/** – API tests (endpoints) مع supertest
- **tests/integration/** – Integration tests (Controller → Service → DB)
- **tests/e2e/** – مرجع لاختبارات Cypress (الفعلي في `cypress/e2e/`)

## تشغيل الاختبارات

| الأمر | الوصف |
|-------|--------|
| `npm run test` | تشغيل كل اختبارات Jest (unit + api + integration) |
| `npm run test:unit` | unit فقط |
| `npm run test:api` | API فقط (يتطلب تشغيل السيرفر، انظر أدناه) |
| `npm run test:integration` | integration فقط |
| `npm run test:coverage` | تشغيل الاختبارات مع تقرير التغطية |
| `npm run test:e2e` | Cypress E2E |

## اختبارات الـ API

اختبارات الـ API تتصل بسيرفر حقيقي على `http://127.0.0.1:5001` (أو `API_BASE_URL` إذا عُيّن).

1. في طرفية أولى شغّل السيرفر على المنفذ 5001:
   ```bash
   cd server && set PORT=5001&& node server.js
   ```
   (على Linux/Mac: `PORT=5001 node server.js` داخل مجلد `server`)

2. في طرفية ثانية شغّل اختبارات الـ API:
   ```bash
   npm run test:api
   ```

أو استخدم `TEST_API_PORT=5001` إذا السيرفر يعمل على منفذ آخر وعرّفته في المتغير.

## التغطية (Coverage)

الهدف: **80%+** تغطية. التقرير يُنشأ بعد `npm run test:coverage` في مجلد `coverage/` (نص، ملخص، lcov، HTML).

- **نسبة التغطية:** تظهر في نهاية تشغيل `test:coverage`.
- **الفنكشن غير المختبرة:** يمكن رؤيتها في `coverage/lcov-report/index.html` (أو من النص).

## Unit tests

- **pagination.test.js** – دالة `parsePagination`
- **asyncHandler.test.js** – غلاف الـ async handlers
- **orderService.test.js** – التحقق من المدخلات والثوابت
- **cartService.test.js** – التحقق من مدخلات `addItem`

## API tests

- **health.test.js** – GET /api/health, /api/status
- **products.test.js** – GET /api/products, /api/products/:id
- **orders.test.js** – GET/POST /api/orders, PATCH status, unauthorized
- **auth.test.js** – POST login/register, validation, GET /api/auth/ping
- **cart.test.js** – GET /api/cart, POST /api/cart/items (401, 400)

كل endpoint يغطي: success/validation errors/unauthorized/invalid data حيث ينطبق.
