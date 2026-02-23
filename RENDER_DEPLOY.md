# نشر الباكند على Render

## إذا ظهر خطأ: Cannot find package 'express'

يعني أن التشغيل يتم من **جذر المستودع** وليس من مجلد `server`، فـ `node_modules` غير موجودة في المسار الذي يشغّل منه Node.

## إذا ظهر: Missing script "build:server"

يعني أن المستودع على GitHub لا يضم السكربتات بعد. استخدم **الطريقة 1** (Root Directory = server) ولا تحتاج السكربتات.

## إذا ظهر: Exited with status 1 بعد التشغيل

البناء نجح لكن العملية تتوقف عند `npm start`. افتح **Logs** في Render وابحث عن سطر يبدأ بـ `[FATAL]` — سيظهر سبب التوقف (مثلاً متغير بيئة ناقص أو خطأ في استيراد ملف). تأكد من تعبئة **Environment** في Render. **مطلوب في الإنتاج:** `JWT_SECRET` (سري طويل، مثلاً 64 حرفاً). يُفضّل أيضاً: `PORT`، `FRONTEND_URL`، `SUPABASE_URL`، `SUPABASE_SERVICE_KEY`، `COOKIE_SECRET`.

---

## الحل (اختر واحداً)

### الطريقة 1: Root Directory = server (مفضّلة، تعمل بدون push)

في مشروع الـ **Web Service** على Render → **Settings**:

| الإعداد | القيمة |
|--------|--------|
| **Root Directory** | `server` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

احفظ ثم **Manual Deploy**.

---

### الطريقة 2: التشغيل من جذر المستودع

إذا أردت ترك **Root Directory** فارغاً (جذر المستودع):

| الإعداد | القيمة |
|--------|--------|
| **Root Directory** | _(اتركه فارغاً)_ |
| **Build Command** | `npm run build:server` |
| **Start Command** | `npm run start:server` |

هذا يستخدم السكربتات المضافة في `package.json` في الجذر (تثبيت وتشغيل من مجلد `server`).

احفظ ثم **Manual Deploy**.
