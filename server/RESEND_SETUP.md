# إعداد Resend للإيميلات

الباكند **لا يضع الـ API Key داخل الكود**. المفتاح يُضبط فقط في **متغيرات البيئة**.

## 1) الحصول على API Key من Resend

1. ادخل إلى [Resend](https://resend.com) → تسجيل الدخول.
2. من القائمة اليسرى اختر **API Keys**.
3. اضغط **Create API Key** واختر صلاحيات مناسبة (مثلاً Sending access).
4. انسخ المفتاح (يبدأ بـ `re_`) — لن يظهر مرة ثانية.

## 2) أين تضعه

### تشغيل محلي (على جهازك)

1. في مجلد **server** انسخ `.env.example` إلى `.env` إن لم يكن موجوداً.
2. افتح `server/.env` وأضف (أو عدّل):

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=Palma <noreply@palma.ps>
```

- استبدل `re_xxx...` بالمفتاح الحقيقي من Resend.
- `RESEND_FROM` يجب أن يكون من دومين موثّق عندك (مثل palma.ps).

### على Render (السيرفر الحقيقي)

1. افتح مشروع الباكند على Render.
2. **Environment** → **Environment Variables**.
3. أضف:
   - **Key:** `RESEND_API_KEY`
   - **Value:** المفتاح من Resend (مثل `re_xxxx...`)
4. اختياري: أضف `RESEND_FROM` = `Palma <noreply@palma.ps>` (أو أي مرسل من دومينك الموثّق).
5. احفظ ثم أعد نشر الخدمة إن لزم.

## 3) التأكد

بعد ضبط المفتاح، إرسال كود "نسيت كلمة المرور" أو تأكيد الإيميل يجب أن يعمل. في الـ logs على Render أو في الطرفية المحلية ستظهر رسالة مثل: `[emailService] Resend sent to ...` عند النجاح.

---

**مهم:** لا ترفع ملف `.env` إلى Git ولا تضع المفتاح داخل الكود. فقط في متغيرات البيئة (`.env` محلياً و Environment على Render).
