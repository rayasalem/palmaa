# ملخص وظائف منصة بالما | Palma Marketplace – Functions Overview

## 1. الباك إند (API) – مسارات ووظائف

### المصادقة `/api/auth`

| الطريقة | المسار               | الوظيفة                                   |
| ------- | -------------------- | ----------------------------------------- |
| GET     | /ping                | فحص أن الباك إند يعمل                     |
| POST    | /login               | تسجيل الدخول (JWT + cookie)               |
| POST    | /logout              | تسجيل الخروج                              |
| GET     | /me                  | جلب المستخدم الحالي (يتطلب مصادقة)        |
| POST    | /register            | تسجيل مستخدم جديد (يرسل OTP للتحقق)       |
| POST    | /verify-email        | التحقق من البريد برمز OTP                 |
| POST    | /forgot-password     | طلب رمز استعادة كلمة المرور (إرسال إيميل) |
| POST    | /reset-password      | استعادة كلمة المرور برمز OTP وكلمة جديدة  |
| POST    | /resend-verification | إعادة إرسال رمز التحقق                    |

### المنتجات `/api/products`

| الطريقة | المسار                | الوظيفة                           |
| ------- | --------------------- | --------------------------------- |
| GET     | /                     | قائمة المنتجات (مع فلترة)         |
| GET     | /merchant/:merchantId | منتجات تاجر معيّن                 |
| GET     | /:id                  | تفاصيل منتج                       |
| GET     | /:id/likes-count      | عدد الإعجابات                     |
| GET     | /:id/liked            | هل المستخدم أعجب (اختياري مصادقة) |
| GET     | /:id/comments         | تعليقات المنتج                    |
| POST    | /                     | إنشاء منتج (تاجر فقط)             |
| PUT     | /:id                  | تحديث منتج (تاجر فقط)             |
| DELETE  | /:id                  | حذف منتج (تاجر فقط)               |
| POST    | /:id/like             | إعجاب بمنتج                       |
| DELETE  | /:id/like             | إلغاء إعجاب                       |
| POST    | /:id/comment          | إضافة تعليق                       |

### الطلبات `/api/orders`

| الطريقة | المسار        | الوظيفة                  |
| ------- | ------------- | ------------------------ |
| GET     | /             | قائمة طلباتي (مصادقة)    |
| POST    | /             | إنشاء طلب (ضيف أو مسجّل) |
| GET     | /:id          | تفاصيل طلب               |
| PATCH   | /:id/cancel   | إلغاء طلب (مصادقة)       |
| PATCH   | /:id/invoice  | تحديث فاتورة الطلب       |
| PATCH   | /:id/complete | إكمال الطلب (أدمن فقط)   |

### السلة `/api/cart`

| الطريقة | المسار            | الوظيفة             |
| ------- | ----------------- | ------------------- |
| GET     | /                 | جلب سلة المستخدم    |
| POST    | /items            | إضافة منتج للسلة    |
| PATCH   | /items/:productId | تحديث الكمية        |
| DELETE  | /items/:productId | إزالة منتج من السلة |
| DELETE  | /                 | إفراغ السلة         |

### الشحن `/api/shipment`

| الطريقة | المسار              | الوظيفة                     |
| ------- | ------------------- | --------------------------- |
| POST    | /create             | إنشاء شحنة (LogesTechs)     |
| GET     | /status             | حالة الشحنة (id أو barcode) |
| POST    | /print-pdf          | طباعة AWB (PDF)             |
| PUT     | /:shipmentId/cancel | إلغاء الشحنة                |

### الدفع `/api/payment`

| الطريقة | المسار    | الوظيفة                    |
| ------- | --------- | -------------------------- |
| POST    | /create   | إنشاء دفعة (بوابة عربي)    |
| POST    | /callback | استقبال callback بعد الدفع |

### العناوين `/api/addresses`

| الطريقة | المسار    | الوظيفة         |
| ------- | --------- | --------------- |
| GET     | /cities   | قائمة المدن     |
| GET     | /villages | قرى حسب المدينة |

### التاجر `/api/merchant`

| الطريقة | المسار               | الوظيفة                     |
| ------- | -------------------- | --------------------------- |
| GET     | /dashboard           | لوحة تحكم التاجر (تاجر فقط) |
| GET     | /:id                 | الملف العام للتاجر          |
| GET     | /:id/followers-count | عدد المتابعين               |
| GET     | /:id/following       | هل المستخدم يتابع (اختياري) |

### الوسيط `/api/broker`

| الطريقة | المسار                             | الوظيفة                |
| ------- | ---------------------------------- | ---------------------- |
| GET     | /shared-products                   | منتجاتي المشتركة       |
| PUT     | /shared-products/:productId        | إضافة/تحديث منتج مشترك |
| DELETE  | /shared-products/:productId        | إزالة منتج من المشترك  |
| PATCH   | /shared-products/featured/:shareId | تفعيل/إلغاء تمييز      |

