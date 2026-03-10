# Admin view – تبويبات وتهيئة Lazy-load

## الهيكل الحالي والمستهدف

- **الحالي:** `AdminView.tsx` يحتوي كل التبويبات (Users, Orders, Products, Treasury, Platform) في ملف واحد مع تحميل البيانات عند تغيير `activeTab` (products/orders/platform تُحمّل عند أول زيارة للتبويب).
- **المستهدف (بدون كسر الإنتاج):** تقسيم محتوى كل تبويب إلى مكون lazy-load مستقل بحيث يُحمّل chunk التبويب فقط عند اختياره:
  - `AdminUsersTab.tsx` – المستخدمون (قائمة، فلترة، حذف/استرجاع، تغيير حالة).
  - `AdminOrdersTab.tsx` – الطلبات.
  - `AdminProductsTab.tsx` – المنتجات (قائمة، تفعيل/إخفاء، حذف).
  - `AdminTreasuryTab.tsx` – الخزينة (طلبات السحب).
  - `AdminPlatformTab.tsx` – إعدادات المنصة وأرباح العمولة.

## تنفيذ Lazy-load للتبويبات

1. **استخدام السياق:** تم إعداد `AdminViewContext.tsx` لتمرير القيم والمعالجات دون prop drilling. في `AdminView`:
   - احتفظ بكل الـ state والمعالجات كما هي.
   - لف المحتوى بـ `AdminViewProvider` ومرّر القيمة (بما فيها `activeTab` إذا لزم).
   - استبدل محتوى التبويبات بـ:
     - `const AdminUsersTab = lazy(() => import('./admin/AdminUsersTab'));`
     - وهكذا لباقي التبويبات.
   - اعرض التبويب النشط داخل `<Suspense fallback={<TabSkeleton />}>` حسب `activeTab`.

2. **مكونات التبويبات:** كل مكون (مثل `AdminUsersTab`) يصدر `default` ويستخدم `useAdminView()` من السياق لقراءة البيانات والمعالجات، ويُصدَر من ملفه الخاص حتى يُحمّل chunk منفصل عند أول عرض للتبويب.

3. **البيانات:** الإبقاء على تحميل بيانات التبويب عند أول دخول له (مثل `useEffect` يعتمد على `activeTab`) داخل مكون التبويب نفسه أو في الـ parent حسب التصميم الحالي؛ الهدف هو تقليل الـ bundle الأولي وليس تغيير منطق جلب البيانات.

## ملاحظات

- `UserRow` و `ProductRow` معرّفان حالياً داخل `AdminView.tsx`. عند التقسيم يمكن نقلهما إلى ملف مشترك (مثلاً `views/admin/AdminUserRow.tsx` و `AdminProductRow.tsx`) واستيرادهما من مكونات التبويبات.
- التعديلات يجب أن تحافظ على نفس سلوك الواجهة (فلترة، حذف، استرجاع، إعدادات) حتى لا يتأثر المستخدمون الحاليون.
