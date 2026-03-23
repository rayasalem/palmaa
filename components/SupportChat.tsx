import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Send } from 'lucide-react';
import type { Language } from '../translations';
import type { User } from '../types';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  time: Date;
}

/** خيارات سريعة للأسئلة المتوقعة (زائر/زبون/تاجر/أدمن) — النص يُرسل كسؤال ويُطابق الرد المناسب */
const QUICK_OPTIONS: Record<Language, { label: string; query: string }[]> = {
  ar: [
    { label: 'كيف أشتري؟', query: 'كيف اشتري' },
    { label: 'الدفع', query: 'الدفع' },
    { label: 'الشحن والتوصيل', query: 'الشحن' },
    { label: 'تسجيل الدخول', query: 'تسجيل الدخول' },
    { label: 'إنشاء حساب', query: 'إنشاء حساب' },
    { label: 'السلة وإتمام الشراء', query: 'السلة' },
    { label: 'طلباتي', query: 'طلباتي' },
    { label: 'الملف الشخصي', query: 'الملف الشخصي' },
    { label: 'إضافة منتج', query: 'إضافة منتج' },
    { label: 'تعديل منتج', query: 'تعديل منتج' },
    { label: 'حذف منتج', query: 'حذف منتج' },
    { label: 'إدارة الطلبات', query: 'إدارة الطلبات' },
    { label: 'التقارير والأرباح', query: 'التقارير' },
    { label: 'تواصل مع الدعم', query: 'تواصل مع الدعم' },
  ],
  en: [
    { label: 'How do I buy?', query: 'how to buy' },
    { label: 'Payment', query: 'payment' },
    { label: 'Shipping', query: 'shipping' },
    { label: 'Log in', query: 'login' },
    { label: 'Sign up', query: 'register' },
    { label: 'Cart & checkout', query: 'cart' },
    { label: 'My orders', query: 'my orders' },
    { label: 'Profile', query: 'profile' },
    { label: 'Add product', query: 'add product' },
    { label: 'Edit product', query: 'edit product' },
    { label: 'Delete product', query: 'delete product' },
    { label: 'Manage orders', query: 'manage orders' },
    { label: 'Reports & earnings', query: 'reports' },
    { label: 'Contact support', query: 'contact support' },
  ],
  he: [
    { label: 'איך קונים?', query: 'איך קונים' },
    { label: 'תשלום', query: 'תשלום' },
    { label: 'משלוח', query: 'משלוח' },
    { label: 'התחברות', query: 'התחברות' },
    { label: 'הרשמה', query: 'הרשמה' },
    { label: 'סל ורכישה', query: 'סל' },
    { label: 'ההזמנות שלי', query: 'הזמנות' },
    { label: 'פרופיל', query: 'פרופיל' },
    { label: 'הוסף מוצר', query: 'הוסף מוצר' },
    { label: 'ערוך מוצר', query: 'ערוך מוצר' },
    { label: 'מחק מוצר', query: 'מחק מוצר' },
    { label: 'ניהול הזמנות', query: 'ניהול הזמנות' },
    { label: 'דוחות ורווחים', query: 'דוחות' },
    { label: 'צור קשר', query: 'תמיכה' },
  ],
};

const CHAT_TEXTS: Record<
  Language,
  {
    title: string;
    placeholder: string;
    send: string;
    welcome: string;
    contactHint: string;
    quickOptionsTitle?: string;
    faq: Record<string, string>;
  }