### المنتجات المشتركة `/api/shared-products`

| الطريقة | المسار | الوظيفة                            |
| ------- | ------ | ---------------------------------- |
| GET     | /      | قائمة المنتجات المشتركة حسب الوسيط |

### المتابعة `/api/follow`

| الطريقة | المسار       | الوظيفة      |
| ------- | ------------ | ------------ |
| POST    | /:merchantId | متابعة تاجر  |
| DELETE  | /:merchantId | إلغاء متابعة |

### الإشعارات `/api/notifications`

| الطريقة | المسار    | الوظيفة                |
| ------- | --------- | ---------------------- |
| GET     | /         | قائمة إشعارات المستخدم |
| PATCH   | /:id/read | تعليم كمقروء           |

### الأدمن `/api/admin`

| الطريقة | المسار             | الوظيفة                              |
| ------- | ------------------ | ------------------------------------ |
| GET     | /users             | قائمة المستخدمين                     |
| PATCH   | /users/:id/status  | تغيير حالة مستخدم (موافقة/رفض/تعليق) |
| POST    | /users/:id/delete  | حذف ناعم (مسودة 30 يوم)              |
| POST    | /users/:id/restore | استرجاع مستخدم محذوف                 |
| GET     | /orders            | قائمة الطلبات                        |
| GET     | /products          | قائمة المنتجات                       |
| PUT     | /products/:id      | تحديث منتج                           |
| DELETE  | /products/:id      | حذف منتج                             |
| GET     | /settings          | إعدادات المنصة                       |
| PATCH   | /settings          | تحديث الإعدادات                      |
| GET     | /platform-earnings | أرباح المنصة                         |

---

## 2. الواجهة الأمامية – الشاشات والمكونات

### الصفحات العامة (بدون تسجيل)

- **Landing** – الصفحة الرئيسية (PublicWebsite / ComingSoonHero).
- **Catalog** – كتالوج المنتجات (PublicCatalog).
- **Product Details** – تفاصيل منتج (PublicProductDetails).
- **Broker Page** – صفحة وسيط عامة (PublicBrokerPage).
- **Public Profile** – ملف عام (PublicProfileView).
- **Auth** – تسجيل دخول، إنشاء حساب، اختيار الدور، تسجيل تاجر/وسيط/زبون (Auth, RegisterMerchant, RegisterCustomer, RegisterBroker).
- **Merchant Terms** – عرض شروط وأحكام التجار (MerchantTermsView).
- **Checkout Return** – صفحة العودة بعد الدفع (CheckoutReturnPage).

### بعد تسجيل الدخول – حسب الدور

#### زبون (CustomerView)

- المتجر (تصفح، إضافة للسلة).
- السلة (تعديل كميات، حذف، متابعة للدفع).
- الطلبات (قائمة طلباتي، إلغاء طلب، إلغاء شحنة).
- إتمام الشراء (فورم شحن، دفع، إنشاء شحنة عند النجاح).

#### تاجر (MerchantView)

- لوحة التحكم (إحصائيات، طلبات حديثة).
- المنتجات (قائمة، إضافة، تعديل، حذف، تفعيل/إلغاء تفعيل).
- الطلبات (قائمة، إنشاء شحنة، فحص حالة الشحنة، إلغاء الشحنة).

#### وسيط (BrokerView)

- السوق (منتجات للترويج).
- إضافة منتجات للمحفظة المشتركة مع رسالة تسويقية.
- إزالة منتج من المشترك.
- الأرباح والعمولات.

#### أدمن (AdminView)

- المستخدمون (قائمة، موافقة/رفض/تعليق، حذف ناعم، استرجاع).
- الطلبات (قائمة، إكمال طلب).
- المنتجات (قائمة، تعديل، حذف).
- الإعدادات وأرباح المنصة.

### مكونات مشتركة

- **Layout** – هيدر، قائمة، لغة (عربي/إنجليزي/عبري)، سلة، تسجيل خروج.
- **Auth** – تسجيل دخول، نسيت كلمة المرور، اختيار نوع الحساب، تسجيل (تاجر/وسيط/زبون).
- **RegisterMerchant** – فورم تسجيل تاجر + خطوة الشروط والأحكام.
- **RegisterCustomer** – فورم تسجيل زبون.
- **RegisterBroker** – فورم تسجيل وسيط.
- **VerifyEmail** – إدخال رمز التحقق من البريد.
- **PendingReview** – رسالة انتظار الموافقة للتاجر/الوسيط.
- **ToastProvider** – إشعارات (نجاح/خطأ/تحذير).
- **CheckoutPage** – صفحة الدفع (عربة، زر متابعة للدفع).

