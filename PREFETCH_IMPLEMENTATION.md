# تنفيذ Prefetch — منصة بالما (Palma)

هذا المستند يوضح **تنفيذ** تحميل مسبق (prefetch) للمكونات الكسولة وبيانات الـ API دون تغيير أي مسار (route) أو hash أو currentView أو props. الهدف: تحسين **TTI** و**First Paint** عند الانتقال بين الصفحات.

---

## 1. القواعد الآمنة (Safe execution rules)

- **لا تغيير في التوجيه:** لا يُعدَّل `updateHash`, `applyHashToState`, أو `currentView` من طبقة الـ prefetch.
- **لا إضافة أو حذف props:** المكونات (مثل PublicWebsite، CustomerView، إلخ) تحتفظ بنفس الـ props؛ فقط إضافة `onMouseEnter` / `onFocus` على الأزرار/الروابط الموجودة.
- **Preload فقط:** تنفيذ `import(...)` لتحميل الـ chunk، واستدعاء دوال الـ API في الخلفية (fire-and-forget). لا تخزين النتائج في state التطبيق؛ الاعتماد على cache المتصفح أو الطلب الثاني عند فتح الصفحة.

---

## 2. Component Prefetch (React.lazy)

عند **hover** أو **focus** على رابط/زر يؤدي إلى مكون كسول، يُستدعى `import('...')` نفسه المستخدم في `React.lazy` في `App.tsx` حتى يُحمَّل الـ chunk مسبقًا.

| الموقع | الزر/الرابط | المكون الكسول المُحمَّل مسبقًا |
|--------|-------------|--------------------------------|
| **ComingSoonHero** (ضيف) | "تصفّح المنتجات" / Browse products | `PublicCatalog` |
| **PublicWebsite** (ضيف) | بطاقة منتج (تفاصيل) | `PublicProductDetails` |
| **PublicCatalog** (ضيف) | زر الرجوع | `PublicWebsite` |
| **PublicCatalog** (ضيف) | بطاقة منتج في الشبكة | `PublicProductDetails` |
| **Layout** (مسجّل دخول) | تبويب Profile (شريط جانبي + زر الصورة) | `ProfileView` |
| **Layout** (مسجّل دخول) | تبويبات Home / Shop / Cart / Orders (زبون) | `CustomerView` |
| **Layout** (مسجّل دخول) | تبويبات Dashboard / Products / Orders / Earnings (تاجر) | `MerchantView` |
| **Layout** (مسجّل دخول) | تبويبات Shop / Cart (تاجر/أدمن/وسيط) | `CustomerView` |
| **Layout** (مسجّل دخول) | تبويبات Users / Products / Orders / Treasury / Platform (أدمن) | `AdminView` |
| **Layout** (مسجّل دخول) | أيقونة السلة (Cart/Shop) | `CustomerView` |
| **CustomerView** (مسجّل دخول) | بطاقة منتج في المتجر | `PublicProductDetails` |

الملف المركزي: **`prefetch.ts`** — الدالة `prefetchComponent(name)` تنفّذ الـ `import` المناسب حسب الاسم. الدالة `prefetchForTab(tabId, role)` تربط تبويب الـ Layout بالمكون المطلوب.

---

## 3. Data Prefetch (API calls)

### 3.1 بعد تسجيل الدخول (حسب الدور)

يُستدعى `prefetchAfterLogin(user)` من `App.tsx` في:
- **handleLogin(loggedInUser)** — بعد تعيين المستخدم والانتقال للوحة.
- **initApp** — عند استعادة الجلسة (وجود `u` من الـ API).

لا يُخزَّن أي نتيجة في state؛ الطلبات تُنفَّذ في الخلفية لـ "تسخين" الاتصال (وربما cache المتصفح إن دعمه الـ API).

| الدور | استدعاءات API المُحمَّلة مسبقًا |
|-------|----------------------------------|
| **CUSTOMER** | `fetchMyOrders()` — لتسريع تبويب الطلبات. |
| **MERCHANT** | `productService.getByMerchantId(user.id)` — لتسريع MerchantView و ProfileView. |
| **ADMIN** | `userService.getAll()`, `getAdminProducts()`, `getAdminOrders()`, `getAdminSettings()`, `getAdminPlatformEarnings()` — لتسريع تبويبات الأدمن. |
| **BROKER** | `productService.getByMerchantId(user.id)` — لتسريع البيانات المعتمدة على منتجات التاجر. |

