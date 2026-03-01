/**
 * الشروط والأحكام الخاصة بالمتاجر المشتركة في المنصة
 * تُعرض في صفحة تسجيل التاجر وفي صفحة الشروط المستقلة.
 * النص العربي كما هو مطلوب بالحرف.
 */

export const MERCHANT_TERMS_TITLE_AR = 'الشروط والأحكام الخاصة بالمتاجر المشتركة في المنصة';

/** النص الكامل للشروط والأحكام بالعربية - كما هو بالحرف للعرض في تسجيل التاجر */
export const MERCHANT_TERMS_FULL_TEXT_AR = `الشروط والأحكام الخاصة بالمتاجر المشتركة في المنصة

١. الاشتراك
الاشتراك الشهري مجاني.
بعد انتهاء الفترة المجانية، تطبق رسوم الاشتراك وفق ما تحدده إدارة الموقع.

٢. العمولة
تستوفي إدارة الموقع عمولة بنسبة %15 من إجمالي قيمة المبيعات المنجزة عبر المنصة.

٣. الفواتير الضريبية
يلتزم المتجر بتقديم فاتورة ضريبية رسمية عن كل عملية بيع.
في حال عدم تقديم الفاتورة الضريبية، يحق لإدارة الموقع خصم نسبة إضافية مقدارها %16 من قيمة المبيعات اذا كان التسديد الكتروني.
في حال التسديد النقدي لا يشترط تقديم فاتورة ضريبة ويتم استيفاء رسوم العمولة المذكورة في رقم (2) فقط.

٤. صحة المعلومات
يلتزم المتجر بتقديم بيانات صحيحة ودقيقة عن نفسه وعن المنتجات المعروضة.
يجب أن تكون المنتجات المرسلة مطابقة للصور والمواصفات المذكورة في صفحة العرض وطلب المستهلك.

٥. المنتجات الممنوعة
يمنع عرض أو بيع أي منتجات مخالفة للقوانين، أو مضرة بالصحة، أو منافية للأخلاق العامة.
يحق لإدارة الموقع إزالة أي منتج مخالف دون إشعار مسبق.

٦. إدارة العضوية
تحتفظ إدارة الموقع بحق تعليق أو إلغاء عضوية أي متجر يخالف هذه الشروط والسياسات.

٧. تسديد ثمن المنتجات
يتم تحويل ثمن المنتجات إلى المتجر بعد:
تسليم المنتج للمستهلك.
التأكد من مطابقة المنتج للمواصفات المعلنة.

٨. تعديل السياسات
يحق لإدارة الموقع تعديل هذه الشروط والسياسات بما يتناسب مع المصلحة العامة.
يتم تبليغ المتاجر المشتركة بأي تعديلات قبل سريانها.`;

/** النص الكامل للشروط بالإنجليزية (للعرض عند اختيار الإنجليزية) */
export const MERCHANT_TERMS_FULL_TEXT_EN = `Terms and Conditions for Marketplace Merchants

1. Subscription
Monthly subscription is free.
After the free period ends, subscription fees apply as determined by the site management.

2. Commission
The site management charges a commission of 15% on the total value of sales completed through the platform.

3. Tax Invoices
The store must provide an official tax invoice for each sale.
If the tax invoice is not provided, the site management has the right to deduct an additional 16% of the sales value when payment is electronic.
For cash payment, a tax invoice is not required; only the commission mentioned in (2) applies.

4. Accuracy of Information
The store must provide correct and accurate data about itself and the products offered.
Products shipped must match the images and specifications listed on the product page and consumer order.

5. Prohibited Products
It is prohibited to display or sell any products that violate laws, harm health, or are contrary to public morals.
The site management has the right to remove any non-compliant product without prior notice.

6. Membership Management
The site management reserves the right to suspend or cancel the membership of any store that violates these terms and policies.

7. Payment for Products
The product amount is transferred to the store after:
Delivery of the product to the consumer.
Verification that the product matches the advertised specifications.

8. Policy Amendments
The site management has the right to amend these terms and policies in the public interest.
Participating stores are notified of any amendments before they take effect.`;