---

## 3. الخدمات الأمامية (Services)

| الخدمة                       | الوظيفة الرئيسية                                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **authService**              | login, getMe, logout, register, verifyEmail, forgotPassword, resetPassword, resendVerification                                                                                      |
| **userService**              | register, getMerchantName, getMerchantProfile, updateProfile, updateMerchantProfile, softDeleteUser, restoreUser                                                                    |
| **productService**           | getById, filter, getCategories, getByMerchantId, add, update, delete                                                                                                                |
| **orderService**             | getAll, getItems, placeOrder, updateShipmentInfo, updateStatus                                                                                                                      |
| **cartApi**                  | getCart, addCartItem, updateCartItem, removeCartItem, clearCartApi                                                                                                                  |
| **checkoutApi**              | createOrder, cancelOrder, fetchMyOrders                                                                                                                                             |
| **shipmentApi**              | createShipmentApi, getShipmentStatusApi, cancelShipmentApi                                                                                                                          |
| **flashlineService**         | createShipment (mock/واجهة)، automateShipmentCreation، getShipmentStatus، mapFlashlineStatus، cancelLogestechsShipment، getInternalCities، getInternalVillages، resolveLocationName |
| **adminApi**                 | getAdminProducts, updateAdminProduct, deleteAdminProduct, getAdminOrders, getAdminSettings, updateAdminSettings, getAdminPlatformEarnings                                           |
| **brokerApi**                | listSharedProducts, upsertSharedProduct, removeSharedProduct, toggleSharedFeatured                                                                                                  |
| **merchantDashboardService** | getMerchantDashboard                                                                                                                                                                |
| **storageService**           | uploadFile (Supabase/Cloudinary)                                                                                                                                                    |
| **cloudinaryService**        | uploadImage                                                                                                                                                                         |
| **emailService**             | sendEmail, getShipmentDetailsTemplate (واجهة أمامية للاستخدام مع الإيميل)                                                                                                           |

---

## 4. الـ Store (marketStore) – واجهة موحّدة

- **مصادقة:** login, forgotPassword, resetPassword, getUserById, registerCustomer, registerMerchant, registerBroker.
- **مستخدمون:** getUsers, getAllApprovedMerchants, getMerchantNameByUserId, getMerchantProfileByUserId, updateUserProfile, saveUser.
- **منتجات:** getProducts, fetchMerchantProducts, addProduct, updateProduct, deleteProduct, getFilteredProducts, getAllUniqueCategories, getProductRating, uploadImage.
- **طلبات:** getOrders, getOrderItems, placeOrder, updateOrderShipment, updateLocalOrderStatus, saveOrder.
- **تقييمات:** getReviewsForProduct, addReview.
- **اجتماعي:** followUser, unfollowUser, isFollowing, getFollowersCount, toggleLike, isLiked, getLikesCount, addComment, getComments.
- **وسيط:** getSharedProducts, upsertSharedProduct, removeSharedProduct, toggleSharedProductFeatured, getCommissions, incrementClicks, setReferral.
- **مالي:** getWithdrawals, requestWithdrawal, updateWithdrawalStatus.

---

## 5. اللغات والترجمة

- **اللغات:** عربي (ar)، إنجليزي (en)، عبري (he) – RTL للعربي والعبري.
- **مبدّل اللغة:** من الهيدر (عربي ↔ EN ↔ עברית).
- **الملف:** `translations.ts` (common, nav, auth, roles, product, cart, checkout, merchant, broker, admin, footer, hero, landing, comingSoon, categories).
- **رسائل الأخطاء:** getAuthErrorMessage(error, lang) لترجمة أخطاء المصادقة والتسجيل.

---

## 6. الأمان والبنية (الباك إند)

- Helmet، rate limit، CORS، compression، cookie-parser.
- JWT مصادقة (cookie httpOnly).
- التحقق من الدور: requireRole('MERCHANT' | 'ADMIN' | …).
- تحقق من البيئة (validateEnv)، إجبار HTTPS في الإنتاج.
- معالجة أخطاء موحّدة (errorHandler، sanitizeErrorResponse).

---

## 7. قاعدة البيانات والتكاملات

- **Supabase:** المستخدمون، الطلبات، المنتجات، السلة، OTP، الإشعارات، إلخ.
- **LogesTechs:** إنشاء شحنات، حالة الشحنة، إلغاء، طباعة AWB.
- **البريد:** Resend أو Nodemailer (SMTP) للتحقق من البريد واستعادة كلمة المرور.
- **الدفع:** بوابة عربي (Arabic Bank) – إنشاء دفعة و callback.

هذا الملف يلخّص **كل وظائف الكود** في منصة بالما (باك إند + واجهة + خدمات + store + لغات وأمان).
