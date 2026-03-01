# تشات بوت الدعم الفني – AI مجاني (Groq)

## نظرة عامة

الشات بوت يستخدم **Groq مجاناً** (أولوية)، أو OpenAI إذا ضبطت مفتاحه:

1. **عند ضبط `GROQ_API_KEY`:** يرسل المحادثة إلى Groq (نموذج `llama-3.1-8b-instant`) — **مجاني**.
2. **أو `OPENAI_API_KEY`:** يستخدم OpenAI (مدفوع).
3. **بدون أي مفتاح أو عند فشل الطلب:** يستخدم الردود المحلية (FAQ).

الـ fallback تلقائي.

---

## ضبط المفتاح المجاني (Groq)

1. ادخل إلى [console.groq.com](https://console.groq.com) وسجّل دخولاً (أو إنشاء حساب مجاني).
2. من القائمة: **API Keys** → **Create API Key** → انسخ المفتاح (يبدأ بـ `gsk_...`).
3. افتح ملف **`server/.env`** والصق المفتاح بعد `GROQ_API_KEY=`:
   ```env
   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. أعد تشغيل السيرفر.

ملف `server/.env` موجود؛ إن لم يكن فيه متغيرات أخرى (مثل Supabase أو JWT) انسخها من `server/.env.example` ثم أضف `GROQ_API_KEY`.

---

## ما الذي تم إضافته؟

### السيرفر

| الملف | الوظيفة |
|-------|---------|
| `server/services/chatService.js` | يستدعي Groq (مجاني) أولاً ثم OpenAI إن وُجد مفتاحه؛ وإلا يُرجع `null` → FAQ محلي. |
| `server/.env` | متغير `GROQ_API_KEY=` — الصق مفتاحك المجاني من Groq هنا. |

### الواجهة

بدون تغيير؛ تستدعي `/api/chat` والرد يأتي من الـ AI أو من الـ FAQ.

---

## التكلفة والأمان

- **Groq:** مجاني (حدود استخدام يومية مجانية).
- المفتاح في `server/.env` فقط ولا يُرفع إلى Git إذا كان `.env` في `.gitignore`.
- طلبات الشات تخضع لـ rate limiting في السيرفر.