export const merchantTermsAr = {
  title: MERCHANT_TERMS_TITLE_AR,
  sections: [
    {
      number: 1,
      title: 'الاشتراك',
      items: [
        'الاشتراك الشهري مجاني.',
        'بعد انتهاء الفترة المجانية، تطبق رسوم الاشتراك وفق ما تحدده إدارة الموقع.',
      ],
    },
    {
      number: 2,
      title: 'العمولة',
      items: [
        'تستوفي إدارة الموقع عمولة بنسبة %15 من إجمالي قيمة المبيعات المنجزة عبر المنصة.',
      ],
    },
    {
      number: 3,
      title: 'الفواتير الضريبية',
      items: [
        'يلتزم المتجر بتقديم فاتورة ضريبية رسمية عن كل عملية بيع.',
        'في حال عدم تقديم الفاتورة الضريبية، يحق لإدارة الموقع خصم نسبة إضافية مقدارها %16 من قيمة المبيعات اذا كان التسديد الكتروني.',
        'في حال التسديد النقدي لا يشترط تقديم فاتورة ضريبة ويتم استيفاء رسوم العمولة المذكورة في رقم (2) فقط.',
      ],
    },
    {
      number: 4,
      title: 'صحة المعلومات',
      items: [
        'يلتزم المتجر بتقديم بيانات صحيحة ودقيقة عن نفسه وعن المنتجات المعروضة.',
        'يجب أن تكون المنتجات المرسلة مطابقة للصور والمواصفات المذكورة في صفحة العرض وطلب المستهلك.',
      ],
    },
    {
      number: 5,
      title: 'المنتجات الممنوعة',
      items: [
        'يمنع عرض أو بيع أي منتجات مخالفة للقوانين، أو مضرة بالصحة، أو منافية للأخلاق العامة.',
        'يحق لإدارة الموقع إزالة أي منتج مخالف دون إشعار مسبق.',
      ],
    },
    {
      number: 6,
      title: 'إدارة العضوية',
      items: [
        'تحتفظ إدارة الموقع بحق تعليق أو إلغاء عضوية أي متجر يخالف هذه الشروط والسياسات.',
      ],
    },
    {
      number: 7,
      title: 'تسديد ثمن المنتجات',
      items: [
        'يتم تحويل ثمن المنتجات إلى المتجر بعد:',
        'تسليم المنتج للمستهلك.',
        'التأكد من مطابقة المنتج للمواصفات المعلنة.',
      ],
    },
    {
      number: 8,
      title: 'تعديل السياسات',
      items: [
        'يحق لإدارة الموقع تعديل هذه الشروط والسياسات بما يتناسب مع المصلحة العامة.',
        'يتم تبليغ المتاجر المشتركة بأي تعديلات قبل سريانها.',
      ],
    },
  ],
};

export const merchantTermsEn = {
  title: 'Terms and Conditions for Marketplace Merchants',
  sections: [
    { number: 1, title: 'Subscription', items: ['Monthly subscription is free.', 'After the free period, subscription fees apply as determined by the site management.'] },
    { number: 2, title: 'Commission', items: ['The site management shall charge a commission of 15% on the total value of sales completed through the platform.'] },
    { number: 3, title: 'Tax Invoices', items: ['The store is committed to providing an official tax invoice for each sale.', 'If the tax invoice is not provided, the site management has the right to deduct an additional 16% of the sales value when payment is electronic.', 'For cash payment, a tax invoice is not required; only the commission in (2) applies.'] },
    { number: 4, title: 'Accuracy of Information', items: ['The store is committed to providing correct and accurate data about itself and the products offered.', 'Products shipped must match the images and specifications listed on the product page and consumer order.'] },
    { number: 5, title: 'Prohibited Products', items: ['It is prohibited to display or sell any products that violate laws, harm health, or are contrary to public morals.', 'The site management has the right to remove any non-compliant product without prior notice.'] },
    { number: 6, title: 'Membership Management', items: ['The site management reserves the right to suspend or cancel the membership of any store that violates these terms and policies.'] },
    { number: 7, title: 'Payment for Products', items: ['The product amount is transferred to the store after:', 'Delivery of the product to the consumer.', 'Verification that the product matches the advertised specifications.'] },
    { number: 8, title: 'Policy Amendments', items: ['The site management has the right to amend these terms and policies in the public interest.', 'Participating stores are notified of any amendments before they take effect.'] },
  ],
};
