/**
 * مسارات التطبيق (Hash-based routing)
 * كل مسار يظهر في الرابط كـ #/path أو #/path/id
 *
 * | المسار           | الصفحة              |
 * |------------------|---------------------|
 * | (فارغ) / welcome | لاندينغ (أول صفحة للزائر) |
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
  /** المسار الفارغ (#/) — يُحوَّل تلقائياً إلى welcome */
  HOME: '',
  /** صفحة الترحيب (لاندينغ) — الصفحة الأولى للزائر */
  WELCOME: 'welcome',
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
  /** إعدادات/إيرادات المنصة (أدمن) */
  PLATFORM: 'platform',
  /** العروض — إدارة قسم العروض (أدمن) */
  OFFERS: 'offers',
} as const;

/** مسارات عامة — لا تتطلب تسجيل دخول */
export const PUBLIC_TOP_ROUTES = new Set([
  '',
  ROUTES.CATALOG,
  ROUTES.WELCOME,
  ROUTES.LOGIN,
  ROUTES.JOIN,
  ROUTES.REGISTER_MERCHANT,
  ROUTES.REGISTER_BROKER,
  ROUTES.REGISTER,
  ROUTES.TERMS,
  ROUTES.VERIFY_EMAIL,
]);

/** مسارات تتطلب تسجيل دخول (غير مسموح للضيف) */
export const PROTECTED_TOP_ROUTES = new Set([
  ROUTES.HOME_APP,
  ROUTES.SHOP,
  ROUTES.CART,
  ROUTES.ORDERS,
  ROUTES.PROFILE,
  ROUTES.NOTIFICATIONS,
  ROUTES.DASHBOARD,
  ROUTES.PRODUCTS,
  ROUTES.SUBSCRIPTION,
  ROUTES.PROMOTE,
  ROUTES.EARNINGS,
  ROUTES.STATS,
  ROUTES.ADMIN,
  ROUTES.USERS,
  ROUTES.WITHDRAWALS,
  ROUTES.PLATFORM,
]);

/** مسارات للأدمن فقط — أي دور آخر يُحوَّل للرئيسية */
export const ADMIN_ONLY_TOP_ROUTES = new Set([
  ROUTES.ADMIN,
  ROUTES.USERS,
  ROUTES.WITHDRAWALS,
  ROUTES.PLATFORM,
  ROUTES.OFFERS,
]);

/** مسارات لوحة التاجر/الوسيط — الزبون يُحوَّل للرئيسية */
export const MERCHANT_DASHBOARD_TOP_ROUTES = new Set([
  ROUTES.DASHBOARD,
  ROUTES.PRODUCTS,
  ROUTES.SUBSCRIPTION,
  ROUTES.PROMOTE,
  ROUTES.EARNINGS,
  ROUTES.STATS,
]);
