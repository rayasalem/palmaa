/**
 * مسارات التطبيق (Hash-based routing)
 * كل مسار يظهر في الرابط كـ #/path أو #/path/id
 *
 * | المسار           | الصفحة              |
 * |------------------|---------------------|
 * | (فارغ)           | لاندينغ             |
 * | catalog          | تصفّح المنتجات      |
 * | login            | تسجيل الدخول        |
 * | join             | انشاء حساب (اختيار دور) |
 * | register-merchant| تسجيل تاجر          |
 * | register-broker  | تسجيل وسيط          |
 * | register         | تسجيل زبون          |
 * | terms            | الشروط والأحكام     |
 * | product/:id      | صفحة منتج           |
 * | profile/:id      | بروفايل عام         |
 * | broker/:id       | صفحة وسيط عام       |
 * | dashboard        | لوحة التحكم         |
 * | subscription     | باقة الاشتراك (وسيط)|
 * | promote          | الترويج (وسيط)      |
 * | shop / cart      | متجر / سلة          |
 * | orders           | طلباتي              |
 * | admin            | لوحة الأدمن         |
 */
export const ROUTES = {
  /** الصفحة الرئيسية (لاندينغ) */
  HOME: '',
  /** تصفّح المنتجات (كتالوج) */
  CATALOG: 'catalog',
  /** الصفحة الرئيسية للمستخدم المسجّل (زبون) */
  HOME_APP: 'home',
  /** تسجيل الدخول */
  LOGIN: 'login',
  /** تأكيد البريد الإلكتروني */
  VERIFY_EMAIL: 'verify-email',
  /** انشاء حساب جديد (اختيار الدور) */
  JOIN: 'join',
  /** تسجيل تاجر (يمر عبر الشروط) */
  REGISTER_MERCHANT: 'register-merchant',
  /** تسجيل وسيط */
  REGISTER_BROKER: 'register-broker',
  /** تسجيل زبون */
  REGISTER: 'register',
  /** الشروط والأحكام */
  TERMS: 'terms',
  /** صفحة منتج عام: product/:id */
  product: (id: string) => `product/${id}`,
  /** صفحة بروفايل عام: profile/:id */
  profile: (id: string) => `profile/${id}`,
  /** صفحة وسيط عام: broker/:id */
  broker: (id: string) => `broker/${id}`,
  // ——— مسارات للمستخدم المسجّل ———
  /** لوحة التحكم (تاجر/وسيط/أدمن) */
  DASHBOARD: 'dashboard',
  /** باقة الاشتراك (وسيط) */
  SUBSCRIPTION: 'subscription',
  /** الترويج (وسيط) */
  PROMOTE: 'promote',
  /** الأرباح (وسيط) */
  EARNINGS: 'earnings',
  /** الإحصائيات (وسيط) */
  STATS: 'stats',
  /** المتجر (قائمة المنتجات للشراء) */
  SHOP: 'shop',
  /** السلة */
  CART: 'cart',
  /** طلباتي (زبون) */
  ORDERS: 'orders',
  /** المنتجات (تاجر) */
  PRODUCTS: 'products',
  /** الطلبات (تاجر) */
  ORDERS_MERCHANT: 'orders',
  /** الإشعارات */
  NOTIFICATIONS: 'notifications',
  /** الملف الشخصي */
  PROFILE: 'profile',
  /** لوحة الأدمن */
  ADMIN: 'admin',
  /** السحوبات (أدمن) */
  WITHDRAWALS: 'withdrawals',
  /** المستخدمون (أدمن) */
  USERS: 'users',
} as const;
