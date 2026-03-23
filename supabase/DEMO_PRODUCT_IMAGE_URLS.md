# Demo products — image URLs (per `title`)

الوصف في قاعدة البيانات: `Demo product: {title}`.  
مصدر صورة المنتج: الحقل **`image_url`** داخل كل `jsonb_build_object` في `MOCK-DEMO-DATA.sql` (سطر واحد لكل منتج).

عند إعادة تشغيل السكربت، يُحدَّث `image_url` و`images` عبر `ON CONFLICT (id) DO UPDATE`.

لا يُحذف أي رابط؛ يُستبدل فقط بربط صريح لكل اسم منتج بدل منطق «صورة واحدة لكل تصنيف».
