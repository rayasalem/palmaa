# المسارات (Routes) والأمان

مرجع لجميع مسارات الـ API والتحقق من الهوية والصلاحيات.

---

## ملخص الأمان

| العنصر | التطبيق |
|--------|----------|
| **المصادقة** | JWT في Cookie أو هيدر `Authorization: Bearer <token>` عبر `authMiddleware.authenticate` |
| **الصلاحيات (RBAC)** | `requireRole('ADMIN' | 'MERCHANT' | 'CUSTOMER' | 'BROKER')` حسب المسار |
| **ملكية الموارد** | التحقق من أن الطلب/الشحنة/الإشعار يخص المستخدم (أو أدمن) قبل التعديل أو العرض |
| **Rate limiting** | عام على كل الطلبات + حدود خاصة لـ auth و payment و cart |
| **CORS** | من `FRONTEND_URL` فقط |
| **Helmet** | تفعيل في الإنتاج (CSP, HSTS, إلخ) |

---

## مسارات الـ API والصلاحيات

### الصحة (Health) – عامة
| Method | المسار | المصادقة | ملاحظة |
|--------|--------|----------|--------|
| GET | `/health`, `/api/health`, `/ready`, `/status`, `/api/status` | لا | للمراقبة والـ load balancer |

### المصادقة (Auth) – `/api/auth`
| Method | المسار | المصادقة | ملاحظة |
|--------|--------|----------|--------|
| GET | `/ping` | لا | للتأكد أن الباكند يعمل |
| GET | `/check-key` | لا | معطّل في الإنتاج إلا إذا `ALLOW_AUTH_CHECK_KEY=true` |
| POST | `/login` | لا | محدود بـ authLimiter |
| POST | `/logout` | لا | يلغي الـ cookie |
| POST | `/logout-all` | نعم | يلغي كل الجلسات |
| GET | `/me` | نعم | بيانات المستخدم الحالي |
| POST | `/register` | لا | تسجيل مستخدم جديد |
| POST | `/verify-email` | لا | تأكيد البريد |
| POST | `/forgot-password` | لا | طلب إعادة تعيين كلمة المرور |
| POST | `/reset-password` | لا | تعيين كلمة مرور جديدة |
| POST | `/resend-verification` | لا | إعادة إرسال رمز التأكيد |
| GET/POST | `/mfa/*` | نعم (ما عدا verify) | MFA: status, setup, verify-setup, verify, disable |

### الطلبات (Orders) – `/api/orders`
| Method | المسار | المصادقة | صلاحية / ملكية |
|--------|--------|----------|-----------------|
| GET | `/` | نعم | قائمة طلبات المستخدم (customer) |
| GET | `/merchant` | نعم | MERCHANT فقط – طلبات التاجر |
| POST | `/` | اختياري | إنشاء طلب (زائر أو مسجّل) |
| GET | `/:id` | اختياري | عرض الطلب: مالك (customer_id/merchant_id) أو أدمن أو ضيف بـ X-Order-Guest-Token |
| PATCH | `/:id/cancel` | نعم | إلغاء: العميل صاحب الطلب فقط |
| PATCH | `/:id/invoice` | نعم | ربط فاتورة: التاجر صاحب الطلب أو أدمن |
| PATCH | `/:id/complete` | نعم | أدمن فقط |
| PATCH | `/:id/claim` | نعم | ربط الطلب بالمستخدم الحالي (عميل) |

### الشحن (Shipment) – `/api/shipment`
| Method | المسار | المصادقة | صلاحية / ملكية |
|--------|--------|----------|-----------------|
| POST | `/create` | نعم | إنشاء شحنة للطلب: العميل أو التاجر صاحب الطلب أو أدمن |
| GET | `/status` | نعم | حالة الشحنة: فقط إذا الطلب يخص المستخدم أو أدمن |
| POST | `/print-pdf` | نعم | طباعة AWB: فقط للشحنات المرتبطة بطلبات المستخدم أو أدمن |
| PUT | `/:shipmentId/cancel` | نعم | إلغاء الشحنة: فقط إذا الطلب يخص المستخدم أو أدمن |

### السلة (Cart) – `/api/cart`
| Method | المسار | المصادقة | صلاحية |
|--------|--------|----------|--------|
| GET | `/` | نعم | CUSTOMER, MERCHANT, BROKER, ADMIN – سلة المستخدم |
| POST | `/items` | نعم | إضافة صنف |
| PATCH | `/items/:productId` | نعم | تحديث الكمية |
| DELETE | `/items/:productId` | نعم | حذف صنف |
| DELETE | `/` | نعم | تفريغ السلة |

### المنتجات (Products) – `/api/products`
| Method | المسار | المصادقة | صلاحية |
|--------|--------|----------|--------|
| GET | `/`, `/merchant/:merchantId`, `/:id`, `/:id/likes-count`, `/:id/comments` | لا | قراءة عامة (مع حدود rate) |
| GET | `/:id/liked` | اختياري | هل المستخدم أعجب به |
| POST | `/:id/like`, `/:id/comment` | نعم | إعجاب / تعليق |
| DELETE | `/:id/like` | نعم | إلغاء إعجاب |
| POST | `/` | نعم | MERCHANT فقط – إنشاء منتج |
| PUT | `/:id` | نعم | MERCHANT فقط – تحديث منتج |
| DELETE | `/:id` | نعم | MERCHANT فقط – حذف منتج |