### 3.2 عند hover على رابط منتج (أي view)

عند المرور بالماوس أو التركيز على رابط/بطاقة منتج:
- **مكوّن:** `prefetchComponent('PublicProductDetails')`.
- **بيانات:** `prefetchProductData(productId)` ← تستدعي `productService.fetchById(productId)` دون تحديث state.

يُطبَّق في: PublicWebsite (منتجات مميزة)، PublicCatalog (شبكة المنتجات)، CustomerView (شبكة المتجر).

---

## 4. جدول شامل: رابط/زر → مكوّن كسول → بيانات API (إن وُجدت)

| الرابط/الزر | المكوّن الكسول | بيانات API (prefetch) |
|-------------|-----------------|------------------------|
| ضيف: "تصفّح المنتجات" | PublicCatalog | — |
| ضيف: بطاقة منتج (هيرو/كتالوج) | PublicProductDetails | `productService.fetchById(id)` |
| ضيف: زر الرجوع من الكتالوج | PublicWebsite | — |
| مسجّل: تبويب Profile | ProfileView | — |
| مسجّل: تبويب Home/Shop/Cart/Orders (زبون) | CustomerView | بعد تسجيل الدخول: `fetchMyOrders()` |
| مسجّل: تبويب Dashboard/Products/Orders/Earnings (تاجر) | MerchantView | بعد تسجيل الدخول: `getByMerchantId(user.id)` |
| مسجّل: تبويب Shop/Cart (تاجر/أدمن/وسيط) | CustomerView | — |
| مسجّل: تبويب Users/Products/Orders/Treasury/Platform (أدمن) | AdminView | بعد تسجيل الدخول: `getAll()`, `getAdminProducts()`, `getAdminOrders()`, `getAdminSettings()`, `getAdminPlatformEarnings()` |
| مسجّل: أيقونة السلة | CustomerView | — |
| مسجّل: بطاقة منتج في المتجر (CustomerView) | PublicProductDetails | `productService.fetchById(id)` |

---

## 5. الملفات المُعدَّلة (بدون تغيير منطق التوجيه أو الـ props)

| الملف | التعديل |
|-------|---------|
| **prefetch.ts** (جديد) | دوال: `prefetchComponent`, `prefetchProductData`, `prefetchForTab`, `prefetchAfterLogin`؛ تعليق يشرح الهدف والجدول أعلاه. |
| **App.tsx** | استيراد `prefetchAfterLogin`؛ استدعاؤها في `handleLogin` وضمن `initApp` عند وجود `u`. |
| **Layout.tsx** | استيراد `prefetchForTab`؛ إضافة `onMouseEnter` و `onFocus` لزر السلة وأزرار التبويبات وزر الملف الشخصي. |
| **ComingSoonHero.tsx** | استيراد `prefetchComponent`؛ إضافة `onMouseEnter` و `onFocus` لزر "تصفّح المنتجات". |
| **PublicWebsite.tsx** | استيراد `prefetchComponent`, `prefetchProductData`؛ إضافة `onMouseEnter` و `onFocus` لزر تفاصيل المنتج في البطاقات. |
| **PublicCatalog.tsx** | استيراد `prefetchComponent`, `prefetchProductData`؛ إضافة prefetch لزر الرجوع وللـ div الخاص بكل بطاقة منتج. |
| **CustomerView.tsx** | استيراد `prefetchComponent`, `prefetchProductData`؛ لف كل `ShopProductCard` بـ div مع `onMouseEnter` و `onFocus` لتحميل مسبق لصفحة التفاصيل والمنتج. |

---

## 6. تحسينات UX المتوقعة

- **Time to Interactive (TTI):** عند الضغط على تبويب أو رابط بعد hover، الـ chunk قد يكون محمّلًا مسبقًا فتصبح الصفحة قابلة للاستخدام أسرع.
- **First Paint:** تقليل زمن ظهور المحتوى الأولي للصفحة المستهدفة عند الاعتماد على نفس الـ import.
- **شعور بالسلاسة:** تحميل مسبق لبيانات الطلبات/منتجات التاجر/أدمن يقلل انتظار المستخدم عند أول فتح للتبويب بعد تسجيل الدخول (عندما يسمح الـ API/cache بذلك).

---

*هذا المستند يصف تنفيذ الـ prefetch الحالي؛ لا يغيّر مسارات التطبيق ولا واجهات الـ props للمكونات.*
