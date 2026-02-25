
import React, { useState, useEffect } from 'react';
import { User, Product, Order, PRODUCT_CATEGORIES } from '../types';
import { marketStore } from '../store';
import { productService } from '../services/productService'; 
import { storageService } from '../services/storageService'; // Updated import
import { FlashLineService, cancelLogestechsShipment } from '../services/flashlineService';
import { getMerchantDashboard, type MerchantDashboardResponse } from '../services/merchantDashboardService';
import { translations } from '../translations';
import { Package, Truck, Plus, Trash2, Image as ImageIcon, Search, LayoutDashboard, DollarSign, Box, ExternalLink, XCircle, MoreHorizontal, Filter, AlertCircle, Edit, Eye, EyeOff, X, CreditCard, Receipt } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

interface MerchantViewProps {
  user: User;
  view: string;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (id: string) => void;
}

export const MerchantView: React.FC<MerchantViewProps> = ({ user, view, onViewProduct, onViewProfile }) => {
  const lang = document.documentElement.dir === 'ltr' ? 'en' : 'ar';
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
                    : 'Image too large (max 2MB). The product will be saved without this image; please choose a smaller one later.';
              } else if (msg.includes('Invalid format')) {
                msg =
                  lang === 'ar'
                    ? 'صيغة الصورة غير مدعومة. سيتم حفظ المنتج بدون هذه الصورة، الرجاء استخدام JPG أو PNG أو WebP.'
                    : 'Invalid image format. The product will be saved without this image; please use JPG, PNG, or WebP.';
              }
            }
            showToast(msg || (lang === 'ar' ? 'تعذر رفع الصورة، سيتم حفظ المنتج بدونها.' : 'Failed to upload image; product will be saved without it.'), 'error');
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
          showToast(lang === 'en' ? 'Product updated' : 'تم تحديث المنتج', 'success');
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
              : 'Image too large (max 2MB). Please choose a smaller image.';
        } else if (msg.includes('Invalid format')) {
          msg =
            lang === 'ar'
              ? 'صيغة الصورة غير مدعومة. الرجاء استخدام صورة بصيغة JPG أو PNG أو WebP.'
              : 'Invalid image format. Please use JPG, PNG, or WebP.';
        } else if (msg.includes('Authentication required') || msg.includes('401')) {
          msg =
            lang === 'ar'
              ? 'انتهت جلسة تسجيل الدخول أو لست مسجلاً كتاجر. الرجاء تسجيل الدخول مرة أخرى ثم إعادة المحاولة.'
              : 'Session expired or you are not logged in as a merchant. Please log in again and try.';
        }
      }

      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (id: string, name?: string) => {
    const productName = name || id;
    const msg = lang === 'en'
      ? `Are you sure you want to delete "${productName}"? This action cannot be undone.`
      : `هل أنت متأكد من حذف "${productName}"؟ لا يمكن التراجع عن هذا الإجراء.`;
    if (!window.confirm(msg)) return;
    const res = await productService.delete(id);
    if (res.success) {
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast(
        lang === 'en' ? 'Product deleted successfully' : 'تم حذف المنتج بنجاح',
        'info'
      );
    } else {
      showToast(
        (lang === 'en' ? 'Delete failed: ' : 'فشل الحذف: ') + (res.error || ''),
        'error'
      );
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = !product.isActive;
    if (!newStatus) {
      const msg = lang === 'en'
        ? `Deactivate "${product.name || product.title || product.id}"? The product will be hidden from the store.`
        : `إلغاء تفعيل "${product.name || product.title || product.id}"؟ سيُخفى المنتج من المتجر.`;
      if (!window.confirm(msg)) return;
    }
    const res = await productService.update(product.id, { isActive: newStatus });
    if (res.success) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: newStatus } : p));
      showToast(newStatus ? (lang === 'en' ? 'Product Activated' : 'تم تفعيل المنتج') : (lang === 'en' ? 'Product Deactivated' : 'تم إلغاء تفعيل المنتج'), 'success');
    } else {
      showToast(lang === 'en' ? 'Update failed' : 'فشل التحديث', 'error');
    }
  };

  // ... (Shipment functions remain unchanged)
  const createShipment = async (order: Order) => {
    if (!window.confirm(t.common.confirmGen)) return;
    setLoading(true);
    try {
      const shipmentRes = await FlashLineService.automateShipmentCreation(order, user);
      if (shipmentRes.success) {
        await marketStore.updateOrderShipment(order.id, shipmentRes);
        refreshData();
        showToast(`${t.merchant.shipmentCreated}: ${shipmentRes.trackingNumber}`, 'success');
      } else {
        showToast('Error: ' + shipmentRes.error, 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShipment = async (order: Order) => {
    if (!order.shipmentId) return;
    if (!window.confirm(t.common.cancelWarning)) return;
    setLoading(true);
    try {
      const res = await cancelLogestechsShipment(order.shipmentId, user.email, "mock-password");
      if (res.success) {
        order.status = 'CANCELLED';
        order.delivery_status = 'CANCELLED';
        marketStore.saveOrder(order);
        refreshData();
        showToast(t.common.shipmentCancelled, 'success');
      } else {
        showToast('Failed: ' + res.error, 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (order: Order) => {
    if (!order.shipmentId) return;
    setLoading(true);
    try {
      const status = await FlashLineService.getShipmentStatus(order.shipmentId);
      if (status) {
        order.delivery_status = status;
        const displayStatus = FlashLineService.mapFlashlineStatus(status);
        marketStore.saveOrder(order);
        refreshData();
        showToast(`${t.common.status}: ${displayStatus}`, 'info');
      } else {
        showToast('Could not fetch status', 'warning');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
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
                <p className="font-bold text-amber-800">{lang === 'ar' ? 'انتهت فترة الاشتراك' : 'Subscription expired'}</p>
                <p className="text-sm text-amber-700">{lang === 'ar' ? 'يجب تجديد الاشتراك لإضافة منتجات جديدة.' : 'Please renew your subscription to add new products.'}</p>
              </div>
            </div>
          )}
          {dashboardData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title={lang === 'ar' ? 'إجمالي المبيعات' : 'Total sales'} value={`₪${(dashboardData.stats.total_sales || 0).toLocaleString()}`} icon={DollarSign} color="bg-palma-primary" />
              <StatCard title={lang === 'ar' ? 'العمولة المخصومة' : 'Commission'} value={`₪${(dashboardData.stats.total_commission || 0).toLocaleString()}`} icon={Receipt} color="bg-blue-600" />
              <StatCard title={lang === 'ar' ? 'خصم ضريبي' : 'Tax penalty'} value={`₪${(dashboardData.stats.total_tax_penalty || 0).toLocaleString()}`} icon={Receipt} color="bg-amber-600" />
              <StatCard title={lang === 'ar' ? 'صافي الأرباح' : 'Net profit'} value={`₪${(dashboardData.stats.net_profit || 0).toLocaleString()}`} icon={CreditCard} color="bg-emerald-600" />
            </div>
          )}
          {dashboardData?.subscription && (
            <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100">
              <h3 className="text-sm font-black text-palma-navy uppercase tracking-wider mb-3">{lang === 'ar' ? 'حالة الاشتراك' : 'Subscription status'}</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <span><strong>{lang === 'ar' ? 'النوع:' : 'Type:'}</strong> {dashboardData.subscription.subscription_type === 'paid' ? (lang === 'ar' ? 'مدفوع' : 'Paid') : (lang === 'ar' ? 'مجاني' : 'Free')}</span>
                <span><strong>{lang === 'ar' ? 'الحالة:' : 'Status:'}</strong> {dashboardData.subscription.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'منتهي' : 'Expired')}</span>
                {dashboardData.subscription.subscription_end_date && (
                  <span><strong>{lang === 'ar' ? 'ينتهي:' : 'Ends:'}</strong> {new Date(dashboardData.subscription.subscription_end_date).toLocaleDateString()}</span>
                )}
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
                {lang === 'ar' ? 'لا يمكن إضافة منتجات جديدة حتى تجديد الاشتراك.' : 'You cannot add new products until you renew your subscription.'}
              </div>
            )}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-card border border-slate-100 sticky top-28 transition-all">
              <div className="flex items-center justify-between gap-4 mb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-palma-navy rounded-xl text-white shadow-lg shadow-palma-navy/20">
                      {isEditing ? <Edit className="w-5 h-5"/> : <Plus className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-palma-navy leading-none">{isEditing ? (lang==='en'?'Edit Product':'تعديل منتج') : t.common.addProduct}</h3>
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
                
                {/* Image Upload Area */}
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      {t.product.image} (Max 5) *
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">
                      {lang === 'ar'
                        ? 'مسموح حتى ٥ صور، كل صورة أقل من ٢ ميجا وبصيغة JPG أو PNG أو WebP.'
                        : 'You can upload up to 5 images, each under 2MB in JPG, PNG, or WebP format.'}
                    </p>
                    <div 
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 hover:border-palma-primary/50 transition cursor-pointer group"
                    >
                       <input id="file-upload" type="file" multiple className="hidden" accept="image/*" onChange={e => { if (e.target.files) setUploadQueue(Array.from(e.target.files)); }} />
                       <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-2 text-palma-muted group-hover:bg-white group-hover:text-palma-primary group-hover:shadow-md transition-all">
                         <ImageIcon className="w-5 h-5" />
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 group-hover:text-palma-navy transition-colors">
                         {uploadQueue.length > 0 ? `${uploadQueue.length} ${t.common.filesSelected}` : t.common.uploadHint}
                       </p>
                    </div>
                    {/* Existing Images Preview */}
                    {productForm.images && productForm.images.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                            {productForm.images.map((url, idx) => (
                                <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 relative group shrink-0">
                                    <img src={url} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button type="submit" disabled={loading || (!isEditing && !!dashboardData && !dashboardData.subscription.is_active)} className="w-full bg-palma-navy text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-palma-navy/20 hover:bg-palma-primary transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50">
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
                            <img src={product.images?.[0] || product.imageUrl || product.image_url || 'https://placehold.co/200x200?text=No+Image'} className="h-full w-full object-cover" />
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

                            <div className="flex justify-end items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              {onViewProduct && (
                                <button onClick={() => onViewProduct(product.id)} className="p-2 text-slate-300 hover:text-palma-primary hover:bg-white rounded-lg transition shadow-sm border border-transparent hover:border-slate-100" title={lang === 'en' ? 'View details' : 'عرض التفاصيل'}>
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => handleToggleStatus(product)} className="p-2 text-slate-300 hover:text-palma-navy hover:bg-white rounded-lg transition shadow-sm border border-transparent hover:border-slate-100" title={product.isActive ? 'Deactivate' : 'Activate'}>
                                {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleEditClick(product)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-white rounded-lg transition shadow-sm border border-transparent hover:border-slate-100" title="Edit">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteProduct(product.id, product.name || product.title)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition shadow-sm border border-transparent hover:border-slate-100" title="Delete">
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
                                  {order.shipmentId && order.status !== 'CANCELLED' && (
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
  );
};
