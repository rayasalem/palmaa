# رفع المشروع على Vercel

## هل المشروع جاهز؟

نعم، **الواجهة الأمامية (Frontend)** جاهزة للرفع على Vercel. الباكند (Express) يحتاج مشروع منفصل أو منصة أخرى.

---

## 1. رفع الواجهة (Frontend) على Vercel

1. ادخل إلى [vercel.com](https://vercel.com) وسجّل الدخول.
2. **Add New** → **Project** → اختر المستودع (GitHub/GitLab/Bitbucket).
3. إعدادات البناء:
   - **Framework Preset:** Vite
   - **Root Directory:** `.` (جذر المشروع)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** (متغيرات البيئة):
   - `VITE_API_URL` = عنوان الباكند بعد رفعه (مثال: `https://your-api.vercel.app` أو `https://your-backend.onrender.com`)
5. اضغط **Deploy**.

بعد الرفع، احفظ رابط الواجهة (مثل: `https://palma-marketplace.vercel.app`).

---

## 2. الباكند (Backend – Express)

Vercel مصمم للمواقع الثابتة والدوال السيرفرلس. سيرفر Express يعمل بشكل مستمر ويحتاج استضافة منفصلة.

خيارات مناسبة:

- **Railway** – [railway.app](https://railway.app): ارفع مجلد `server` كمشروع Node.
- **Render** – [render.com](https://render.com): Web Service، الجذر = `server`، أمر التشغيل: `npm start`.
- **Vercel (مشروع ثانٍ):** يمكنك إنشاء مشروع Vercel ثانٍ وجذر المشروع = مجلد `server`، مع **Build Command** و **Output** المناسبين لـ Node (الاستمرارية محدودة بدوال Vercel، لذلك Railway/Render أنسب لـ Express).

بعد رفع الباكند، احفظ الرابط (مثل: `https://palma-api.onrender.com`).

---

## 3. بعد رفع الباكند

1. في مشروع **الواجهة** على Vercel:
   - **Settings** → **Environment Variables**
   - عدّل `VITE_API_URL` إلى رابط الباكند الحقيقي (مثال: `https://palma-api.onrender.com`).
2. أعد النشر (Redeploy) للواجهة حتى تُبنى من جديد مع الرابط الصحيح.
3. في **الباكند** (Railway/Render):
   - أضف متغير البيئة `FRONTEND_URL` = رابط الواجهة على Vercel (مثل: `https://palma-marketplace.vercel.app`) لتفعيل CORS بشكل صحيح.

---

## 4. ملخص

| الجزء        | المنصة   | الجذر  | ملاحظات                          |
|-------------|----------|--------|-----------------------------------|
| الواجهة (React) | Vercel   | جذر المشروع | Build: `npm run build`, Output: `dist` |
| الباكند (Express) | Railway أو Render | مجلد `server` | تعيين كل متغيرات `server/.env.example` |

المشروع **جاهز لرفع الواجهة على Vercel** بعد ربط المستودع وتعيين `VITE_API_URL`. الباكند يُرفع على منصة منفصلة ثم تربط الرابطين كما أعلاه.