> = {
  ar: {
    title: 'الدعم الفني',
    placeholder: 'اكتب سؤالك...',
    send: 'إرسال',
    welcome: 'مرحباً! أنا مساعد الدعم الفني لموقع بالما. اكتب سؤالك وسأجيبك فوراً وبوضوح.',
    contactHint: 'للمساعدة المباشرة: support@palma.com أو صفحة اتصل بنا.',
    quickOptionsTitle: 'اختر سؤالاً أو اكتب أسئلتك',
    roleLabel: { customer: 'زبون', merchant: 'تاجر', admin: 'أدمن', broker: 'وسيط', guest: 'زائر' },
    roleIntro: {
      CUSTOMER: 'بما أنك زبون، ',
      MERCHANT: 'بما أنك تاجر، ',
      ADMIN: 'بما أنك أدمن، ',
      BROKER: 'بما أنك وسيط، ',
    },
    faq: {
      payment:
        'الدفع إلكتروني وآمن. الخطوات: 1) أضف المنتجات للسلة 2) اضغط "إتمام الشراء" 3) أدخل بيانات التوصيل والدفع 4) أكد الطلب. الدفع بالبطاقات والطرق المتاحة في المنصة.',
      shipping:
        'الشحن حسب المتجر والمنطقة. بعد الشراء: ادخل إلى "طلباتي" من القائمة، واختر الطلب لتتبع حالة الشحنة والتوصيل.',
      return:
        'سياسة الإرجاع تختلف حسب التاجر. التفاصيل تظهر في صفحة المنتج أو عند إتمام الطلب. للاستفسار عن إرجاع معيّن تواصل مع الدعم: support@palma.com.',
      login:
        'تسجيل الدخول: 1) اضغط "تسجيل الدخول" 2) أدخل البريد الإلكتروني وكلمة المرور 3) اضغط دخول. لاستعادة كلمة المرور: من نفس الصفحة اختر "نسيت كلمة المرور" واتبع التعليمات.',
      register:
        'إنشاء حساب: 1) اضغط "إنشاء حساب" أو "انضم" 2) اختر نوع الحساب (زبون، تاجر، أو وسيط) 3) أدخل البيانات المطلوبة 4) فعّل الحساب عبر البريد إن طُلب منك ذلك.',
      addProduct:
        'رفع منتج جديد (للتاجر): 1) سجّل الدخول كتاجر 2) من القائمة اختر "لوحة التحكم" ثم "المنتجات" 3) اضغط "إضافة منتج" 4) املأ الاسم، الوصف، السعر، الصورة، والتصنيف 5) اضغط "حفظ". سيظهر المنتج في متجرك.',
      editProduct:
        'تعديل منتج: 1) سجّل الدخول كتاجر 2) لوحة التحكم ← المنتجات 3) ابحث عن المنتج واضغط "تعديل" 4) غيّر الاسم أو الوصف أو السعر أو الصورة كما تريد 5) اضغط "حفظ".',
      deleteProduct:
        'حذف منتج: 1) سجّل الدخول كتاجر 2) لوحة التحكم ← المنتجات 3) اختر المنتج 4) اضغط "حذف" (أو أيقونة الحذف) 5) أكد الحذف. لن يظهر المنتج بعدها في المتجر.',
      manageOrders:
        'إدارة الطلبات: • كزبون: من القائمة اختر "طلباتي" لعرض وتتبع طلباتك. • كتاجر: لوحة التحكم ← الطلبات لعرض طلبات المتجر وتحديث الحالة. • كأدمن: لوحة التحكم ← الطلبات لإدارة كل الطلبات على المنصة.',
      manageCustomers:
        'إدارة العملاء/المستخدمين (للأدمن): 1) لوحة التحكم ← المستخدمين 2) ستجد قائمة المستخدمين (عملاء، تجار، وسطاء) 3) يمكنك الموافقة، الرفض، التعطيل، أو عرض الملف حسب الصلاحيات.',
      buy: 'كيف تشتري: 1) تصفّح المنتجات من الرئيسية أو الكتالوج 2) اضغط "أضف للسلة" على المنتج المطلوب 3) ادخل إلى "السلة" من القائمة 4) اضغط "إتمام الشراء" وأدخل بيانات التوصيل والدفع 5) أكد الطلب. الدفع إلكتروني وآمن.',
      cart: 'استخدام السلة: 1) من صفحة المنتج أو الكتالوج اضغط "أضف للسلة" 2) من القائمة اختر "السلة" لرؤية المنتجات 3) يمكنك تغيير الكمية أو حذف صنف 4) "إتمام الشراء" للانتقال لصفحة الدفع.',
      profile:
        'الملف الشخصي: من القائمة اختر "الملف" أو "الملف الشخصي". يمكنك تعديل الاسم، البريد، العنوان، والقرية/المدينة. للتاجر: تظهر أيضاً "منتجاتي" من نفس الصفحة.',
      siteSettings:
        'إعدادات الموقع (للأدمن): 1) لوحة التحكم ← تبويب "المنصة" أو "Platform" 2) يمكنك تعديل إعدادات المنصة العامة، العمولات، والشروط 3) احفظ التغييرات. صلاحية هذه الصفحة للأدمن فقط.',
      reports:
        'التقارير والمبيعات: • كتاجر: لوحة التحكم ← "الأرباح" أو "Earnings" لمتابعة المبيعات والأرباح. • كأدمن: لوحة التحكم ← الطلبات، المستخدمين، وتبويب المنصة لتقارير أشمل وأرباح العمولة.',
      permissions:
        'الصلاحيات: • الزبون: الشراء، السلة، الطلبات، الملف الشخصي. • التاجر: كل ما سبق + لوحة التحكم (منتجات، طلبات المتجر، أرباح). • الأدمن: إدارة المستخدمين (موافقة/رفض/تعطيل)، إدارة المنتجات والطلبات، السحوبات، إعدادات المنصة. للاستفسار عن صلاحية معيّنة: support@palma.com.',
      support:
        'للتواصل مع الدعم البشري: البريد support@palma.com أو استخدم صفحة "اتصل بنا" في الموقع. فريقنا يرد على الاستفسارات التي تحتاج تدخلاً يدوياً.',
      default:
        'شكراً لسؤالك. إن لم تجد جوابك هنا، تواصل مع الدعم البشري: support@palma.com أو من صفحة اتصل بنا وسيساعدك الفريق.',
    },
  },
  en: {
    title: 'Support',
    placeholder: 'Type your question...',
    send: 'Send',
    welcome:
      "Hi! I'm the support assistant for Palma. Type your question and I'll answer right away, clearly and simply.",
    contactHint: 'For direct help: support@palma.com or the Contact page.',
    quickOptionsTitle: 'Choose a question or type yours',
    roleLabel: { customer: 'Customer', merchant: 'Vendor', admin: 'Admin', broker: 'Broker', guest: 'Guest' },
    roleIntro: {
      CUSTOMER: 'As a customer, ',
      MERCHANT: 'As a vendor, ',
      ADMIN: 'As an admin, ',
      BROKER: 'As a broker, ',
    },
    faq: {
      payment:
        'Payment is secure and online. Steps: 1) Add items to cart 2) Click "Checkout" 3) Enter shipping and payment details 4) Confirm. We accept cards and other methods available on the platform.',
      shipping:
        'Shipping depends on store and region. After purchase: go to "My Orders" from the menu and select your order to track delivery status.',
      return:
        'Return policy varies by merchant. Details are on the product page or at checkout. For a specific return, contact support@palma.com.',
      login:
        'To log in: 1) Click "Log in" 2) Enter email and password 3) Submit. To reset password: use "Forgot password" on the same page and follow the instructions.',
      register:
        'To sign up: 1) Click "Sign up" or "Join" 2) Choose account type (customer, merchant, or broker) 3) Fill in the required fields 4) Activate via email if requested.',
      addProduct:
        'Add a new product (merchant): 1) Log in as merchant 2) Go to Dashboard → Products 3) Click "Add product" 4) Enter name, description, price, image, and category 5) Save. The product will appear in your store.',
      editProduct:
        'Edit a product: 1) Log in as merchant 2) Dashboard → Products 3) Find the product and click "Edit" 4) Change name, description, price, or image 5) Save.',
      deleteProduct:
        'Delete a product: 1) Log in as merchant 2) Dashboard → Products 3) Select the product 4) Click "Delete" 5) Confirm. The product will be removed from your store.',
      manageOrders:
        'Manage orders: • As customer: Menu → "My Orders" to view and track orders. • As merchant: Dashboard → Orders to see store orders and update status. • As admin: Dashboard → Orders to manage all platform orders.',
      manageCustomers:
        "Manage users/customers (admin): 1) Dashboard → Users 2) You'll see the list (customers, merchants, brokers) 3) You can approve, reject, disable, or view profiles according to your role.",
      buy: 'How to buy: 1) Browse products from the home page or catalog 2) Click "Add to cart" on the product 3) Go to "Cart" from the menu 4) Click "Checkout" and enter shipping and payment details 5) Confirm the order. Payment is secure and online.',
      cart: 'Using the cart: 1) On product or catalog page click "Add to cart" 2) Menu → "Cart" to see items 3) Change quantity or remove items 4) "Checkout" to go to payment.',
      profile:
        'Profile: Menu → "Profile". You can edit name, email, address, city/village. For merchants, "My products" is also available from the profile area.',
      siteSettings:
        'Site settings (admin): 1) Dashboard → "Platform" tab 2) Edit platform settings, commissions, terms 3) Save. This page is admin-only.',
      reports:
        'Reports and sales: As vendor: Dashboard → "Earnings" for sales and revenue. As admin: Dashboard → Orders, Users, and Platform tab for full reports and commission.',
      permissions:
        'Permissions: Customer: shop, cart, orders, profile. Vendor: all above + dashboard (products, store orders, earnings). Admin: user management (approve/reject/disable), products, orders, withdrawals, platform settings. For a specific permission: support@palma.com.',
      support:
        'For human support: email support@palma.com or use the "Contact us" page. Our team handles requests that need manual help.',
      default:
        'Thanks for your question. If you need more help, contact support@palma.com or the Contact page and our team will assist you.',
    },
  },
  he: {
    title: 'תמיכה',
    placeholder: 'הקלד את שאלתך...',
    send: 'שלח',
    welcome: 'שלום! אני עוזר התמיכה של palma. כתוב את שאלתך ואענה מיד ובבהירות.',
    contactHint: 'לעזרה ישירה: support@palma.com או דף צור קשר.',
    quickOptionsTitle: 'בחר שאלה או הקלד',
    roleLabel: { customer: 'לקוח', merchant: 'סוחר', admin: 'אדמין', broker: 'ברוקר', guest: 'אורח' },
    roleIntro: { CUSTOMER: 'כלקוח, ', MERCHANT: 'כסוחר, ', ADMIN: 'כאדמין, ', BROKER: 'כברוקר, ' },
    faq: {
      payment:
        'התשלום מאובטח ואונליין. שלבים: 1) הוסף מוצרים לסל 2) לחץ "השלם רכישה" 3) הזן פרטי משלוח ותשלום 4) אשר. מתקבלים כרטיסים והאמצעים הזמינים בפלטפורמה.',
      shipping: 'משלוח לפי חנות ואזור. אחרי רכישה: תפריט → "ההזמנות שלי" ובחר הזמנה למעקב.',
      return: 'מדיניות החזרות משתנה לפי סוחר. פרטים בדף המוצר או בהזמנה. להחזרה ספציפית: support@palma.com.',
      login: 'התחברות: 1) לחץ "התחבר" 2) הזן אימייל וסיסמה 3) שלח. לאיפוס סיסמה: "שכחתי סיסמה" באותה עמודה.',
      register: 'הרשמה: 1) "הרשמה" או "הצטרף" 2) בחר סוג חשבון (לקוח/סוחר/ברוקר) 3) מלא שדות 4) הפעל באימייל אם נדרש.',
      addProduct:
        'הוספת מוצר (סוחר): 1) התחבר כסוחר 2) לוח בקרה → מוצרים 3) "הוסף מוצר" 4) שם, תיאור, מחיר, תמונה, קטגוריה 5) שמור. המוצר יופיע בחנות.',
      editProduct: 'עריכת מוצר: 1) התחבר כסוחר 2) לוח בקרה → מוצרים 3) מצא מוצר ← "ערוך" 4) שנה שדות 5) שמור.',
      deleteProduct: 'מחיקת מוצר: 1) התחבר כסוחר 2) לוח בקרה → מוצרים 3) בחר מוצר 4) "מחק" 5) אשר. המוצר יוסר.',
      manageOrders:
        'ניהול הזמנות: לקוח: תפריט → ההזמנות שלי. סוחר: לוח בקרה → הזמנות. אדמין: לוח בקרה → הזמנות לכל הפלטפורמה.',
      manageCustomers:
        'ניהול משתמשים (אדמין): 1) לוח בקרה → משתמשים 2) רשימת לקוחות/סוחרים/ברוקרים 3) אישור, דחייה, השבתה או צפייה בפרופיל.',
      buy: 'איך קונים: 1) עיין במוצרים מהדף הראשי או הקטלוג 2) "הוסף לסל" על המוצר 3) תפריט → סל 4) "השלם רכישה" והזן פרטים 5) אשר. התשלום מאובטח.',
      cart: 'שימוש בסל: 1) "הוסף לסל" בעמוד המוצר 2) תפריט → סל 3) שנה כמות או הסר 4) "השלם רכישה".',
      profile: 'פרופיל: תפריט → פרופיל. ערוך שם, אימייל, כתובת, עיר. לסוחר: גם "המוצרים שלי".',
      siteSettings:
        'הגדרות האתר (אדמין): 1) לוח בקרה → לשונית "פלטפורמה" 2) ערוך הגדרות, עמלות, תנאים 3) שמור. רק לאדמין.',
      reports: 'דוחות ומכירות: סוחר: לוח בקרה → "הרווחים". אדמין: הזמנות, משתמשים, פלטפורמה לדוחות מלאים.',
      permissions:
        'הרשאות: לקוח: קנייה, סל, הזמנות, פרופיל. סוחר: + לוח בקרה (מוצרים, הזמנות, רווחים). אדמין: ניהול משתמשים, מוצרים, הזמנות, משיכות, הגדרות. לשאלה ספציפית: support@palma.com.',
      support: 'לתמיכה אנושית: support@palma.com או דף צור קשר.',
      default: 'תודה על השאלה. למידע נוסף: support@palma.com או דף צור קשר.',
    },
  },
};

