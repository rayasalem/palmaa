# توثيق مشروع منصة بالما (Palma Marketplace)

## نظرة عامة

**بالما** منصة سوق إلكتروني (marketplace) تدعم عدة أدوار: عميل، تاجر، وسيط (بروكر)، ومسؤول. المشروع مبني بـ **React 18** و **TypeScript** و **Vite**، مع واجهة عربية/إنجليزية وواجهة متجاوبة.

---

## هيكل المشروع

```
palma-marketplace/
├── App.tsx                 # نقطة التوجيه الرئيسية والحالة العامة
├── index.tsx               # نقطة الدخول وتشغيل React
├── index.css               # الأنماط العامة + Tailwind
├── types.ts                # أنواع TypeScript (User, Product, Order, ...)
├── store.ts                # واجهة موحدة للخدمات (marketStore, paymentProcessor)
├── translations.ts         # نصوص الواجهة (ar, en, he)
├── api/
│   ├── client.ts           # عميل HTTP الأساسي و JWT
│   └── index.ts
├── components/             # مكونات واجهة المستخدم
├── views/                  # صفحات/مشاهد حسب الدور
├── services/               # خدمات API ومنطق الأعمال
├── hooks/                  # خطافات React (useCart, useAuth, ...)
├── data/                   # بيانات ثابتة (مثل القرى)
└── server/                 # خادم Node (اختياري)
```

---

## التقنيات المستخدمة

| التقنية | الاستخدام |
|--------|-----------|
| **React 18** | واجهة المستخدم |
| **TypeScript** | الأنواع والواجهات |
| **Vite** | البناء والتطوير |
| **Tailwind CSS** | التنسيق |
| **Lucide React** | الأيقونات |
| **Recharts** | الرسوم البيانية (لوحات التحكم) |
| **Supabase** | قاعدة البيانات/المصادقة (حسب الإعداد) |

---

## التوجيه (Routing)

التطبيق يعتمد **Hash-based routing** (مثل `#/catalog`, `#/admin`) بدون React Router.

- **المسارات العامة (بدون تسجيل دخول):**
  - `#/` أو فارغ → الصفحة الرئيسية (PublicWebsite)
  - `#/catalog` → كتالوج المنتجات (PublicCatalog)
  - `#/login` → تسجيل الدخول
  - `#/register` → تسجيل عميل
  - `#/register-merchant` → تسجيل تاجر (بعد الشروط)
  - `#/register-broker` → تسجيل وسيط
  - `#/product/:id` → تفاصيل منتج (عام)
  - `#/profile/:id` → ملف عام
  - `#/broker/:id` → صفحة وسيط عام
  - `#/terms` → الشروط والأحكام

- **بعد تسجيل الدخول (حسب الدور):**
  - `#/home`, `#/shop`, `#/cart`, `#/orders`, `#/profile`, `#/notifications` للعميل
  - `#/dashboard`, `#/products`, `#/orders`, `#/earnings`, `#/shop`, `#/profile` للتاجر
  - لوحة البروكر والإحصائيات للوسيط
  - `#/admin`, `#/users`, `#/products`, `#/orders`, `#/withdrawals` للأدمن

الدالة `applyHashToState()` تقرأ الـ hash وتحدّث الحالة؛ `updateHash(path)` يكتب المسار في الـ URL.

---

## الأدوار والصلاحيات (Roles)

| الدور | الوصف |
|------|--------|
| **CUSTOMER** | عميل: تسوق، سلة، طلبات، إشعارات، ملف شخصي |
| **MERCHANT** | تاجر: لوحة تحكم، منتجات، طلبات، أرباح، تسوق/سلة |
| **BROKER** | وسيط: تسويق، إحصائيات، أرباح، تسوق/سلة |
| **ADMIN** | مسؤول: مستخدمين، منتجات، طلبات، سحوبات، إعدادات المنصة |

- الحسابات ذات الحالة **REJECTED** تُعرض لها شاشة "بانتظار المراجعة" (PendingReview).
- أدمن غير مؤكد البريد يُعرض له **VerifyEmail** قبل الدخول للوحة الأدمن.

---

## المكونات الرئيسية (Components)

### التخطيط والعام
- **Layout** – الهيكل بعد تسجيل الدخول: شريط جانبي/قائمة، لغة، تسجيل خروج، وتبويبات حسب الدور.
- **ToastProvider** – عرض الإشعارات (نجاح/خطأ/معلومة).
- **PageLoader** – مؤشر تحميل للصفحات المُحمّلة كسولاً (React.lazy).

