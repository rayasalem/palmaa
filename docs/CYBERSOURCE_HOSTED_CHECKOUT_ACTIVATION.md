# تفعيل بروفايل Secure Acceptance Hosted Checkout — خطوة بخطوة

هذا الدليل يشرح كيف تفعّل البروفايل في Cybersource Business Center حتى تعمل طريقة الدفع (Hosted Checkout) مع موقعك.  
المصدر: [Cybersource Secure Acceptance Documentation](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-txns.html).

---

## قبل البدء

- **بيئة الاختبار (Sandbox):** [businesscentertest.cybersource.com](https://businesscentertest.cybersource.com)  
- **بيئة الإنتاج (Production):** [businesscenter.cybersource.com](https://businesscenter.cybersource.com)

استخدم **Test** للتجربة أولاً، ثم نفس الخطوات على **Production** عند الجاهزية.

---

## الخطوة 1: الدخول إلى إعدادات Secure Acceptance

1. ادخل إلى **Business Center** (Test أو Production).
2. من القائمة اليسرى اختر:
   - **Payment Configuration** → **Secure Acceptance Settings**  
   - أو إن كنت Reseller: **Portfolio Management** → **Secure Acceptance Settings**.
3. ستظهر قائمة البروفايلات. اختر البروفايل الذي تريد تفعيله (أو أنشئ واحداً جديداً من **New Profile**).

---

## الخطوة 2: إنشاء البروفايل (إن لم يكن موجوداً)

إذا ضغطت **New Profile**:

| الحقل | المطلوب |
|-------|---------|
| **Profile Name** | مطلوب، حتى 40 حرفاً (مثل: palma) |
| **Integration Method** | فعّل **Hosted Checkout Integration** |
| **Company Name** | مطلوب |
| **Company Contact** | الاسم، البريد، الهاتف |
| **Payment Tokenization** | اختياري (للدفع بضغطة لاحقاً) |
| **Decision Manager** | اختياري |

ثم اضغط **Submit**.

---

## الخطوة 3: إعداد طريقة الدفع (Payment Method Configuration)

**مطلوب قبل التفعيل.** يجب تفعيل طريقة دفع واحدة على الأقل.

1. من صفحة البروفايل اختر **Payment Settings** (أو **Payment Form** ثم الإعدادات ذات الصلة).
2. اضغط **Add Card Types**.
3. فعّل أنواع البطاقات التي يسمح بها البنك/المعالج (مثلاً **Visa**, **Mastercard**).
4. لكل نوع بطاقة اضغط أيقونة **Settings**:
   - **CVN Display**: فعّله (يُفضّل لعرض حقل رمز الأمان).
   - **CVN Required**: يُفضّل تفعيله.
   - **Currencies**: اختر العملات المدعومة (مثلاً **USD**, **ILS** حسب حسابك).
5. إذا كان الموقع بالشيكل: اختر **ILS** للعملة المناسبة.
6. اضغط **Submit** ثم **Save**.

---

## الخطوة 4: إنشاء مفاتيح الأمان (Security Keys)

**مطلوب قبل التفعيل.** المفتاح السري يوقّع الطلبات ويُتحقق من إشعارات Cybersource.

1. من صفحة البروفايل اضغط **Security** (أو من Key Management إن كنت Reseller).
2. اضغط **Create Key** (أو علامة +).
3. أدخل **Key name** (مطلوب).
4. **Signature version**: 1.
5. **Signature method**: **HMAC-SHA256**.
6. اضغط **Create** ثم **Confirm**.
7. **مهم:** انسخ **Access Key** و **Secret Key** فوراً (النافذة تُغلق بعد ~30 ثانية).
8. الصق **Access Key** في ملف `.env` في المشروع:
   - `CYBS_ACCESS_KEY=...`
9. الصق **Secret Key** في `.env`:
   - `CYBS_SECRET_KEY=...`
10. **Profile ID** يكون ظاهراً في صفحة البروفايل (General Settings) — ضعه في `.env`:
    - `CYBS_PROFILE_ID=...`

لا تشارك Secret Key ولا ترفعها إلى Git.

---

## الخطوة 5: إعداد صفحة استجابة العميل (Customer Response Page)

**مطلوب قبل التفعيل.** بدونها لا يمكن تفعيل البروفايل.

1. من صفحة البروفايل اضغط **Customer Response** (أو من القائمة: Notifications / Customer Response).
2. **Transaction Response Page:**
   - إما **Hosted by Cybersource** (صفحة قبول/رفض جاهزة)،  
   - أو **Hosted by You** ثم أدخل رابط صفحتك التي تستقبل POST بعد الدفع (يجب أن تتحقق من التوقيع).
3. **Retry Limit:** حدد عدد المحاولات بعد الرفض (حتى 5).
4. **Customer Redirect after Checkout:**  
   أدخل الرابط الذي يُعاد إليه العميل بعد انتهاء الدفع، مثلاً:
   - اختبار: `https://your-frontend.vercel.app/#/checkout-return`
   - إنتاج: `https://palma.ps/#/checkout-return`
5. اضغط **Save**.

---

## الخطوة 6: إعداد إشعار التاجر (Merchant Notifications)

حتى يستلم السيرفر نتيجة المعاملة حتى لو أغلق العميل المتصفح:

1. من صفحة البروفايل اضغط **Notifications**.
2. فعّل **Merchant POST URL**.
3. أدخل الرابط الكامل لـ endpoint الإشعار في مشروعك:
   - **اختبار:** `https://your-backend.onrender.com/api/payments/cybersource/notify`
   - **إنتاج:** `https://api.palma.ps/api/payments/cybersource/notify`  
   (استبدل النطاق بنطاق الباكند الفعلي.)
4. الرابط يجب أن يكون **HTTPS** ويدعم **TLS 1.2** على الأقل.
5. اختر كيف تريد عرض رقم البطاقة في الإشعار (مثلاً آخر 4 أرقام فقط).
6. اضغط **Save**.

---

## الخطوة 7: (اختياري) حقول الفورم — Billing / Shipping

إذا أردت أن تظهر حقول الفاتورة أو الشحن على صفحة Cybersource:

1. من صفحة البروفايل اضغط **Payment Form**.
2. اختر **Billing Information** وحدد الحقول (Display / Edit / Require).
3. إذا احتجت **Shipping Information** فعّلها بنفس الطريقة.
4. اضغط **Save**.

---

## الخطوة 8: تفعيل البروفايل (Activate Profile)

بعد إكمال **Payment Method** و **Security Keys** و **Customer Response**:

1. من **Secure Acceptance Settings** اختر البروفايل (من قائمة البروفايلات غير المفعلة).
2. اضغط **Promote Profile** (أو **Promote to Active** / **Publish to Active** حسب الواجهة).
3. اضغط **Confirm**.

بعد التأكيد يصبح البروفايل **Active** ويمكن استخدامه للدفع.

---

## الخطوة 9: التحقق من المشروع

1. **ملف `.env` في مجلد `server`** يجب أن يحتوي على الأقل:
   ```env
   CYBS_PROFILE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   CYBS_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   CYBS_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...
   CYBS_HOSTED_PAY_URL=https://testsecureacceptance.cybersource.com/pay
   CYBS_LOCALE=ar-xn
   CYBS_CURRENCY=USD
   ```
   للشيكل استخدم `CYBS_CURRENCY=ILS` إذا كان الحساب يدعمها.

2. أعد تشغيل الباكند بعد تعديل `.env`.

3. من الموقع: سلة → "متابعة للدفع" → إكمال بيانات الشحن والدفع → يجب أن يتم التوجيه إلى صفحة Cybersource لإدخال البطاقة.

---

## ملخص الترتيب

| # | الخطوة | مطلوب للتفعيل |
|---|--------|----------------|
| 1 | الدخول إلى Secure Acceptance Settings | ✓ |
| 2 | إنشاء/اختيار البروفايل | ✓ |
| 3 | Payment Settings → Add Card Types + عملات | ✓ |
| 4 | Security → Create Key (HMAC-SHA256) → نسخ Access + Secret | ✓ |
| 5 | Customer Response → Redirect URL + (اختياري) Custom response | ✓ |
| 6 | Notifications → Merchant POST URL = `/api/payments/cybersource/notify` | موصى به |
| 7 | Payment Form (Billing/Shipping) | اختياري |
| 8 | Promote Profile → Confirm | ✓ |

---

## روابط التوثيق (حسب القائمة + الروابط الجواها)

تم التحقق من الروابط والروابط الفرعية؛ التقرير الكامل في [CYBERSOURCE_LINKS_VERIFICATION.md](./CYBERSOURCE_LINKS_VERIFICATION.md).

### القائمة الرئيسية
- [About This Guide](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-about-guide.html)
- [Overview](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/home-merch.html)
- [Payment Configuration](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-configuration.html)
- [Checkout Language Localization](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-checkout-lang-localization.html)
- [Activating a Profile](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-activate-profile.html)  
  **مطلوب قبل التفعيل (الروابط الجواها):**
  - [Payment Method Configuration](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-configuration/sa-payment-method-configuration.html)
  - [Security Keys](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-configuration/sa-security-keys.html)
  - [Customer Response Page](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-configuration/sa-customer-response-pg.html)
- [Scripting Language Samples](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-samples-scripting-languages.html)  
  → [Sample Transaction Process Using JSP](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-samples-scripting-languages/sa-sample-txn-process-using-jsp.html)
- [Payment Transactions](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-txns.html) (Endpoints، Required Signed Fields)
- [Test and View Transactions](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-test-view-txns.html)  
  → [Creating a Secure Acceptance Profile](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-configuration/sa-both-intro-create-sa-profile.html)  
  → [Testing Credit Card Services](https://developer.cybersource.com/docs/cybs/en-us/test-data/developer/all/so/test-data/testing_credit_card_services.html) (بطاقات الاختبار)
- [Hosted Checkout Integration API Fields](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-wm-api-fields.html)
- [Reason Codes](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-reason-codes.html)
- [Types of Notifications](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-notification-types.html)
- [AVS Codes](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-avs-codes.html)
- [CVN Codes](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-cvn-codes.html)
- [American Express SafeKey Response Codes](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-amex-safekey-resp-codes.html)
- [Iframe Implementation](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-wm-iframe-implementation.html)
- [Visa Secure Response Codes](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-visa-secure-response-codes.html)

---

بعد تطبيق هذه الخطوات يكون البروفايل مفعّلاً وطريقة الدفع (Hosted Checkout) مربوطة بموقعك. إذا ظهر خطأ (مثل Reason Code 150 أو 101) راجع إعدادات العملة وحقول الفاتورة/الملف في البروفايل وربط نفس القيم في الكود (مثل `CYBS_CURRENCY` وoutlet/terminal إن طلبها البنك).