const KEYWORDS: Record<Language, Record<string, string[]>> = {
  ar: {
    buy: ['كيف اشتري', 'كيف أشتري', 'اشتري', 'أشتري', 'شراء', 'شراء منتج', 'buy', 'how to buy'],
    addProduct: ['رفع منتج', 'إضافة منتج', 'أضيف منتج', 'كيف أرفع', 'add product', 'إضافة منتجات'],
    editProduct: ['تعديل منتج', 'تعديل المنتج', 'تغيير منتج', 'edit product', 'تحديث منتج'],
    deleteProduct: ['حذف منتج', 'حذف المنتج', 'إزالة منتج', 'delete product', 'remove product'],
    manageOrders: ['إدارة الطلبات', 'الطلبات', 'طلباتي', 'كيف أتابع الطلب', 'orders', 'manage orders'],
    manageCustomers: ['إدارة العملاء', 'العملاء', 'المستخدمين', 'customers', 'manage users', 'users'],
    cart: ['سلة', 'السلة', 'cart', 'إتمام الشراء', 'checkout'],
    profile: ['الملف', 'الملف الشخصي', 'profile', 'تعديل الملف', 'بياناتي'],
    siteSettings: ['إعدادات الموقع', 'إعدادات المنصة', 'site settings', 'platform settings', 'العمولات', 'الشروط'],
    reports: ['تقارير', 'التقارير', 'المبيعات', 'الأرباح', 'reports', 'sales', 'earnings'],
    permissions: ['الصلاحيات', 'صلاحية', 'permissions', 'صلاحيات الأدمن', 'دور'],
    payment: ['دفع', 'دفعة', 'بطاقة', 'ائتمان', 'payment', 'pay'],
    shipping: ['شحن', 'توصيل', 'شحنة', 'تتبع', 'shipping', 'delivery'],
    return: ['إرجاع', 'استرجاع', 'استبدال', 'return', 'refund'],
    login: ['دخول', 'تسجيل دخول', 'كلمة مرور', 'نسيت', 'login', 'password'],
    register: ['تسجيل', 'حساب جديد', 'انضم', 'إنشاء حساب', 'register', 'sign up'],
    support: ['دعم', 'موظف', 'اتصل', 'تواصل', 'support', 'contact', 'human'],
  },
  en: {
    buy: ['how to buy', 'how do i buy', 'buy', 'buying', 'purchase', 'كيف اشتري', 'شراء'],
    addProduct: ['add product', 'add new product', 'upload product', 'رفع منتج', 'إضافة منتج'],
    editProduct: ['edit product', 'change product', 'update product', 'تعديل منتج'],
    deleteProduct: ['delete product', 'remove product', 'حذف منتج'],
    manageOrders: ['manage orders', 'my orders', 'orders', 'طلبات', 'إدارة الطلبات'],
    manageCustomers: ['manage customers', 'customers', 'users', 'عملاء', 'مستخدمين'],
    cart: ['cart', 'checkout', 'سلة', 'إتمام الشراء'],
    profile: ['profile', 'my profile', 'الملف', 'الملف الشخصي'],
    siteSettings: ['site settings', 'platform settings', 'commission', 'terms', 'إعدادات', 'منصة'],
    reports: ['reports', 'sales', 'earnings', 'تقارير', 'مبيعات', 'أرباح'],
    permissions: ['permissions', 'roles', 'admin access', 'صلاحيات', 'أدمن'],
    payment: ['payment', 'pay', 'card', 'credit', 'دفع'],
    shipping: ['shipping', 'delivery', 'track', 'شحن', 'توصيل'],
    return: ['return', 'refund', 'exchange', 'إرجاع'],
    login: ['login', 'log in', 'password', 'forgot', 'تسجيل دخول'],
    register: ['register', 'sign up', 'join', 'account', 'تسجيل'],
    support: ['support', 'contact', 'human', 'agent', 'دعم', 'اتصل'],
  },
  he: {
    buy: ['איך קונים', 'how to buy', 'buy', 'קנייה', 'קונה'],
    addProduct: ['הוסף מוצר', 'add product', 'הוספת מוצר', 'رفع منتج'],
    editProduct: ['ערוך מוצר', 'edit product', 'עריכת מוצר', 'تعديل منتج'],
    deleteProduct: ['מחק מוצר', 'delete product', 'מחיקת מוצר', 'حذف منتج'],
    manageOrders: ['הזמנות', 'ניהול הזמנות', 'orders', 'manage orders', 'طلبات'],
    manageCustomers: ['לקוחות', 'משתמשים', 'customers', 'users', 'عملاء'],
    cart: ['סל', 'cart', 'checkout', 'سلة'],
    profile: ['פרופיל', 'profile', 'הפרופיל שלי', 'الملف'],
    siteSettings: ['הגדרות האתר', 'site settings', 'platform', 'إعدادات'],
    reports: ['דוחות', 'reports', 'מכירות', 'הרווחים', 'تقارير'],
    permissions: ['הרשאות', 'permissions', 'صلاحيات'],
    payment: ['תשלום', 'כרטיס', 'payment', 'pay'],
    shipping: ['משלוח', 'מעקב', 'shipping', 'delivery'],
    return: ['החזרה', 'return', 'refund'],
    login: ['התחברות', 'סיסמה', 'login', 'password'],
    register: ['הרשמה', 'register', 'sign up'],
    support: ['תמיכה', 'אדם', 'support', 'contact'],
  },
};

