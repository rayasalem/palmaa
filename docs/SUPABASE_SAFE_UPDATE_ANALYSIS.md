# Supabase Safe Update Analysis

**Stack:** React (Vite) Frontend • Node (Express) Backend • Supabase Postgres

---

## 1. قائمة الجداول والصلاحيات الحالية

| جدول | الوصول الحالي (Anon / Authenticated / Service Role) | RLS | ملاحظة |
|------|-----------------------------------------------------|-----|--------|
| `users` | **الكل:** SELECT, INSERT, UPDATE, DELETE (بسبب `GRANT ALL` و RLS معطل) | معطل | حساس جداً |
| `otp_codes` | **الكل** | معطل | مؤقت، حساس |
| `merchant_profiles` | **الكل** | معطل | حساس |
| `products` | **الكل** | معطل | حساس |
| `orders` | **الكل** | معطل | حساس |
| `order_items` | **الكل** | معطل | حساس |
| `order_profits` | **الكل** (لم يُذكر في GRANT صراحة؛ يورث من schema أو يبقى افتراضي) | غير مفعّل | حساس |
| `carts` | **الكل** | معطل | حساس |
| `cart_items` | **الكل** | معطل | حساس |
| `withdrawals` | **الكل** | معطل | حساس |
| `commissions` | **الكل** | معطل | حساس |
| `shared_products` | **الكل** | معطل | حساس |
| `reviews` | **الكل** | معطل | متوسط |
| `transactions` | **الكل** | معطل | حساس |
| `follows` | **الكل** | معطل | متوسط |
| `likes` (product_likes) | **الكل** | غير مفعّل | منخفض |
| `comments` (product_comments) | **الكل** | غير مفعّل | منخفض |
| `notifications` | **الكل** | غير مفعّل | متوسط |
| `platform_settings` | **الكل** | معطل | حساس (إعدادات) |
| `admin_product_messages` | **الكل** (جدول من migration بدون RLS) | غير مفعّل | متوسط |

**ملخص:**  
- **Anon / Authenticated / Service Role:** حالياً لديهم صلاحية كاملة على كل الجداول بسبب `GRANT ALL ON ALL TABLES ... TO anon, authenticated, service_role` و RLS المعطّل.  
- **الواقع في التطبيق:** الفرونت إند **لا يصل** لأي جدول (يستخدم فقط Storage بمفتاح Anon). الباك إند يصل ب**Service Role** فقط، لذا تفعيل RLS مع سياسات صحيحة **لن يكسر** الإنتاج.

---

## 2. جدول التحليل لكل جدول

