# أوامر رفع المشروع: Git → GitHub → (الفرونت: Vercel أو cPanel) + الباكند Render

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

1. **Vercel:** مشروع الواجهة → **Settings** → **Environment Variables** → عدّل `VITE_API_URL` إلى **رابط الباكند فقط** (مثل: `https://palma-api.onrender.com` أو الرابط الذي يعطيك إياه Render للـ Web Service) → **Save**.
2. **Vercel:** **Deployments** → آخر نشر → **⋯** → **Redeploy** (كي تُبنى الواجهة من جديد مع الرابط الصحيح).
3. **Render:** مشروع الباكند → **Environment** → تأكد أن `FRONTEND_URL` = رابط الواجهة على Vercel.

**مهم:** إذا ظهر عندك خطأ 404 على `palmaa.onrender.com/api/auth/me` فمعناه أن طلبات الـ API تذهب لسيرفر الواجهة (الستاتيك) وليس للباكند. الحل: تأكد أن `VITE_API_URL` في مشروع الواجهة = رابط خدمة الباكند على Render (وليست رابط صفحة الواجهة نفسها).

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

---

## رفع الواجهة (Frontend) على cPanel

إذا الفرونت على **cPanel** (وليس Vercel)، اتبع التالي.

### 1. بناء الواجهة مع رابط الباكند

على جهازك (أو أي مكان تشغّل فيه المشروع)، شغّل الأوامر مع تعيين **رابط الباكند** قبل البناء حتى تُضمَّن في الملفات:

**Windows (PowerShell):**

```powershell
cd "c:\Users\ٍSsS-73\Downloads\palma-marketplace (10)"
$env:VITE_API_URL="https://palmaa.onrender.com"
npm run build
```

**أو إذا الباكند على رابط آخر (مثل palma-api):**

```powershell
$env:VITE_API_URL="https://palma-api.onrender.com"
npm run build
```

**Windows (CMD):**

```cmd
set VITE_API_URL=https://palmaa.onrender.com
npm run build
```

**Mac/Linux:**

```bash
cd /path/to/palma-marketplace
VITE_API_URL=https://palmaa.onrender.com npm run build
```

استبدل `https://palmaa.onrender.com` برابط خدمة الباكند الفعلي من Render.

### 2. رفع مجلد البناء إلى cPanel

- بعد البناء يظهر مجلد **`dist`** داخل المشروع.
- ادخل **cPanel** → **File Manager** (أو FTP).
- اذهب لمجلد الواجهة (مثلاً `public_html` أو `public_html/موقعك`).
- ارفع **كل محتويات** مجلد `dist` (الملفات والمجلدات داخله) إلى ذلك المجلد، مع استبدال الملفات القديمة إن وُجدت.

يعني: محتويات `dist/` (مثل `index.html`، `assets/`، إلخ) تكون في جذر الدومين أو المسار الذي يفتحه المستخدم.

### 3. ربط الباكند بالواجهة (CORS)

في **Render** → مشروع الباكند → **Environment**:

- ضبط **`FRONTEND_URL`** = رابط موقعك على cPanel (مثل `https://yourdomain.com` أو `https://www.yourdomain.com`).

بدون هذا قد يرفض الباكند طلبات القادمة من دومين cPanel.

### 4. عند أي تعديل على الواجهة

- عدّل الكود ثم شغّل مرة أخرى:
  - `$env:VITE_API_URL="https://palmaa.onrender.com"` (أو الرابط الصحيح)
  - `npm run build`
- ثم ارفع محتويات `dist` من جديد إلى cPanel (استبدال الملفات القديمة).

**مهم:** إذا نسيت تعيين `VITE_API_URL` قبل `npm run build`، طلبات تسجيل الدخول والـ API ستذهب لرابط خاطئ وستظهر أخطاء 404 أو لا يعمل الدخول. لذلك دائماً شغّل البناء مع `VITE_API_URL` = رابط الباكند على Render.
