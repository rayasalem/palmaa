# قائمة التحقق من إعداد Hosted Checkout (Reason Code 150)

استخدم هذه القائمة للتأكد من الإعداد قبل أو أثناء التواصل مع Cybersource.

---

## 1. التحقق من الكود (ما نرسله)

- [ ] **التطبيق لا يرسل** `merchant_category_code` ولا `usd_outlet_id` ولا `usd_terminal_id`.
- [ ] الحقول المرسلة هي فقط العشرة المطلوبة + `signature`:
  - `access_key`, `amount`, `currency`, `locale`, `profile_id`, `reference_number`, `signed_date_time`, `signed_field_names`, `transaction_type`, `transaction_uuid`, `signature`

**كيف تتأكد:** بعد تنفيذ "متابعة للدفع" مرة، راجع لوج السيرفر. يجب أن ترى سطراً مثل:
```text
[cybersource-hosted] session created orderId=... fields_sent=[access_key, amount, currency, locale, profile_id, reference_number, signature, signed_date_time, signed_field_names, transaction_type, transaction_uuid]
```
إذا ظهر في القائمة أي من: `merchant_category_code`, `usd_outlet_id`, `usd_terminal_id` فالمشكلة من الكود. في تطبيقنا الحالي لا نرسلها.

---

## 2. التحقق من ملف `.env` (الشهادات والبروفايل)

في `server/.env` تأكد من:

| المتغير | مطلوب لـ Hosted Checkout | ملاحظات |
|--------|---------------------------|---------|
| `CYBS_PROFILE_ID` | نعم | من Business Center → Secure Acceptance → Profile ID (بدون مسافات) |
| `CYBS_ACCESS_KEY` | نعم | من نفس البروفايل (بدون مسافات) |
| `CYBS_SECRET_KEY` | نعم | Shared Secret من البروفايل |
| `CYBS_HOSTED_PAY_URL` | اختياري | إن لم يُضبط يُستخدم: `https://testsecureacceptance.cybersource.com/pay` |
| `CYBS_LOCALE` | اختياري | افتراضي `ar-xn` |
| `CYBS_CURRENCY` | اختياري | افتراضي `USD` |

- [ ] لا أخطاء إملاء في أسماء المتغيرات.
- [ ] القيم من **بيئة الاختبار (Sandbox)** وليس Production.
- [ ] لا مسافات زائدة في بداية أو نهاية القيم.

---

## 3. التحقق من Business Center (البروفايل)

- [ ] الدخول إلى **بيئة الاختبار**: مثلاً `ebc2test.cybersource.com` (وليس ebc2.cybersource.com).
- [ ] **Payment Configuration** → **Secure Acceptance Settings** → البروفايل المستخدم.
- [ ] **Profile ID** و **Access Key** و **Shared Secret** مطابقة تماماً لما في `.env`.
- [ ] البروفايل **مفعّل** (Editable أو Active).
- [ ] العملة (مثلاً USD) مسموحة في إعدادات البروفايل إن وُجد.

---

## 4. التحقق من اللوجات بعد معاملة فاشلة

- [ ] عند حدوث **Reason Code 150**، راجع لوج السيرفر للتأكد من أن الطلب خرج من تطبيقك (سطر `[cybersource-hosted] session created`).
- [ ] راجع في Business Center تفاصيل المعاملة الفاشلة (Reply Message) وتأكد أن الخطأ هو فعلاً `usd_outlet_id` / `usd_terminal_id` (أو `merchant_category_code`).

---

## 5. إذا كل ما سبق صحيح والخطأ 150 ما زال يظهر

السبب يكون من **إعداد المعالج (processor) أو البروفايل** عند Cybersource وليس من التطبيق.

- [ ] مراسلة **developer@cybersource.com** مع:
  - Merchant ID (من Business Center).
  - توضيح أنك تستخدم **Secure Acceptance Hosted Checkout** في **Sandbox**.
  - نسخ رسالة الخطأ: `The following property is either invalid or missing: usd_outlet_id, usd_terminal_id` (وإن ظهر `merchant_category_code` أرفقه).
  - طلب تعديل بروفايل الاختبار ليعمل **بدون** إلزام هذه الحقول.

---

## ملخص

| ماذا نتحقق منه | أين |
|----------------|-----|
| الحقول المرسلة لا تتضمن outlet/terminal/merchant_category_code | لوج السيرفر بعد ضغطة "متابعة للدفع" |
| صحة وقيم CYBS_* | `server/.env` |
| تطابق البروفايل والشهادات | Business Center (Test) ↔ .env |
| حل 150 من جهة المعالج/البروفايل | developer@cybersource.com |