| table_name | current_access | recommended_action | risk_level | migration_steps |
|------------|----------------|-------------------|------------|------------------|
| **platform_settings** | anon, auth, service_role كلهم ALL | تفعيل RLS + سياسة للقراءة فقط لـ anon (إن لزم)، والكتابة لـ service_role فقط | متوسط | 1) ENABLE RLS 2) سياسة SELECT لـ service_role (وإن شئت anon للقراءة) 3) سياسة UPDATE/INSERT لـ service_role فقط 4) اختبار الباك إند |
| **notifications** | كلهم ALL | تفعيل RLS + سياسات: المستخدم يرى إشعاراته فقط؛ الباك إند (service_role) يقرأ/يكتب الكل | متوسط | 1) ENABLE RLS 2) SELECT WHERE user_id = auth.uid() للـ authenticated 3) سياسة كاملة لـ service_role 4) اختبار الإشعارات |
| **reviews** | كلهم ALL | تفعيل RLS: قراءة عامة، إدراج/تحديث حسب المنتج والمستخدم | متوسط | 1) ENABLE RLS 2) SELECT للجميع 3) INSERT/UPDATE للمالك أو service_role 4) اختبار عرض التقييمات |
| **product_likes** | كلهم ALL | تفعيل RLS: مثل/إلغاء للمستخدم الحالي فقط | منخفض | 1) ENABLE RLS 2) سياسات حسب user_id 3) اختبار الإعجابات |
| **product_comments** | كلهم ALL | تفعيل RLS: إدراج/تحديث للمستخدم الحالي | منخفض | 1) ENABLE RLS 2) سياسات حسب user_id 3) اختبار التعليقات |
| **admin_product_messages** | كلهم ALL | تفعيل RLS: قراءة/كتابة للأدمن والمرسل/المستقبل فقط أو service_role | متوسط | 1) ENABLE RLS 2) سياسات محددة 3) اختبار لوحة الأدمن |
| **follows** | كلهم ALL | تفعيل RLS: إدارة المتابعة حسب follower_id | متوسط | 1) ENABLE RLS 2) سياسات للمتابَع والمتابِع 3) اختبار المتابعة |
| **shared_products** | كلهم ALL | تفعيل RLS: قراءة عامة، كتابة للوسيط صاحب السجل أو service_role | متوسط | 1) ENABLE RLS 2) SELECT عام 3) INSERT/UPDATE/DELETE لـ broker_id = auth.uid() أو service_role 4) اختبار مشاركة المنتجات |
| **cart_items** | كلهم ALL | تفعيل RLS: كل عمليات السلة مربوطة بـ cart → user؛ سياسة بحيث المستخدم يصل لسلة نفسه فقط | عالي | 1) ENABLE RLS على carts أولاً 2) ENABLE RLS على cart_items 3) سياسات عبر cart.user_id 4) اختبار السلة والدفع |
| **carts** | كلهم ALL | تفعيل RLS: المستخدم يصل لسلة user_id = auth.uid() فقط؛ الباك إند service_role يصل الكل | عالي | 1) ENABLE RLS 2) سياسات حسب user_id 3) اختبار إنشاء سلة وإضافة عناصر |
| **order_profits** | كلهم ALL | تفعيل RLS: قراءة/كتابة للباك إند فقط (service_role)؛ لا وصول لـ anon/authenticated إن أمكن | عالي | 1) ENABLE RLS 2) سياسة واحدة: استخدام service_role فقط 3) اختبار تسجيل الأرباح بعد الدفع |
| **transactions** | كلهم ALL | تفعيل RLS: قراءة محدودة (مثلاً التاجر لمعاملاته)، كتابة للباك إند فقط | عالي | 1) ENABLE RLS 2) سياسات للقراءة حسب الدور 3) INSERT/UPDATE لـ service_role 4) اختبار التقارير والدفعات |
| **order_items** | كلهم ALL | تفعيل RLS: مرتبط بـ orders؛ قراءة حسب صلاحية الطلب، كتابة للباك إند فقط | عالي | 1) تفعيل RLS على orders أولاً 2) ENABLE RLS على order_items 3) سياسات عبر order_id 4) اختبار الطلبات والدفع |
| **orders** | كلهم ALL | تفعيل RLS: العميل يرى طلباته، التاجر طلباته، الأدمن الكل؛ الكتابة من الباك إند | عالي | 1) ENABLE RLS 2) SELECT WHERE customer_id = auth.uid() OR merchant_id = auth.uid() أو role أدمن 3) INSERT/UPDATE لـ service_role 4) اختبار قوائم الطلبات والدفع |
| **products** | كلهم ALL | تفعيل RLS: قراءة عامة للمنتجات النشطة، تحديث/حذف للتاجر صاحب المنتج أو service_role | عالي | 1) ENABLE RLS 2) SELECT للجميع (أو حسب status) 3) UPDATE/DELETE لـ merchant_id = auth.uid() أو service_role 4) اختبار CRUD المنتجات |
| **withdrawals** | كلهم ALL | تفعيل RLS: المستخدم يرى طلبات سحبه فقط؛ التحديث (موافقة/رفض) للأدمن أو service_role | عالي | 1) ENABLE RLS 2) SELECT WHERE user_id = auth.uid() 3) UPDATE للـ service_role 4) اختبار طلبات السحب |
| **commissions** | كلهم ALL | تفعيل RLS: الوسيط يرى عمولاته؛ التحديث للباك إند فقط | عالي | 1) ENABLE RLS 2) SELECT WHERE broker_id = auth.uid() 3) INSERT/UPDATE لـ service_role 4) اختبار لوحة الوسيط |
| **merchant_profiles** | كلهم ALL | تفعيل RLS: قراءة عامة أو حسب الحاجة، تحديث لصاحب الملف أو service_role | عالي | 1) ENABLE RLS 2) SELECT حسب الحاجة 3) UPDATE WHERE user_id = auth.uid() أو service_role 4) اختبار الملف الشخصي للتاجر |
| **users** | كلهم ALL | تفعيل RLS: أخطر جدول؛ قراءة محدودة (مثلاً بيانات عامة)، تحديث كلمة المرور والتحقق للمستخدم نفسه أو service_role | حرج | 1) توثيق كل استخدامات users في الباك إند 2) ENABLE RLS 3) سياسات دقيقة (تسجيل دخول، تحديث حالة، إلخ) 4) اختبار تسجيل الدخول والتسجيل وتحديث الملف |
| **otp_codes** | كلهم ALL | تفعيل RLS: استخدام من الباك إند فقط (service_role)؛ منع وصول anon/authenticated للجدول | حرج | 1) ENABLE RLS 2) سياسة واحدة: service_role فقط 3) اختبار استعادة كلمة المرور والتحقق |