### المصادقة والتسجيل
- **Auth** – تسجيل دخول واختيار نوع التسجيل (عميل/تاجر/وسيط).
- **RegisterMerchant** – نموذج تسجيل تاجر (مدن/قرى، بيانات متجر).
- **RegisterBroker** – نموذج تسجيل وسيط.
- **RegisterCustomer** – تسجيل عميل.
- **VerifyEmail** – تأكيد البريد للأدمن.
- **PendingReview** – رسالة انتظار الموافقة للحسابات المرفوضة.

### الصفحات العامة (بدون تسجيل)
- **PublicWebsite** – الصفحة الرئيسية (هيرو، ميزات، دعوة للتسجيل).
- **PublicCatalog** – كتالوج المنتجات مع بحث وفلترة.
- **PublicProductDetails** – صفحة تفاصيل منتج واحدة.
- **PublicProfileView** – عرض ملف مستخدم عام.
- **PublicBrokerPage** – صفحة وسيط عامة.
- **MerchantTermsView** – الشروط والأحكام للمتاجر.

### مكونات أخرى
- **ComingSoonHero** – قسم الهيرو في الصفحة الرئيسية.
- **Logo** – شعار الموقع.
- **PendingReview** – شاشة "بانتظار المراجعة".

---

## المشاهد (Views) حسب الدور

| المشهد | الدور | الوظيفة |
|--------|-------|---------|
| **CustomerView** | CUSTOMER / أو MERCHANT|ADMIN|BROKER (شوب/سلة) | تسوق، سلة، طلبات، دفع، شحن |
| **MerchantView** | MERCHANT | لوحة التاجر: إحصائيات، منتجات، طلبات، اشتراك |
| **BrokerView** | BROKER | لوحة الوسيط: تسويق، إحصائيات، أرباح |
| **AdminView** | ADMIN | لوحة الأدمن: مستخدمين، منتجات، طلبات، سحوبات، إعدادات |
| **ProfileView** | الكل | الملف الشخصي (بيانات، مدينة/قرية، منتجات التاجر إن وجدت) |
| **NotificationsView** | CUSTOMER | الإشعارات |
| **CheckoutPage** | عند الدفع API | صفحة إتمام الدفع (API) |
| **CheckoutReturnPage** | بعد العودة من الدفع | صفحة نتيجة الدفع (orderId, payment) |
| **MerchantTermsView** | عام | الشروط والأحكام للمتاجر |

---

## تقسيم الكود (Code Splitting)

الصفحات الثقيلة تُحمّل عند الحاجة عبر **React.lazy** و **Suspense**:

- **Lazy:** PublicWebsite, PublicCatalog, CustomerView, MerchantView, AdminView, ProfileView, PublicProductDetails.
- **Fallback:** مكون **PageLoader** (دوائر تحميل + نص "Loading…").
- المسارات والشروط والأدوار **لم تتغيّر**؛ فقط تأخير تحميل شيفرة هذه الصفحات حتى يفتح المستخدم المسار المناسب.

---

## الخدمات (Services)

| الخدمة | الوظيفة |
|--------|---------|
| **authService** | تسجيل دخول، تسجيل خروج، getMe، تحديث حالة المستخدم، نسيت كلمة المرور |
| **userService** | تسجيل، تحديث ملف، ملف تاجر، أسماء التجار، حذف/استرجاع مستخدم (أدمن) |
| **productService** | منتجات حسب تاجر، إضافة/تحديث/حذف، فلترة، تصنيفات |
| **orderService** | طلبات، عناصر طلب، تحديث حالة |
| **cartApi** | سلة المستخدم (API): جلب، إضافة، تحديث كمية، حذف، تفريغ |
| **checkoutApi** | إنشاء طلب، إلغاء طلب، جلب طلباتي |
| **adminApi** | منتجات أدمن، طلبات، إعدادات منصة، أرباح عمولة |
| **flashlineService** | شحن: مدن/قرى، إنشاء شحنة، حالة، إلغاء، تسميات |
| **emailService** | إرسال بريد (قوالب، تسجيل، شحن) |
| **cloudinaryService** | رفع صور (Cloudinary) |
| **brokerApi** | واجهات الوسيط إن وجدت |
| **storageService** / **core** | تخزين محلي/قاعدة (حسب الإعداد) |

