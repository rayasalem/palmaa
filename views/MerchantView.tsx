
import React, { useState, useEffect } from 'react';
import { User, Product, Order, PRODUCT_CATEGORIES } from '../types';
import { marketStore } from '../store';
import { productService } from '../services/productService'; 
import { storageService } from '../services/storageService'; // Updated import
import { FlashLineService, cancelLogestechsShipment } from '../services/flashlineService';
import { createShipmentApi, cancelShipmentApi, getShipmentStatusApi } from '../services/shipmentApi';
import { getMerchantDashboard, type MerchantDashboardResponse } from '../services/merchantDashboardService';
import { translations, getAuthErrorMessage, type Language } from '../translations';
import { Package, Truck, Plus, Trash2, Image as ImageIcon, Search, LayoutDashboard, DollarSign, Box, ExternalLink, XCircle, MoreHorizontal, Filter, AlertCircle, Edit, Eye, EyeOff, X, CreditCard, Receipt } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

interface MerchantViewProps {
  user: User;
  view: string;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (id: string) => void;
}

export const MerchantView: React.FC<MerchantViewProps> = ({ user, view, onViewProduct, onViewProfile }) => {
  const lang: Language = (typeof document !== 'undefined' && (document.documentElement.lang === 'ar' || document.documentElement.lang === 'en' || document.documentElement.lang === 'he')) ? document.documentElement.lang as Language : 'ar';
  const t = translations[lang];
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders'>('dashboard');
  const [dashboardData, setDashboardData] = useState<MerchantDashboardResponse | null>(null);

  // Product Form State (Add/Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', description: '', shortDescription: '', price: 0, discount: 0, 
    stock: 0, category: '', sku: '', weight: 0, dimensions: '', tags: [], images: [], isActive: true,
  });
  const [tagsInput, setTagsInput] = useState('');
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user.role === 'MERCHANT') {
        refreshData();
    }
  }, [user.id, view]);

  useEffect(() => {
    if (view === 'orders' || view === 'merchant-orders') setActiveTab('orders');
    else if (view === 'merchant_products' || view === 'products') setActiveTab('products');
    else if (view === 'dashboard' || view === 'merchant-dashboard') setActiveTab('dashboard');
  }, [view]);

  const refreshData = async () => {
    try {
      setLoading(true);
      const myProducts = await productService.getByMerchantId(user.id);
      setProducts(myProducts);

      const allOrders = marketStore.getOrders();
      setOrders(allOrders.filter(o => o.merchantId === user.id || o.merchant_id === user.id));

      try {
        const dash = await getMerchantDashboard();
        setDashboardData(dash);
      } catch {
        setDashboardData(null);
      }
    } catch (e) {
      console.error(e);
      showToast(t.common.error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductForm({ name: '', description: '', shortDescription: '', price: 0, discount: 0, stock: 0, category: '', sku: '', weight: 0, dimensions: '', isActive: true, images: [] });
    setTagsInput('');
    setUploadQueue([]);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditClick = (product: Product) => {
    setProductForm({
      ...product,
      // Ensure numeric values
      price: product.price || product.price_ils,
      // Ensure images array exists
      images: product.images && product.images.length > 0 ? product.images : (product.imageUrl ? [product.imageUrl] : [])
    });
    setTagsInput(product.tags ? product.tags.join(', ') : '');
    setEditingId(product.id);
    setIsEditing(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveImage = (index: number) => {
    setProductForm(prev => {
        const newImages = [...(prev.images || [])];
        newImages.splice(index, 1);
        return { ...prev, images: newImages };
    });
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsUploading(true);

    try {
      let uploadedUrls: string[] = [...(productForm.images || [])];
      
      // Upload new files if any using Storage Service
      if (uploadQueue.length > 0) {
        for (const file of uploadQueue) {
          try {
            // Generate a unique path for the file: merchantId/timestamp_cleanfilename
            const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const url = await storageService.uploadFile(file, 'products', path);
            uploadedUrls.push(url);
          } catch (err: any) {
            let msg = err?.message || '';
            if (typeof msg === 'string') {
              if (msg.includes('File too large')) {
                msg =
                  lang === 'ar'
                    ? 'حجم الصورة كبير جداً (الحد الأقصى 2MB). سيتم حفظ المنتج بدون هذه الصورة، الرجاء اختيار صورة أخرى أصغر لاحقاً.'
                    : lang === 'he'
                    ? 'התמונה גדולה מדי (מקסימום 2MB). המוצר יישמר בלי התמונה; נא לבחור תמונה קטנה יותר.'
                    : 'Image too large (max 2MB). The product will be saved without this image; please choose a smaller one later.';
              } else if (msg.includes('Invalid format')) {
                msg =
                  lang === 'ar'
                    ? 'صيغة الصورة غير مدعومة. سيتم حفظ المنتج بدون هذه الصورة، الرجاء استخدام JPG أو PNG أو WebP.'
                    : lang === 'he'
                    ? 'פורמט תמונה לא נתמך. נא להשתמש ב-JPG, PNG או WebP.'
                    : 'Invalid image format. The product will be saved without this image; please use JPG, PNG, or WebP.';
              }
            }
            showToast(msg || (lang === 'ar' ? 'تعذر رفع الصورة، سيتم حفظ المنتج بدونها.' : lang === 'he' ? 'ההעלאה נכשלה; המוצר יישמר בלי תמונה.' : 'Failed to upload image; product will be saved without it.'), 'error');
          }
        }
      }
      
      // إذا لم تُقبل أي صورة، نستخدم صورة افتراضية ولا نمنع حفظ المنتج
      if (uploadedUrls.length === 0) {
        const placeholder = 'https://placehold.co/600x600?text=No+Image';
        uploadedUrls.push(placeholder);
        showToast(
          lang === 'ar'
            ? 'لم يتم قبول أي صورة، سيتم حفظ المنتج بدون صورة حقيقية. يمكنك تعديل الصورة لاحقاً من لوحة المنتجات.'
            : lang === 'he'
            ? 'לא התקבלה תמונה. המוצר יישמר עם תמונת placeholder; ניתן לעדכן מאוחר יותר.'
            : 'No image was accepted. The product will be saved with a placeholder image; you can update it later.',
          'info'
        );
      }

      const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      
      const payload = {
        ...productForm,
        tags,
        images: uploadedUrls,
        image_url: uploadedUrls[0],
        imageUrl: uploadedUrls[0],
        price_ils: productForm.price, // Ensure DB field mapping
        stock: Number(productForm.stock) // Ensure number
      };

      if (isEditing && editingId) {
        // Update
        const res = await productService.update(editingId, payload);
        if (res.success) {
          showToast(lang === 'ar' ? 'تم تحديث المنتج' : lang === 'he' ? 'המוצר עודכן' : 'Product updated', 'success');
        } else {
          throw new Error(res.error);
        }
      } else {
        // Add
        const res = await productService.add(user.id, payload);
        if (res.success) {
          showToast(t.common.productAdded, 'success');
        } else {
          throw new Error(res.error);
        }
      }

      resetForm();
      await refreshData();
    } catch (error: any) {
      console.error(error);
      let msg = error?.message || t.common.error;

      if (typeof msg === 'string') {
        if (msg.includes('File too large')) {
          msg =
            lang === 'ar'
              ? 'حجم الصورة كبير جداً (الحد الأقصى 2MB). الرجاء اختيار صورة أخرى أصغر.'
              : lang === 'he'
              ? 'התמונה גדולה מדי (מקסימום 2MB). נא לבחור תמונה קטנה יותר.'
              : 'Image too large (max 2MB). Please choose a smaller image.';
        } else if (msg.includes('Invalid format')) {
          msg =
            lang === 'ar'
              ? 'صيغة الصورة غير مدعومة. الرجاء استخدام صورة بصيغة JPG أو PNG أو WebP.'
              : lang === 'he'
              ? 'פורמט לא נתמך. נא להשתמש ב-JPG, PNG או WebP.'
              : 'Invalid image format. Please use JPG, PNG, or WebP.';
        } else {
          msg = getAuthErrorMessage(msg, lang);
        }
      }

      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = (id: string, name?: string) => {
    const displayName = name || (lang === 'ar' ? 'هذا المنتج' : lang === 'he' ? 'המוצר' : 'this product');
    setProductToDelete({ id, name: displayName });
  };

  const doDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const res = await productService.delete(productToDelete.id);
      if (res.success) {
        setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
        showToast(lang === 'ar' ? 'تم حذف المنتج بنجاح' : lang === 'he' ? 'המוצר נמחק בהצלחה' : 'Product deleted successfully', 'success');
        setProductToDelete(null);
      } else {
        const errMsg = getAuthErrorMessage(res.error || '', lang) || (lang === 'ar' ? 'فشل الحذف' : lang === 'he' ? 'המחיקה נכשלה' : 'Delete failed');
        showToast(errMsg, 'error');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = !product.isActive;
    if (!newStatus) {
    const msg = lang === 'ar'
        ? `إلغاء تفعيل "${product.name || product.title || product.id}"؟ سيُخفى المنتج من المتجر.`
        : lang === 'he'
        ? `לבטל "${product.name || product.title || product.id}"? המוצר יוסתר מהחנות.`
        : `Deactivate "${product.name || product.title || product.id}"? The product will be hidden from the store.`;
    if (!window.confirm(msg)) return;
    }
    const res = await productService.update(product.id, { isActive: newStatus });
    if (res.success) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: newStatus } : p));
      showToast(newStatus ? (lang === 'ar' ? 'تم تفعيل المنتج' : lang === 'he' ? 'המוצר הופעל' : 'Product Activated') : (lang === 'ar' ? 'تم إلغاء تفعيل المنتج' : lang === 'he' ? 'המוצר בוטל' : 'Product Deactivated'), 'success');
    } else {
      const errMsg = getAuthErrorMessage(res.error || '', lang) || (lang === 'ar' ? 'فشل التحديث' : lang === 'he' ? 'העדכון נכשל' : 'Update failed');
      showToast(errMsg, 'error');
    }
  };

  const createShipment = async (order: Order) => {
    if (!window.confirm(t.common.confirmGen)) return;
    setLoading(true);
    try {
      const addr = order.shippingAddress;
      const addressLine1 = (addr?.addressDetails || order.shipping_address || '').trim();
      const cityId = addr?.cityId ?? order.destination_city_id ?? 0;
      const villageId = addr?.villageId ?? order.destination_village_id ?? 0;
      const phone = (addr?.phone || order.shipping_phone || '').trim();
      const recipient_name = (order.shipping_name || 'Customer').trim();

      if (addressLine1 && cityId && villageId && phone) {
        const apiRes = await createShipmentApi({
          orderId: order.id,
          addressLine1,
          addressLine2: undefined,
          cityId,
          regionId: addr?.regionId ?? order.destination_region_id,
          villageId,
          recipient_name,
          phone,
          weight: 1,
          cod: order.totalAmount ?? 0,
          quantity: 1,
          senderName: user.name,
          senderPhone: user.phone,
          receiverName: recipient_name,
          receiverPhone: phone,
          notes: `Order ${order.id}`,
          description: 'Order shipment',
        });
        if (apiRes.success && apiRes.shipment) {
          const sid = apiRes.shipment.id || (apiRes.shipment as any).barcode;
          await marketStore.updateOrderShipment(order.id, {
            success: true,
            shipmentId: sid,
            trackingNumber: sid || (apiRes.shipment as any).barcode,
            barcode: (apiRes.shipment as any).barcode,
          });
          refreshData();
          showToast(`${t.merchant.shipmentCreated}: ${sid || ''}`, 'success');
          setLoading(false);
          return;
        }
        if (!apiRes.success) {
          showToast(getAuthErrorMessage(apiRes.error || '', lang) || apiRes.error || t.common.error, 'error');
          setLoading(false);
          return;
        }
      }

      const shipmentRes = await FlashLineService.automateShipmentCreation(order, user);
      if (shipmentRes.success) {
        await marketStore.updateOrderShipment(order.id, shipmentRes);
        refreshData();
        showToast(`${t.merchant.shipmentCreated}: ${shipmentRes.trackingNumber}`, 'success');
      } else {
        showToast(getAuthErrorMessage(shipmentRes.error || '', lang) || (shipmentRes.error || t.common.error), 'error');
      }
    } catch (e: any) {
      const shipmentRes = await FlashLineService.automateShipmentCreation(order, user);
      if (shipmentRes.success) {
        await marketStore.updateOrderShipment(order.id, shipmentRes);
        refreshData();
        showToast(`${t.merchant.shipmentCreated}: ${shipmentRes.trackingNumber}`, 'success');
      } else {
        const errMsg = getAuthErrorMessage(e?.message || shipmentRes.error || '', lang) || e?.message || shipmentRes.error || t.common.error;
        showToast(errMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShipment = async (order: Order) => {
    const sid = order.shipmentId || order.delivery_id;
    if (!sid) return;
    if (!window.confirm(t.common.cancelWarning)) return;
    setLoading(true);
    try {
      const apiRes = await cancelShipmentApi(String(sid));
      if (apiRes.success) {
        order.status = 'CANCELLED';
        order.delivery_status = 'CANCELLED';
        marketStore.saveOrder(order);
        refreshData();
        showToast(t.common.shipmentCancelled, 'success');
        setLoading(false);
        return;
      }
    } catch (_) {}
    try {
      const res = await cancelLogestechsShipment(sid, user.email, 'mock-password');
      if (res.success) {
        order.status = 'CANCELLED';
        order.delivery_status = 'CANCELLED';
        marketStore.saveOrder(order);
        refreshData();
        showToast(t.common.shipmentCancelled, 'success');
      } else {
        showToast(getAuthErrorMessage(res.error || '', lang) || res.error || t.common.error, 'error');
      }
    } catch (e: any) {
      showToast(getAuthErrorMessage(e?.message || '', lang) || e?.message || t.common.error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (order: Order) => {
    const sid = order.shipmentId || order.delivery_id;
    if (!sid) return;
    setLoading(true);
    try {
      const apiRes = await getShipmentStatusApi({ id: String(sid) });
      if (apiRes.success && apiRes.status != null) {
        const st = typeof apiRes.status === 'object' && apiRes.status !== null && 'status' in apiRes.status ? (apiRes.status as any).status : String(apiRes.status);
        order.delivery_status = st;
        const displayStatus = FlashLineService.mapFlashlineStatus(st);
        marketStore.saveOrder(order);
        refreshData();
        showToast(`${t.common.status}: ${displayStatus}`, 'info');
        setLoading(false);
        return;
      }
    } catch (_) {}
    try {
      const status = await FlashLineService.getShipmentStatus(String(sid));
      if (status) {
        order.delivery_status = status;
        const displayStatus = FlashLineService.mapFlashlineStatus(status);
        marketStore.saveOrder(order);
        refreshData();
        showToast(`${t.common.status}: ${displayStatus}`, 'info');
      } else {
        showToast(lang === 'ar' ? 'تعذر جلب الحالة' : lang === 'he' ? 'לא ניתן לקבל סטטוס' : 'Could not fetch status', 'warning');
      }
    } catch (e: any) {
      showToast(getAuthErrorMessage(e?.message || '', lang) || e?.message || t.common.error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-card border border-slate-100 flex flex-col justify-between group hover:shadow-hover transition-all duration-300 relative overflow-hidden h-40">
      <div className="absolute -right-6 -top-6 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform group-hover:scale-110 duration-700">
          <Icon className="w-32 h-32 text-palma-navy" />
      </div>
      <div className="flex justify-between items-start z-10">
        <div className={`p-3 rounded-2xl ${color} text-white shadow-lg`}>
           <Icon className="w-5 h-5" />
        </div>
        {trend && (
           <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-100">
             <span className="text-base leading-none">↗</span> {trend}
           </span>
        )}
      </div>
      <div className="z-10">
        <h3 className="text-[10px] font-bold text-palma-muted uppercase tracking-widest mb-1">{title}</h3>
        <p className="text-3xl font-black text-palma-navy tracking-tight">{value}</p>
      </div>
    </div>
  );

  return (
    <>
    <div className="space-y-10 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-palma-navy tracking-tight mb-1">{t.common.dashboard}</h1>
          <p className="text-xs sm:text-sm font-medium text-palma-muted">{t.common.manageStore}</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          {[
            { id: 'dashboard', label: t.common.dashboard, icon: LayoutDashboard },
            { id: 'orders', label: t.common.orders, icon: Truck },
            { id: 'products', label: t.common.products, icon: Box },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-palma-navy text-white shadow-md' : 'text-slate-500 hover:text-palma-navy hover:bg-slate-50'}`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {dashboardData && !dashboardData.subscription.is_active && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-amber-800">{lang === 'ar' ? 'انتهت فترة الاشتراك' : lang === 'he' ? 'תקופת המנוי הסתיימה' : 'Subscription expired'}</p>
                <p className="text-sm text-amber-700">{lang === 'ar' ? 'يجب تجديد الاشتراك لإضافة منتجات جديدة.' : lang === 'he' ? 'יש לחדש את המנוי כדי להוסיף מוצרים חדשים.' : 'Please renew your subscription to add new products.'}</p>
              </div>
            </div>
          )}
          {dashboardData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title={lang === 'ar' ? 'إجمالي المبيعات' : lang === 'he' ? 'סה"כ מכירות' : 'Total sales'} value={`₪${(dashboardData.stats.total_sales || 0).toLocaleString()}`} icon={DollarSign} color="bg-palma-primary" />
              <StatCard title={t.common.commission} value={`₪${(dashboardData.stats.total_commission || 0).toLocaleString()}`} icon={Receipt} color="bg-blue-600" />
              <StatCard title={lang === 'ar' ? 'خصم ضريبي' : lang === 'he' ? 'קנס מס' : 'Tax penalty'} value={`₪${(dashboardData.stats.total_tax_penalty || 0).toLocaleString()}`} icon={Receipt} color="bg-amber-600" />
              <StatCard title={lang === 'ar' ? 'صافي الأرباح' : lang === 'he' ? 'רווח נקי' : 'Net profit'} value={`₪${(dashboardData.stats.net_profit || 0).toLocaleString()}`} icon={CreditCard} color="bg-emerald-600" />
            </div>
          )}
          {dashboardData?.subscription && (
            <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100">
              <h3 className="text-sm font-black text-palma-navy uppercase tracking-wider mb-3">{lang === 'ar' ? 'حالة الاشتراك' : lang === 'he' ? 'סטטוס מנוי' : 'Subscription status'}</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <span><strong>{lang === 'ar' ? 'النوع:' : lang === 'he' ? 'סוג:' : 'Type:'}</strong> {dashboardData.subscription.subscription_type === 'paid' ? (lang === 'ar' ? 'مدفوع' : lang === 'he' ? 'בתשלום' : 'Paid') : (lang === 'ar' ? 'مجاني' : lang === 'he' ? 'חינם' : 'Free')}</span>
                <span><strong>{t.common.status}:</strong> {dashboardData.subscription.is_active ? t.common.active : (lang === 'ar' ? 'منتهي' : lang === 'he' ? 'פג תוקף' : 'Expired')}</span>
                {dashboardData.subscription.subscription_end_date && (
                  <span><strong>{lang === 'ar' ? 'ينتهي:' : lang === 'he' ? 'מסתיים:' : 'Ends:'}</strong> {new Date(dashboardData.subscription.subscription_end_date).toLocaleDateString()}</span>
                )}
              </div>
              {/* Subscription packages UI – display only, does not change backend subscription logic */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className={`rounded-2xl border p-4 space-y-2 ${dashboardData.subscription.subscription_type === 'free' ? 'border-palma-primary bg-palma-primaryLight/40' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-palma-navy text-xs uppercase tracking-widest">
                      {lang === 'ar' ? 'الخطة المجانية' : lang === 'he' ? 'תכנית חינמית' : 'Free plan'}
                    </h4>
                    {dashboardData.subscription.subscription_type === 'free' && (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {lang === 'ar' ? 'الخطة الحالية' : lang === 'he' ? 'תכנית פעילה' : 'Current plan'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {lang === 'ar'
                      ? 'شهر أول مجاني للتجربة، مع أدوات أساسية لإدارة منتجاتك وطلباتك.'
                      : lang === 'he'
                      ? 'חודש ראשון חינם עם כלים בסיסיים לניהול מוצרים והזמנות.'
                      : 'First month free with basic tools to manage products and orders.'}
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 space-y-2 ${dashboardData.subscription.subscription_type === 'paid' ? 'border-palma-primary bg-white' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-palma-navy text-xs uppercase tracking-widest">
                      {lang === 'ar' ? 'الخطة المدفوعة (قريباً)' : lang === 'he' ? 'מנוי בתשלום (בקרוב)' : 'Paid plan (coming soon)'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {lang === 'ar'
                      ? 'مزايا إضافية مثل ظهور أعلى في نتائج البحث وتقارير متقدمة – سيتم تفعيلها لاحقاً.'
                      : lang === 'he'
                      ? 'יתרונות נוספים כמו חשיפה גבוהה יותר ודוחות מתקדמים – יופעל בהמשך.'
                      : 'Extra benefits such as higher visibility and advanced reports – to be enabled later.'}
                  </p>
                  <button
                    type="button"
                    disabled
                    className="mt-2 inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 cursor-not-allowed"
                  >
                    {lang === 'ar' ? 'قريباً' : lang === 'he' ? 'בקרוב' : 'Coming soon'}
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <StatCard 
               title={t.common.totalRevenue} 
               value={`${orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0).toLocaleString()} ₪`}
               icon={DollarSign}
               color="bg-palma-primary"
               trend="12%"
             />
             <StatCard 
               title={t.common.pendingOrders} 
               value={orders.filter(o => o.status === 'PENDING').length}
               icon={Truck}
               color="bg-blue-600"
             />
             <StatCard 
               title={t.common.totalInventory} 
               value={products.length}
               icon={Package}
               color="bg-purple-600"
             />
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Add/Edit Product Form */}
          <div className="xl:col-span-1">
            {dashboardData && !dashboardData.subscription.is_active && !isEditing && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
                {lang === 'ar' ? 'لا يمكن إضافة منتجات جديدة حتى تجديد الاشتراك.' : lang === 'he' ? 'לא ניתן להוסיף מוצרים עד לחידוש המנוי.' : 'You cannot add new products until you renew your subscription.'}
              </div>
            )}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-card border border-slate-100 max-xl:static xl:sticky xl:top-28 transition-all">
              <div className="flex items-center justify-between gap-4 mb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-palma-navy rounded-xl text-white shadow-lg shadow-soft">
                      {isEditing ? <Edit className="w-5 h-5"/> : <Plus className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-palma-navy leading-none">{isEditing ? (lang === 'ar' ? 'تعديل منتج' : lang === 'he' ? 'עריכת מוצר' : 'Edit Product') : t.common.addProduct}</h3>
                        <p className="text-[10px] text-palma-muted font-bold mt-1 uppercase tracking-wider">{t.common.createListing}</p>
                    </div>
                 </div>
                 {isEditing && (
                   <button onClick={resetForm} className="text-xs text-red-500 font-bold hover:underline">{t.common.cancel}</button>
                 )}
              </div>
              
              <form onSubmit={handleProductSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t.common.productName} *</label>
                  <input required className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm" placeholder="e.g. Premium Cotton Shirt" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t.common.price} *</label>
                    <div className="relative">
                      <input type="number" required className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 pl-10 text-sm font-bold outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: parseFloat(e.target.value)})} />
                      <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">₪</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t.common.stock} *</label>
                    <input type="number" required className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm" value={productForm.stock || ''} onChange={e => setProductForm({...productForm, stock: parseInt(e.target.value)})} />
                  </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t.common.category} *</label>
                   <select 
                     required 
                     className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm appearance-none cursor-pointer" 
                     value={productForm.category} 
                     onChange={e => setProductForm({...productForm, category: e.target.value})}
                   >
                      <option value="" disabled>{t.common.category}...</option>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{t.categories[cat as keyof typeof t.categories] || cat}</option>
                      ))}
                   </select>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t.common.description}</label>
                   <textarea required className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm resize-none" rows={3} value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
                </div>
                
                {/* Image Upload Area – use <label> so tap opens file picker on mobile (no programmatic click()) */}
                <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      {t.product.image} (Max 5) *
                    </span>
                    <p className="text-[10px] text-slate-400 mb-2">
                      {lang === 'ar'
                        ? 'مسموح حتى ٥ صور، كل صورة أقل من ٢ ميجا وبصيغة JPG أو PNG أو WebP.'
                        : lang === 'he'
                        ? 'ניתן להעלות עד 5 תמונות, כל תמונה עד 2MB בפורמט JPG, PNG או WebP.'
                        : 'You can upload up to 5 images, each under 2MB in JPG, PNG, or WebP format.'}
                    </p>
                    <input
                      id="merchant-product-file-upload"
                      type="file"
                      multiple
                      className="sr-only"
                      accept="image/jpeg,image/png,image/webp,image/*"
                      onChange={e => {
                        const files = e.target.files;
                        if (files && files.length > 0) setUploadQueue(Array.from(files).slice(0, 5));
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="merchant-product-file-upload"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 min-h-[120px] sm:min-h-0 text-center hover:bg-slate-50 hover:border-palma-primary/50 active:bg-palma-primaryLight/30 transition cursor-pointer group"
                    >
                       <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-2 text-palma-muted group-hover:bg-white group-hover:text-palma-primary group-hover:shadow-md transition-all">
                         <ImageIcon className="w-5 h-5" />
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 group-hover:text-palma-navy transition-colors">
                         {uploadQueue.length > 0 ? `${uploadQueue.length} ${t.common.filesSelected}` : t.common.uploadHint}
                       </p>
                    </label>
                    {/* Existing Images Preview */}
                    {productForm.images && productForm.images.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                            {productForm.images.map((url, idx) => (
                                <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 relative group shrink-0">
                                    <img src={url} loading="lazy" className="w-full h-full object-cover" />
                                    <button type="button" onClick={(ev) => { ev.preventDefault(); handleRemoveImage(idx); }} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition touch-manipulation" aria-label={lang === 'ar' ? 'حذف الصورة' : 'Remove image'}><X className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button type="submit" disabled={loading || (!isEditing && !!dashboardData && !dashboardData.subscription.is_active)} className="btn-primary w-full py-4 text-xs uppercase tracking-widest active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50">
                   {isUploading ? (
                     <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> {t.common.uploading}</>
                   ) : (
                     <>{isEditing ? t.common.save : t.common.addProduct}</>
                   )}
                </button>
              </form>
            </div>
          </div>

          {/* Product List */}
          <div className="xl:col-span-2">
             <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden flex flex-col h-full">
                <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-palma-soft rounded-lg"><Box className="w-5 h-5 text-palma-navy" /></div>
                    <h3 className="font-bold text-palma-navy text-lg">{t.common.inventory}</h3>
                  </div>
                  <span className="text-[10px] font-black text-palma-primary bg-palma-primary/5 px-3 py-2 rounded-lg border border-palma-primary/10 whitespace-nowrap">{products.length} {t.common.items}</span>
                </div>
                
                {loading && products.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : products.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-60">
                     <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Package className="w-8 h-8 text-slate-300" />
                     </div>
                     <p className="font-bold text-palma-navy text-base mb-1">{t.common.yourInventoryEmpty}</p>
                     <p className="text-xs text-slate-400">{t.common.addFirstProduct}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 overflow-y-auto max-h-[800px] p-2">
                    {products.map(product => (
                      <div key={product.id} className="p-3 sm:p-4 rounded-2xl flex items-center gap-4 sm:gap-6 hover:bg-slate-50 transition-colors group">
                          <div 
                            className={`h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border border-slate-100 shrink-0 relative shadow-sm cursor-pointer ${!product.isActive ? 'grayscale' : ''}`}
                            onClick={() => onViewProduct && onViewProduct(product.id)}
                          >
                            <img src={product.images?.[0] || product.imageUrl || product.image_url || 'https://placehold.co/200x200?text=No+Image'} loading="lazy" className="h-full w-full object-cover" />
                            {!product.isActive && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><EyeOff className="text-white w-6 h-6 drop-shadow-md"/></div>}
                          </div>
                          
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                            <div className="sm:col-span-2">
                              <h4 
                                className="font-bold text-palma-navy text-sm sm:text-base truncate mb-1 cursor-pointer hover:text-palma-primary"
                                onClick={() => onViewProduct && onViewProduct(product.id)}
                              >{product.name}</h4>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{t.categories[product.category as keyof typeof t.categories] || product.category}</p>
                            </div>
                            
                            <div className="flex flex-col sm:items-center">
                               <span className="text-sm sm:text-base font-black text-palma-navy">{product.price || product.price_ils} ₪</span>
                               <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md mt-1 inline-flex ${product.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                 {product.stock > 0 ? `${product.stock} ${t.common.available}` : t.common.outOfStock}
                               </span>
                            </div>

                            <div className="flex justify-end items-center gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              {onViewProduct && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); onViewProduct(product.id); }} className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-2 flex items-center justify-center text-slate-300 hover:text-palma-primary hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-slate-100 touch-manipulation" title={lang === 'ar' ? 'عرض التفاصيل' : lang === 'he' ? 'צפה בפרטים' : 'View details'}>
                                  <ExternalLink className="w-4 h-4 sm:w-4 sm:h-4" />
                                </button>
                              )}
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleStatus(product); }} className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-2 flex items-center justify-center text-slate-300 hover:text-palma-navy hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-slate-100 touch-manipulation" title={product.isActive ? (lang === 'ar' ? 'إلغاء التفعيل' : lang === 'he' ? 'בטל הפעלה' : 'Deactivate') : (lang === 'ar' ? 'تفعيل' : lang === 'he' ? 'הפעל' : 'Activate')}>
                                {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleEditClick(product); }} className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-2 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-slate-100 touch-manipulation" title={t.common.edit}>
                                <Edit className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id, product.name || product.title); }} className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-2 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-slate-100 touch-manipulation" title={t.common.delete}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Orders Tab - remains the same */}
      {activeTab === 'orders' && (
         <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-white">
               <h3 className="font-black text-palma-navy text-lg sm:text-xl">{t.common.recentOrders}</h3>
               <button className="text-[10px] font-bold text-slate-500 hover:text-palma-primary flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-palma-primary/10">
                 <Filter className="w-3.5 h-3.5" /> {t.common.filterViews}
               </button>
            </div>
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 font-bold text-sm">No orders yet.</div>
              ) : (
                  <table className="min-w-full text-left rtl:text-right whitespace-nowrap">
                    <thead className="bg-slate-50/80">
                        <tr>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.orderDetails}</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.customerInfo}</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.amount}</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.status}</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {orders.map(order => (
                          <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <span className="block text-xs font-bold text-palma-navy font-mono mb-0.5">{order.id}</span>
                                <div className="text-[10px] font-medium text-slate-400">{order.date ? new Date(order.date).toLocaleDateString() : 'Just now'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-palma-soft flex items-center justify-center text-xs font-black text-palma-navy border border-slate-100">
                                      {order.shippingAddress?.cityName.charAt(0)}
                                    </div>
                                   <div>
                                      <div className="text-xs font-bold text-palma-navy">{order.shippingAddress?.cityName}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">{order.shipping_phone}</div>
                                   </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-black text-emerald-600">{order.totalAmount} ₪</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    ['SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                    order.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border border-red-100' : 
                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                    {order.status.toLowerCase()}
                                </span>
                                {order.delivery_status && (
                                  <div className="text-[9px] font-bold text-slate-400 mt-1.5 flex items-center gap-1.5">
                                    <Truck className="w-3 h-3 text-palma-primary" />
                                    {FlashLineService.mapFlashlineStatus(order.delivery_status)}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {order.status === 'PENDING' && (
                                      <button onClick={() => createShipment(order)} disabled={loading} className="bg-palma-navy text-white px-3 py-1.5 rounded-lg text-[9px] font-bold hover:bg-palma-primary transition shadow-sm flex items-center gap-1.5">
                                        <Truck className="w-3 h-3" /> {t.common.ship}
                                      </button>
                                  )}
                                  {(order.shipmentId || order.delivery_id) && order.status !== 'CANCELLED' && (
                                    <>
                                      <button onClick={() => handleCheckStatus(order)} disabled={loading} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100 bg-white shadow-sm" title={t.common.checkStatus}>
                                          <Search className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleCancelShipment(order)} disabled={loading} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100 bg-white shadow-sm" title={t.common.cancelShipment}>
                                          <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
              )}
            </div>
         </div>
      )}
    </div>

      {/* Modal تأكيد حذف المنتج */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !deleting && setProductToDelete(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()} dir={lang === 'en' ? 'ltr' : 'rtl'}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-palma-navy">
                  {lang === 'ar' ? 'حذف المنتج' : lang === 'he' ? 'מחיקת מוצר' : 'Delete product'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {lang === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : lang === 'he' ? 'לא ניתן לבטל פעולה זו.' : 'This action cannot be undone.'}
                </p>
              </div>
            </div>
            <p className="text-slate-700 font-medium mb-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-1">{lang === 'ar' ? 'المنتج' : lang === 'he' ? 'המוצר' : 'Product'}</span>
              «{productToDelete.name}»
            </p>
            <div className="flex gap-3 sm:gap-4">
              <button type="button" onClick={() => !deleting && setProductToDelete(null)} disabled={deleting} className="flex-1 min-h-[48px] py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 disabled:opacity-50">
                {t.common.cancel}
              </button>
              <button type="button" onClick={doDeleteProduct} disabled={deleting} className="flex-1 min-h-[48px] py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition shadow-lg shadow-red-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? (lang === 'ar' ? 'جاري الحذف...' : lang === 'he' ? 'מוחק...' : 'Deleting...') : (lang === 'ar' ? 'حذف' : lang === 'he' ? 'מחק' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