---

## 3. المخاطر المحتملة عند التعديل

| نوع التعديل | المخاطر | التخفيف |
|-------------|---------|----------|
| **تفعيل RLS بدون سياسات** | رفض كل الطلبات من anon/authenticated؛ طلبات الباك إند (service_role) تبقى تعمل | تفعيل RLS جدول بجدول مع إضافة سياسة لـ service_role فوراً (BYPASSRLS) أو سياسات صريحة |
| **تغيير GRANT** | سحب صلاحية من anon/authenticated قد يكسر وصولاً مستقبلاً من الفرونت إند إن وُجد | عدم الاعتماد على anon للجداول؛ الإنتاج يعتمد على الباك إند (service_role) فقط |
| **تسريب Service Role** | من يملك المفتاح يصل لكل الجداول ويتجاوز RLS | عدم وضع Service Role في الفرونت إند أو في متغيرات VITE_*؛ الاحتفاظ به في متغيرات بيئة الخادم فقط |
| **تعديل بنية الجدول (ALTER)** | إسقاط عمود أو تغيير نوع قد يكسر الباك إند أو الـ API | تشغيل ALTER في migration مع نسخ احتياطي؛ اختبار على staging أولاً |
| **Storage** | تغيير سياسات الـ Storage قد يمنع رفع الصور أو القراءة العامة | الإبقاء على سياسات "Public Access" للقراءة و "Authenticated Upload" للرفع حسب الـ bucket |

---

## 4. خطوات آمنة لتعديل الجداول أو تفعيل RLS (بدون كسر الإنتاج)

1. **قبل أي تغيير**
   - أخذ نسخة احتياطية من قاعدة البيانات (Supabase Dashboard → Database → Backups أو `pg_dump`).
   - التأكد أن كل الوصول لجدول Supabase من التطبيق يتم عبر **الباك إند** وبمفتاح **Service Role** (هذا هو الوضع الحالي).

2. **عند تفعيل RLS لجدول**
   - كتابة السياسات **قبل** أو **مع** تفعيل RLS، بحيث يكون لـ `service_role` على الأقل سياسة تسمح بالعمل الحالي (أو الاعتماد على أن service_role يتجاوز RLS حسب إعداد Supabase).
   - في Supabase، دور `service_role` يتجاوز RLS افتراضياً؛ لذلك تفعيل RLS مع سياسات للـ anon/authenticated فقط **لن يكسر** الباك إند.

3. **ترتيب التطبيق**
   - عدم تغيير كود التطبيق في نفس اللحظة مع تطبيق RLS؛ تطبيق RLS أولاً ثم مراقبة السجلات والأخطاء.

4. **المراقبة**
   - مراقبة سجلات Supabase (Logs → Postgres) وأخطاء الـ API بعد كل جدول؛ الرجوع فوراً (تعطيل RLS على الجدول) إذا ظهرت أخطاء 403 أو PGRST301.

---

## 5. خطة هجرة تدريجية (أي جدول أولاً، أي جدول لاحقاً، ومراقبة الأخطاء)

### المرحلة 0: التحضير (بدون تغيير في DB)
- توثيق كل الجداول والعمليات (قراءة/كتابة) من الباك إند (تم جزئياً في التقرير السابق).
- التأكد أن الفرونت إند لا يستدعي `supabase.from('...')` لأي جدول (تم؛ الاستخدام فقط Storage).

### المرحلة 1: جداول منخفضة الحساسية (أولاً)
| الترتيب | الجدول | الإجراء | كيف تراقب الأخطاء |
|---------|--------|---------|-------------------|
| 1 | **platform_settings** | ENABLE RLS + سياسة SELECT لـ service_role (وإن شئت anon للقراءة)، UPDATE/INSERT لـ service_role فقط | اختبار تحميل إعدادات المنصة من الباك إند؛ مراجعة سجلات Postgres |
| 2 | **product_likes** | ENABLE RLS + سياسات حسب user_id و product_id | اختبار إضافة/إلغاء إعجاب من الواجهة والـ API |
| 3 | **product_comments** | ENABLE RLS + سياسات للمعلق والقراءة | اختبار إضافة تعليق وعرض التعليقات |

