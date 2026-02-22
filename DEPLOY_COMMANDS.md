# أوامر رفع المشروع: Git → GitHub → Vercel + الباكند

استخدم الأوامر التالية بالترتيب.

---

## الجزء 1: رفع الملفات على GitHub

### إذا المشروع ما فيه Git من قبل (أول مرة)

```bash
cd "c:\Users\ٍSsS-73\Downloads\palma-marketplace (10)"
git init
git add .
git status
git commit -m "Initial commit: Palma Marketplace"
```

### إنشاء المستودع على GitHub

1. ادخل [github.com](https://github.com) → **New repository**
2. اسم المستودع مثلاً: `palma-marketplace`
3. **لا** تختر "Add a README" إذا استخدمت `git init` فوق.
4. انسخ رابط المستودع (مثل: `https://github.com/YOUR_USERNAME/palma-marketplace.git`)

### ربط المشروع بالمستودع ورفعه

```bash
cd "c:\Users\ٍSsS-73\Downloads\palma-marketplace (10)"
git remote add origin https://github.com/YOUR_USERNAME/palma-marketplace.git
git branch -M main
git push -u origin main
```

(استبدل `YOUR_USERNAME` باسم حسابك على GitHub.)

### في كل مرة تعدل وتريد تحديث GitHub

```bash
cd "c:\Users\ٍSsS-73\Downloads\palma-marketplace (10)"
git add .
git status
git commit -m "وصف التعديل"
git push
```

---

## الجزء 2: رفع الواجهة (Frontend) على Vercel

1. ادخل [vercel.com](https://vercel.com) → سجّل الدخول (يفضل بحساب GitHub).
2. **Add New** → **Project**.
3. اختر المستودع **palma-marketplace** من القائمة (أو **Import** واربطه أول مرة).
4. إعدادات المشروع:
   - **Framework Preset:** Vite
   - **Root Directory:** `.` (اتركه فارغ أو اختر الجذر)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **Environment Variables:** أضف:
   - الاسم: `VITE_API_URL`
   - القيمة: رابط الباكند (ستضيفه بعد رفع الباكند، مؤقتاً يمكن: `https://your-app.onrender.com`)
6. **Deploy**.

بعد النشر، انسخ رابط الواجهة (مثل: `https://palma-marketplace-xxx.vercel.app`).

---

## الجزء 3: رفع الباكند (Backend) على Render

1. ادخل [render.com](https://render.com) → سجّل الدخول (بحساب GitHub).
2. **Dashboard** → **New** → **Web Service**.
3. اختر المستودع **palma-marketplace**.
4. إعدادات الخدمة:
   - **Name:** مثلاً `palma-api`
   - **Region:** اختر الأقرب
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` أو `node server.js`
5. **Environment** (متغيرات البيئة): أضف كل ما في `server/.env.example`، مثلاً:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `FRONTEND_URL` = رابط الواجهة على Vercel (مثل: `https://palma-marketplace-xxx.vercel.app`)
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`
   - والباقي حسب الحاجة
6. **Create Web Service**.

بعد النشر، انسخ رابط الباكند (مثل: `https://palma-api.onrender.com`).

---

## الجزء 4: ربط الواجهة بالباكند

1. **Vercel:** مشروع الواجهة → **Settings** → **Environment Variables** → عدّل `VITE_API_URL` إلى رابط الباكند (مثل: `https://palma-api.onrender.com`) → **Save**.
2. **Vercel:** **Deployments** → آخر نشر → **⋯** → **Redeploy** (كي تُبنى الواجهة من جديد مع الرابط الصحيح).
3. **Render:** مشروع الباكند → **Environment** → تأكد أن `FRONTEND_URL` = رابط الواجهة على Vercel.

---

## ملخص الأوامر (نسخ سريع)

```bash
cd "c:\Users\ٍSsS-73\Downloads\palma-marketplace (10)"
git init
git add .
git commit -m "Initial commit: Palma Marketplace"
git remote add origin https://github.com/YOUR_USERNAME/palma-marketplace.git
git branch -M main
git push -u origin main
```

**تحديث لاحق:**

```bash
git add .
git commit -m "وصف التعديل"
git push
```

بعد `git push`، كل من Vercel و Render (إذا ربطتهما بنفس المستودع) سيعيدان النشر تلقائياً عند كل دفع على الفرع المربوط (مثلاً `main`).