function getBotReply(input: string, lang: Language, role?: string | null): string {
  const t = CHAT_TEXTS[lang] as typeof CHAT_TEXTS.ar & { roleIntro?: Record<string, string> };
  const keywords = KEYWORDS[lang];
  const lower = input.trim().toLowerCase();
  if (!lower) return t.faq.default;

  for (const [key, words] of Object.entries(keywords)) {
    if (words.some((w) => lower.includes(w))) {
      const answer = (t.faq as Record<string, string>)[key] ?? t.faq.default;
      const intro = role && role !== 'ADMIN' && t.roleIntro && t.roleIntro[role] ? t.roleIntro[role] : '';
      return intro + answer;
    }
  }
  return t.faq.default;
}

interface SupportChatProps {
  lang: Language;
  user?: User | null;
}

export const SupportChat: React.FC<SupportChatProps> = ({ lang, user }) => {
  const safeLang: Language = lang && (lang === 'ar' || lang === 'en' || lang === 'he') ? lang : 'ar';
  const role = user?.role ? String(user.role) : null;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const t = CHAT_TEXTS[safeLang];
    return [{ id: 'welcome', text: t.welcome, isBot: true, time: new Date() }];
  });
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const t = CHAT_TEXTS[safeLang];

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: `u-${Date.now()}`, text, isBot: false, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    const reply = getBotReply(text, safeLang, role);
    const botMsg: Message = { id: `b-${Date.now()}`, text: reply, isBot: true, time: new Date() };
    setTimeout(() => setMessages((prev) => [...prev, botMsg]), 400);
  };

  const handleQuickSelect = (query: string) => {
    if (!query.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, text: query.trim(), isBot: false, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    const reply = getBotReply(query.trim(), safeLang, role);
    const botMsg: Message = { id: `b-${Date.now()}`, text: reply, isBot: true, time: new Date() };
    setTimeout(() => setMessages((prev) => [...prev, botMsg]), 400);
  };

  const quickOptions = QUICK_OPTIONS[safeLang];
  const quickOptionsTitle = (t as { quickOptionsTitle?: string }).quickOptionsTitle;

  const chatUI = (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed right-4 sm:right-5 rtl:right-auto rtl:left-4 sm:rtl:left-5 z-[99998] flex h-14 w-14 items-center justify-center rounded-full bg-palma-primary text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-palma-primary focus:ring-offset-2"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        aria-label={t.title}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <>
          {/* Backdrop for mobile: tap outside to close chat */}
          <button
            type="button"
            aria-label={safeLang === 'ar' ? 'إغلاق الدردشة' : safeLang === 'he' ? 'סגור צ׳אט' : 'Close chat'}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[99998] bg-black/20 sm:bg-transparent"
          />

          <div
            className="fixed right-4 sm:right-5 rtl:right-auto rtl:left-4 sm:rtl:left-5 z-[99999] flex h-[420px] max-h-[70vh] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-palma-border bg-white shadow-xl sm:h-[480px]"
            style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
            role="dialog"
            aria-label={t.title}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <span className="font-bold text-palma-navy">{t.title}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label={safeLang === 'ar' ? 'إغلاق' : safeLang === 'he' ? 'סגירה' : 'Close'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.isBot ? 'bg-slate-100 text-slate-700' : 'bg-palma-primary text-white'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            {quickOptions.length > 0 && (
              <div className="border-t border-slate-100 px-3 pt-2 pb-1">
                {quickOptionsTitle && (
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    {quickOptionsTitle}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {quickOptions.map((opt, idx) => (
                    <button
                      key={`${safeLang}-${idx}`}
                      type="button"
                      onClick={() => handleQuickSelect(opt.query)}
                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-palma-primary hover:text-white border border-slate-200 hover:border-palma-primary transition-colors shrink-0"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-slate-100 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t.placeholder}
                  className="flex-1 rounded-xl border border-palma-border bg-white px-4 py-2.5 text-sm outline-none focus:border-palma-primary focus:ring-1 focus:ring-palma-primary"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-palma-primary text-white transition-colors hover:bg-palma-primaryHover focus:outline-none focus:ring-2 focus:ring-palma-primary focus:ring-offset-2"
                  aria-label={t.send}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">{t.contactHint}</p>
            </div>
          </div>
        </>
      )}
    </>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(chatUI, document.body);
  }
  return chatUI;
};