### المرحلة 2: جداول متوسطة الحساسية
| الترتيب | الجدول | الإجراء | كيف تراقب الأخطاء |
|---------|--------|---------|-------------------|
| 4 | **notifications** | ENABLE RLS + SELECT WHERE user_id = auth.uid()؛ باقي العمليات لـ service_role | اختبار عرض الإشعارات وإنشاء إشعار من الباك إند |
| 5 | **reviews** | ENABLE RLS + SELECT عام؛ INSERT/UPDATE للمالك أو service_role | اختبار عرض التقييمات وإضافة تقييم |
| 6 | **follows** | ENABLE RLS + سياسات للمتابِع والمتابَع | اختبار متابعة/إلغاء متابعة |
| 7 | **shared_products** | ENABLE RLS + SELECT عام؛ INSERT/UPDATE/DELETE لـ broker أو service_role | اختبار مشاركة منتج وحذف مشاركة |
| 8 | **admin_product_messages** | ENABLE RLS + سياسات للأدمن والمرسل/المستقبل أو service_role | اختبار رسائل الأدمن على المنتجات |

### المرحلة 3: جداول حرجة (السلة، الطلبات، الأرباح، المعاملات)
| الترتيب | الجدول | الإجراء | كيف تراقب الأخطاء |
|---------|--------|---------|-------------------|
| 9 | **order_profits** | ENABLE RLS + سياسة service_role فقط (أو بدون سياسة للـ anon/authenticated) | بعد دفع طلب، التحقق من ظهور صفوف في order_profits؛ مراجعة سجلات profitService |
| 10 | **carts** | ENABLE RLS + SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid() أو service_role | اختبار إضافة سلة، إضافة عنصر، حذف عنصر، الدفع |
| 11 | **cart_items** | ENABLE RLS + سياسات مرتبطة بـ carts (مثلاً عبر cart_id و cart.user_id) أو service_role | نفس اختبارات السلة |
| 12 | **order_items** | ENABLE RLS + سياسات مرتبطة بـ orders (العميل يرى عناصر طلباته، الباك إند يكتب) أو service_role | اختبار إنشاء طلب وعرض تفاصيل الطلب |
| 13 | **orders** | ENABLE RLS + SELECT حسب customer_id / merchant_id / أدمن؛ INSERT/UPDATE لـ service_role | اختبار قائمة الطلبات، تحديث الحالة، الدفع، الشحن |
| 14 | **transactions** | ENABLE RLS + قراءة محدودة حسب الدور؛ كتابة لـ service_role | اختبار تقارير المعاملات والتسوية |

### المرحلة 4: جداول المستخدمين والبيانات الشخصية
| الترتيب | الجدول | الإجراء | كيف تراقب الأخطاء |
|---------|--------|---------|-------------------|
| 15 | **otp_codes** | ENABLE RLS + سياسة service_role فقط | اختبار نسيت كلمة المرور والتحقق من البريد |
| 16 | **withdrawals** | ENABLE RLS + SELECT WHERE user_id = auth.uid()؛ UPDATE لـ service_role | اختبار طلبات السحب من لوحة التاجر والأدمن |
| 17 | **commissions** | ENABLE RLS + SELECT WHERE broker_id = auth.uid()؛ INSERT/UPDATE لـ service_role | اختبار لوحة عمولات الوسيط |
| 18 | **merchant_profiles** | ENABLE RLS + SELECT عام أو محدود؛ UPDATE WHERE user_id = auth.uid() أو service_role | اختبار تحديث بيانات التاجر وعرض الملف |
| 19 | **products** | ENABLE RLS + SELECT عام (أو حسب status)؛ UPDATE/DELETE لـ merchant_id = auth.uid() أو service_role | اختبار إضافة/تعديل/حذف منتج وعرض الكتالوج |
| 20 | **users** | ENABLE RLS + سياسات دقيقة (تسجيل دخول، تحديث حالة، تحقق بريد، كلمة مرور)؛ كل العمليات الحساسة عبر service_role | اختبار تسجيل الدخول، التسجيل، تحديث الملف، استعادة كلمة المرور، لوحة الأدمن |