---

## التخزين والحالة (Store)

- **marketStore** – واجهة موحدة تستدعي الخدمات أعلاه (منتجات، مستخدمين، طلبات، سحوبات، إلخ) للتوافق مع الكود القديم.
- **paymentProcessor** – معالج دفع رقمي (محاكاة أو حقيقي حسب الإعداد).
- **db** (من `services/core/storage`) – مصدر البيانات المحلي إن وُجد.

---

## الخطافات (Hooks)

- **useCart(userId)** – إدارة سلة المستخدم المسجّل: جلب، إضافة، تحديث كمية، حذف، تفريغ، وإرجاع الحالة وخطأ إن وجد.
- **useAuth** – إن وُجد: مصادقة وتوكن.
- **useToast** – من ToastProvider لعرض الإشعارات.

---

## الأنواع الرئيسية (types.ts)

- **User**, **UserRole**, **UserStatus** – المستخدم ودوره وحالته.
- **MerchantProfile** – بيانات متجر التاجر.
- **Product**, **CartItem** – المنتج وعنصر السلة.
- **Order**, **OrderItem** – الطلب وعناصره.
- **Review**, **Notification**, **WithdrawalRequest**, **CommissionRecord** – تقييمات، إشعارات، سحوبات، عمولات.
- **Address**, **ShipmentType**, **ShipmentBody**, **FlashlineShipmentResponse** – عناوين وشحن.
- **Language** (من translations) – `'ar' | 'en' | 'he'`.

---

## الترجمة (translations.ts)

- **Language**: `ar`, `en`, `he`.
- كائنات `ar`, `en`, `he` تحتوي: `common`, `auth`, `nav`, `cart`, `product`, `roles`, `categories`, `checkout`, إلخ.
- **getAuthErrorMessage** – تحويل رسائل خطأ المصادقة إلى نص بلغة المستخدم.

---

## عميل API (api/client.ts)

- **getApiBase()** – يعيد عنوان الـ API (إنتاج: مثلاً `https://palmaa.onrender.com`، أو من `VITE_API_URL`).
- **getAuthToken()** – قراءة JWT من localStorage أو sessionStorage.
- طلبات HTTP مع رؤوس (Authorization عند وجود توكن) ومعالجة JSON.
- **SESSION_EXPIRED_EVENT** – حدث يُطلق عند انتهاء الجلسة (401) لمسح المستخدم محلياً.

---

## السلة والدفع

- **عميل غير مسجّل:** سلة محلية (useState) + حفظ في `localStorage` (palma_cart).
- **عميل مسجّل:** سلة من الخادم عبر **cartApi** و **useCart**.
- عند تسجيل الدخول: دمج السلة المحلية في سلة الخادم ثم تفريغ المحلية.
- الدفع: **CheckoutPage** (عند استخدام دفع API) و **CheckoutReturnPage** لعرض النتيجة بعد العودة.

---

## الشحن (Flashline)

- **flashlineService**: مدن/قرى داخلية، إنشاء شحنة، استعلام حالة، إلغاء، تسميات.
- في **CustomerView**: نموذج عنوان (مدينة، قرية/منطقة، عنوان، هاتف، إلخ) ثم استدعاء **createShipment** وربط الطلب بالشحنة وإرسال بريد بالتفاصيل.

---

## البناء والتشغيل

```bash
# تثبيت الاعتماديات
npm install

# وضع التطوير
npm run dev

# بناء للإنتاج
npm run build

# معاينة بناء الإنتاج
npm run preview

# تشغيل الخادم (إن وُجد)
npm run start:server
```

ملف البيئة: يمكن استخدام `VITE_API_URL` لتوجيه الواجهة إلى عنوان API مخصّص.

---

## ملاحظات للأمان والمنطق

- لا تخزين كلمات مرور في الواجهة إلا للاتصال بالـ API عند الحاجة؛ المصادقة تعتمد على JWT.
- التحقق من البريد للأدمن قبل الدخول للوحة التحكم.
- تسجيل التاجر يمر عبر صفحة الشروط والأحكام قبل نموذج التسجيل.
- مسارات التوجيه وحماية الأدوار ومصادقة الدخول لم تُغيّر عند إضافة Code Splitting؛ المنطق التجاري كما هو.

---

*آخر تحديث للتوثيق يتوافق مع هيكل المشروع الحالي (تقسيم كود، مكونات، خدمات، وتوجيه).*