### العناوين (Addresses) – `/api/addresses`
| Method | المسار | المصادقة | ملاحظة |
|--------|--------|----------|--------|
| GET | `/cities`, `/districts-villages`, `/villages` | لا | بيانات عامة للمحافظات والقرى (LogesTechs أو احتياطي) |

### الدفع (Payment) – `/api/payment` و `/api/payments`
| Method | المسار | المصادقة | ملاحظة |
|--------|--------|----------|--------|
| POST | `/create` | لا | إنشاء جلسة دفع (محدود بـ paymentLimiter) |
| POST | `/callback` | لا | استدعاء من بوابة الدفع |
| POST | `/cybersource/charge` | لا | دفع Cybersource REST |
| POST | `/cybersource/hosted-session` | لا | جلسة Hosted Checkout |
| POST | `/cybersource/notify` | لا | إشعار من Cybersource (التحقق بالتوقيع) |
| POST | `/cybersource/rest/process` | لا | معالجة دفع REST (محدود) |

### الأدمن (Admin) – `/api/admin`
| Method | المسار | المصادقة | صلاحية |
|--------|--------|----------|--------|
| جميع المسارات | `/users`, `/orders`, `/products`, `/settings`, `/platform-earnings` | نعم | أدمن فقط |

### الوسيط (Broker) – `/api/broker`
| Method | المسار | المصادقة | صلاحية |
|--------|--------|----------|--------|
| جميع المسارات | `/shared-products`, إلخ | نعم | BROKER فقط |

### التاجر (Merchant) – `/api/merchant`
| Method | المسار | المصادقة | صلاحية |
|--------|--------|----------|--------|
| GET | `/dashboard` | نعم | MERCHANT فقط |
| GET | `/:id/followers-count`, `/:id/following`, `/:id` | لا / اختياري | بروفايل عام أو عدد المتابعين |

### الإشعارات (Notifications) – `/api/notifications`
| Method | المسار | المصادقة | ملكية |
|--------|--------|----------|--------|
| GET | `/` | نعم | إشعارات المستخدم فقط |
| PATCH | `/:id/read` | نعم | تحديث يتم فقط للإشعارات التي user_id = المستخدم |

### المتابعة (Follow) – `/api/follow`
| Method | المسار | المصادقة | ملاحظة |
|--------|--------|----------|--------|
| POST | `/:merchantId` | نعم | متابعة تاجر |
| DELETE | `/:merchantId` | نعم | إلغاء متابعة |

### المنتجات المشتركة (Shared Products) – `/api/shared-products`
| Method | المسار | المصادقة | ملاحظة |
|--------|--------|----------|--------|
| GET | `/` | لا | قائمة عامة حسب وسيط (query) |

### الدردشة (Chat) – `/api/chat`
| Method | المسار | المصادقة | ملاحظة |
|--------|--------|----------|--------|
| POST | `/` | لا | بوت الدعم (محدود بالـ generalLimiter) |

---

## التحقق من ملكية الموارد

- **الطلب (Order):** في `getOrder` يُسمح بالعرض للعميل (customer_id)، التاجر (merchant_id)، الأدمن، أو الضيف عبر `X-Order-Guest-Token` المطابق لـ `guest_access_token`.
- **الشحنة (Shipment):** إنشاء / حالة / طباعة / إلغاء – يتم التحقق من أن الطلب المرتبط بالشحنة (عبر `delivery_id`) يخص المستخدم (customer_id أو merchant_id) أو أن المستخدم أدمن.
- **الإشعار (Notification):** `markRead` يحدّث فقط الصفوف التي `user_id = req.auth.sub`.

---

## الروتات في الواجهة (Frontend)

الروتات المعرّفة في `routes.ts` (Hash routing):

- **عامة (PUBLIC_TOP_ROUTES):** `''`, `catalog`, `login`, `join`, `register-merchant`, `register-broker`, `register`, `terms`, `verify-email`.
- **تتطلب تسجيل (PROTECTED_TOP_ROUTES):** `home`, `shop`, `cart`, `orders`, `profile`, `notifications`, `dashboard`, `products`, `subscription`, `promote`, `earnings`, `stats`, `admin`, `users`, `withdrawals`, `platform`.
- **أدمن فقط (ADMIN_ONLY_TOP_ROUTES):** `admin`, `users`, `withdrawals`, `platform`.
- **لوحة تاجر/وسيط (MERCHANT_DASHBOARD_TOP_ROUTES):** `dashboard`, `products`, `subscription`, `promote`, `earnings`, `stats`.

يجب أن يتحقق الـ Frontend من المستخدم والصلاحية قبل التوجيه لهذه الصفحات، والـ API يفرض المصادقة والصلاحيات على كل طلب.