**مراقبة الأخطاء بشكل موحد:**
- بعد كل جدول: تشغيل سيناريوهات الاختبار اليدوية أو التلقائية (طلبات، دفع، سلة، مستخدمين، إشعارات).
- مراجعة **Supabase Dashboard → Logs → Postgres** لأي أخطاء صلاحيات أو استعلامات مرفوضة.
- في الباك إند: مراقبة أي ردود 500 أو رسائل Supabase مثل `PGRST301` (permission denied).
- إذا ظهر رفض بعد تفعيل RLS: إما إضافة/تعديل السياسة أو الرجوع بـ `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` للجدول حتى المعالجة.

---

## 6. نصائح عامة للأمان

| الموضوع | التوصية |
|---------|----------|
| **مفاتيح env** | عدم رفع `.env` إلى Git؛ استخدام `.env.example` بدون قيم حقيقية؛ في الإنتاج استخدام متغيرات بيئة المنصة (مثل Render/Vercel). |
| **Anon vs Service Role** | الفرونت إند: **Anon** فقط (وحالياً للـ Storage فقط). الباك إند: **Service Role** فقط لجميع جداول Postgres. عدم وضع Service Role في أي كود يعمل في المتصفح أو في متغيرات تبدأ بـ `VITE_`. |
| **Storage access** | الإبقاء على سياسات Storage الحالية: قراءة عامة للـ buckets العامة (مثل products, profiles)، رفع للمصادقين أو عبر الباك إند؛ bucket الفواتير (invoices) غير عام والوصول عبر service_role أو سياسة محددة. |
| **تعديل الجداول (ALTER)** | إضافة أعمدة بـ `ADD COLUMN IF NOT EXISTS` آمنة أكثر؛ تغيير نوع أو حذف عمود يتطلب نسخة احتياطية واختبار على staging. |
| **نسخ احتياطي** | قبل أي هجرة RLS أو تغيير GRANT: أخذ backup من Supabase أو `pg_dump`؛ معرفة نقطة الرجوع عند الحاجة. |

---

## 7. تحذيرات لأي تغييرات قد تؤثر على الإنتاج

1. **تفعيل RLS دون سياسة لـ service_role (أو الاعتماد على تجاوز RLS):** في Supabase، service_role يتجاوز RLS؛ لذلك لن يكسر الباك إند. لكن أي عميل يستخدم **anon** أو **authenticated** للوصول المباشر لجدول سيفشل بعد تفعيل RLS ما لم تُضف له سياسة. **في هذا المشروع:** لا وصول جدول من الفرونت إند، لذا الخطر على الإنتاج منخفض عند اتباع الخطة أعلاه.

2. **سحب GRANT من anon/authenticated:** إذا أزلت `GRANT ALL ... TO anon, authenticated` دون تفعيل RLS، لن يتأثر الباك إند (يعمل بـ service_role). لكن إن كان أي أداة أو مستقبلاً واجهة تستخدم anon للمباشرة بالجدول فستتوقف. التوصية: الاعتماد على RLS للتحكم بالوصول بدلاً من إزالة الـ GRANT في البداية، ثم تقييد الـ GRANT لاحقاً إن لزم.

3. **تعديل سياسات Storage:** أي تشديد على bucket الـ products أو profiles (مثلاً إلغاء "Public Access") قد يكسر عرض الصور أو رفعها من الواجهة. يُفضّل اختبار السياسات على bucket تجريبي أولاً.

4. **تغيير أعمدة يستخدمها الباك إند:** أي إعادة تسمية عمود أو تغيير نوع في `users`, `orders`, `products`، إلخ، يتطلب تحديث كود الباك إند في نفس النشر أو قبل تشغيل الـ migration؛ وإلا أخطاء SQL أو تحقق من النوع.

5. **جدول users:** أي سياسة RLS خاطئة قد تمنع تسجيل الدخول أو التحقق من كلمة المرور. يجب توثيق كل استعلامات الباك إند على `users` وضمان أن service_role يبقى قادراً على تنفيذها (تجاوز RLS)، أو أن السياسات تسمح بتلك الاستعلامات صراحة.

---

*تم إعداد هذا التحليل دون تعديل أي كود في المشروع؛ وهو للمرجعية والتخطيط فقط.*
