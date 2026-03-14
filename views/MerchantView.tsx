import React, { useState, useEffect, Suspense, lazy } from 'react';
import { User, Product, Order, PRODUCT_CATEGORIES, CATEGORY_EMOJI } from '../types';
import { marketStore } from '../store';
import { productService } from '../services/productService'; 
import { storageService } from '../services/storageService';
import { FlashLineService, cancelLogestechsShipment } from '../services/flashlineService';
import { createShipmentApi, cancelShipmentApi, getShipmentStatusApi } from '../services/shipmentApi';
import { fetchMerchantOrders, updateOrderInvoice } from '../services/checkoutApi';
import { getMerchantDashboard, type MerchantDashboardResponse } from '../services/merchantDashboardService';
import { translations, getAuthErrorMessage, type Language } from '../translations';
import { Truck, Trash2, Search, LayoutDashboard, DollarSign, Box, XCircle, Receipt, Tag } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { ConfirmModal } from '../components/ConfirmModal';

const MerchantDashboardTab = lazy(() =>
  import('./merchant/MerchantDashboardTab').then((m) => ({ default: m.MerchantDashboardTab }))
);
const MerchantProductsTab = lazy(() =>
  import('./merchant/MerchantProductsTab').then((m) => ({ default: m.MerchantProductsTab }))
);
const MerchantOrdersTab = lazy(() =>
  import('./merchant/MerchantOrdersTab').then((m) => ({ default: m.MerchantOrdersTab }))
);
const MerchantOffersTab = lazy(() =>
  import('./merchant/MerchantOffersTab').then((m) => ({ default: m.default }))
);

interface MerchantViewProps {
  user: User;
  view: string;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (id: string) => void;
}

export const MerchantView: React.FC<MerchantViewProps> = ({ user, view, onViewProduct, onViewProfile }) => {
  const lang: Language =
    typeof document !== 'undefined' &&
    (document.documentElement.lang === 'ar' ||
      document.documentElement.lang === 'en' ||
      document.documentElement.lang === 'he')
      ? (document.documentElement.lang as Language)
      : 'ar';
  const t = translations[lang];
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'offers'>('dashboard');
  const [dashboardData, setDashboardData] = useState<MerchantDashboardResponse | null>(null);

  // Product Form State (Add/Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    description: '',
    shortDescription: '',
    price: 0,
    discount: 0,
    stock: 0,
    category: '',
    sku: '',
    weight: 0,
    dimensions: '',
    tags: [],
    images: [],
    isActive: true,
    condition: 'new',
    is_discount_active: false,
    discount_type: 'PERCENT',
    discount_value: 0,
    discount_ends_at: undefined,
  });
  const [tagsInput, setTagsInput] = useState('');
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderToInvoice, setOrderToInvoice] = useState<Order | null>(null);
  const [invoiceUrlInput, setInvoiceUrlInput] = useState('');
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
  const [orderToCreateShipment, setOrderToCreateShipment] = useState<Order | null>(null);
  const [orderToCancelShipment, setOrderToCancelShipment] = useState<Order | null>(null);

  useEffect(() => {
    if (user.role === 'MERCHANT') {
        refreshData();
    }
  }, [user.id, view]);

  useEffect(() => {
    if (view === 'orders' || view === 'merchant-orders') setActiveTab('orders');
    else if (view === 'merchant_products' || view === 'products') setActiveTab('products');
    else if (view === 'offers' || view === 'merchant-offers') setActiveTab('offers');
    else if (view === 'dashboard' || view === 'merchant-dashboard') setActiveTab('dashboard');
  }, [view]);

  const refreshData = async () => {
    try {
      setLoading(true);
      const myProducts = await productService.getByMerchantId(user.id);
      setProducts(myProducts);

      try {
        const res = await fetchMerchantOrders();
        if (res.success && Array.isArray(res.orders)) {
          const mapped: Order[] = res.orders.map((row: any) => ({
            id: row.id,
            merchant_id: row.merchant_id,
            merchantId: row.merchant_id,
            customer_id: row.customer_id,
            customerId: row.customer_id,
            totalAmount: row.total_amount ?? row.amount,
            total_price_ils: row.total_amount ?? row.amount,
            status: row.status || 'PENDING',
            delivery_id: row.delivery_id,
            shipmentId: row.delivery_id,
            delivery_status: row.delivery_status,
            shipping_name: row.shipping_name,
            shipping_phone: row.shipping_phone,
            shipping_address: row.shipping_address,
            payment_method: row.payment_method,
            invoice_uploaded: !!row.invoice_uploaded,
            invoice_file_url: row.invoice_file_url,
            shippingAddress: {
              cityName: row.shipping_address || row.city || '—',
              addressDetails: row.shipping_address || '',
              phone: row.shipping_phone,
            },
            date: row.created_at,
            items: row.order_items || [],
          }));
          setOrders(mapped);
        } else {
          const fallback = marketStore.getOrders().filter((o) => o.merchantId === user.id || o.merchant_id === user.id);
          setOrders(fallback);
        }
      } catch (_) {
        const fallback = marketStore.getOrders().filter((o) => o.merchantId === user.id || o.merchant_id === user.id);
        setOrders(fallback);
      }

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
    setProductForm({
      name: '',
      description: '',
      shortDescription: '',
      price: 0,
      discount: 0,
      stock: 0,
      category: '',
      sku: '',
      weight: 0,
      dimensions: '',
      isActive: true,
      images: [],
      condition: 'new',
      is_discount_active: false,
      discount_type: 'PERCENT',
      discount_value: 0,
      discount_ends_at: undefined,
    });
    setTagsInput('');
    setUploadQueue([]);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditClick = async (product: Product) => {
    setEditingId(product.id);
    setIsEditing(true);
    // جلب أحدث بيانات المنتج من الـ API (بما فيها الخصم) لضمان ظهورها في النموذج
    try {
      const fresh = await productService.fetchById(product.id, true);
      const p = fresh ?? product;
      setProductForm({
        ...p,
        price: p.price ?? p.price_ils,
        images: p.images && p.images.length > 0 ? p.images : p.imageUrl ? [p.imageUrl] : [],
        condition: p.condition || 'new',
        is_discount_active: Boolean(p.is_discount_active),
        discount_type: p.discount_type || 'PERCENT',
        discount_value: p.discount_value ?? undefined,
        discount_ends_at: p.discount_ends_at ?? undefined,
      });
      setTagsInput(p.tags ? p.tags.join(', ') : '');
    } catch {
      setProductForm({
        ...product,
        price: product.price || product.price_ils,
        images: product.images && product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [],
        condition: product.condition || 'new',
        is_discount_active: Boolean(product.is_discount_active),
        discount_type: product.discount_type || 'PERCENT',
        discount_value: product.discount_value ?? undefined,
        discount_ends_at: product.discount_ends_at ?? undefined,
      });
      setTagsInput(product.tags ? product.tags.join(', ') : '');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveImage = (index: number) => {
    setProductForm((prev) => {
        const newImages = [...(prev.images || [])];
        newImages.splice(index, 1);
        return { ...prev, images: newImages };
    });
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(productForm.price);
    const stock = Number(productForm.stock);
    if (Number.isFinite(price) && price < 0) {
      showToast(lang === 'ar' ? 'السعر يجب أن يكون موجباً أو صفراً.' : 'Price must be zero or positive.', 'error');
      return;
    }
    if (Number.isFinite(stock) && stock < 0) {
      showToast(lang === 'ar' ? 'الكمية يجب أن تكون موجبة أو صفراً.' : 'Stock must be zero or positive.', 'error');
      return;
    }
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
            showToast(
              msg ||
                (lang === 'ar'
                  ? 'تعذر رفع الصورة، سيتم حفظ المنتج بدونها.'
                  : lang === 'he'
                    ? 'ההעלאה נכשלה; המוצר יישמר בלי תמונה.'
                    : 'Failed to upload image; product will be saved without it.'),
              'error'
            );
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

      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '');
      
      const payload = {
        ...productForm,
        tags,
        images: uploadedUrls,
        image_url: uploadedUrls[0],
        imageUrl: uploadedUrls[0],
        price_ils: Math.max(0, Number(productForm.price) || 0),
        stock: Math.max(0, Number(productForm.stock) || 0),
        condition: productForm.condition || 'new',
        is_discount_active: Boolean(productForm.is_discount_active),
        discount_type: productForm.is_discount_active ? (productForm.discount_type || 'PERCENT') : undefined,
        discount_value: productForm.is_discount_active && Number(productForm.discount_value) > 0 ? Number(productForm.discount_value) : undefined,
        discount_ends_at: productForm.discount_ends_at || undefined,
      };

      if (isEditing && editingId) {
        // Update
        const res = await productService.update(editingId, payload);
        if (res.success) {
          showToast(lang === 'ar' ? 'تم تحديث المنتج' : lang === 'he' ? 'המוצר עודכן' : 'Product updated', 'success');
          if (res.data) {
            setProducts((prev) =>
              prev.map((p) => (p.id === editingId ? { ...p, ...res.data } : p))
            );
          }
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
        setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
        showToast(
          lang === 'ar' ? 'تم حذف المنتج بنجاح' : lang === 'he' ? 'המוצר נמחק בהצלחה' : 'Product deleted successfully',
          'success'
        );
        setProductToDelete(null);
      } else {
        const errMsg =
          getAuthErrorMessage(res.error || '', lang) ||
          (lang === 'ar' ? 'فشل الحذف' : lang === 'he' ? 'המחיקה נכשלה' : 'Delete failed');
        showToast(errMsg, 'error');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = !product.isActive;
    if (!newStatus) {
      setProductToDeactivate(product);
      return;
    }
    const res = await productService.update(product.id, { isActive: newStatus });
    if (res.success) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive: newStatus } : p)));
      showToast(
        newStatus
          ? lang === 'ar'
            ? 'تم تفعيل المنتج'
            : lang === 'he'
              ? 'המוצר הופעל'
              : 'Product Activated'
          : lang === 'ar'
            ? 'تم إلغاء تفعيل المنتج'
            : lang === 'he'
              ? 'המוצר בוטל'
              : 'Product Deactivated',
        'success'
      );
    } else {
      const errMsg =
        getAuthErrorMessage(res.error || '', lang) ||
        (lang === 'ar' ? 'فشل التحديث' : lang === 'he' ? 'העדכון נכשל' : 'Update failed');
      showToast(errMsg, 'error');
    }
  };

  const doDeactivateProduct = async () => {
    const product = productToDeactivate;
    if (!product) return;
    setProductToDeactivate(null);
    const res = await productService.update(product.id, { isActive: false });
    if (res.success) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive: false } : p)));
      showToast(
        lang === 'ar' ? 'تم إلغاء تفعيل المنتج' : lang === 'he' ? 'המוצר בוטל' : 'Product Deactivated',
        'success'
      );
    } else {
      const errMsg =
        getAuthErrorMessage(res.error || '', lang) ||
        (lang === 'ar' ? 'فشل التحديث' : lang === 'he' ? 'העדכון נכשל' : 'Update failed');
      showToast(errMsg, 'error');
    }
  };

  const createShipment = (order: Order) => {
    setOrderToCreateShipment(order);
  };

  const doCreateShipment = async () => {
    const order = orderToCreateShipment;
    if (!order) return;
    setOrderToCreateShipment(null);
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
        showToast(getAuthErrorMessage(shipmentRes.error || '', lang) || shipmentRes.error || t.common.error, 'error');
      }
    } catch (e: any) {
      const shipmentRes = await FlashLineService.automateShipmentCreation(order, user);
      if (shipmentRes.success) {
        await marketStore.updateOrderShipment(order.id, shipmentRes);
        refreshData();
        showToast(`${t.merchant.shipmentCreated}: ${shipmentRes.trackingNumber}`, 'success');
      } else {
        const errMsg =
          getAuthErrorMessage(e?.message || shipmentRes.error || '', lang) ||
          e?.message ||
          shipmentRes.error ||
          t.common.error;
        showToast(errMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShipment = (order: Order) => {
    const sid = order.shipmentId || order.delivery_id;
    if (!sid) return;
    setOrderToCancelShipment(order);
  };

  const doCancelShipment = async () => {
    const order = orderToCancelShipment;
    if (!order) return;
    const sid = order.shipmentId || order.delivery_id;
    setOrderToCancelShipment(null);
    if (!sid) return;
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
        const st =
          typeof apiRes.status === 'object' && apiRes.status !== null && 'status' in apiRes.status
            ? (apiRes.status as any).status
            : String(apiRes.status);
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
        showToast(
          lang === 'ar' ? 'تعذر جلب الحالة' : lang === 'he' ? 'לא ניתן לקבל סטטוס' : 'Could not fetch status',
          'warning'
        );
      }
    } catch (e: any) {
      showToast(getAuthErrorMessage(e?.message || '', lang) || e?.message || t.common.error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInvoice = async () => {
    if (!orderToInvoice || !invoiceUrlInput.trim()) return;
    setUploadingInvoice(true);
    try {
      const res = await updateOrderInvoice(orderToInvoice.id, invoiceUrlInput.trim());
      if (res.success) {
        showToast(lang === 'ar' ? 'تم رفع الفاتورة بنجاح' : 'Invoice uploaded successfully', 'success');
        setOrderToInvoice(null);
        setInvoiceUrlInput('');
        refreshData();
      } else {
        showToast((res as any).error || t.common.error, 'error');
      }
    } catch (e: any) {
      showToast(getAuthErrorMessage(e?.message || '', lang) || e?.message || t.common.error, 'error');
    } finally {
      setUploadingInvoice(false);
    }
  };

  const tabFallback = (
    <div className="p-8 text-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto" />
    </div>
  );

  return (
    <>
    <div className="space-y-8 sm:space-y-10 animate-fade-in pb-20 dashboard-page px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      {/* Header — تصميم حديث */}
      <div className="dashboard-header">
        <div className="dashboard-title-wrap">
            <div className="dashboard-title-icon">
              <LayoutDashboard className="w-6 h-6 text-palma-primary" />
            </div>
          <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black text-palma-navy tracking-tight">
                {t.common.dashboard}
              </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">{t.common.manageStore}</p>
          </div>
        </div>
        
        <div className="dashboard-tabs">
          {[
            { id: 'dashboard', label: t.common.dashboard, icon: LayoutDashboard },
            { id: 'products', label: t.common.products, icon: Box },
            { id: 'offers', label: lang === 'ar' ? 'عروض التخفيض' : 'Discount offers', icon: Tag },
            { id: 'orders', label: t.common.orders, icon: Truck },
            ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`dashboard-tab ${activeTab === tab.id ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && (
          <Suspense fallback={tabFallback}>
            <MerchantDashboardTab lang={lang} t={t} dashboardData={dashboardData} orders={orders} products={products} />
          </Suspense>
        )}
        {activeTab === 'offers' && (
          <Suspense fallback={tabFallback}>
            <MerchantOffersTab lang={lang} t={t} products={products} onRefresh={refreshData} />
          </Suspense>
        )}
        {activeTab === 'products' && (
          <Suspense fallback={tabFallback}>
            <MerchantProductsTab
              lang={lang}
              t={t}
              dashboardData={dashboardData}
              products={products}
              productForm={productForm}
              setProductForm={setProductForm}
              loading={loading}
              isEditing={isEditing}
              resetForm={resetForm}
              handleProductSubmit={handleProductSubmit}
              handleRemoveImage={handleRemoveImage}
              uploadQueue={uploadQueue}
              setUploadQueue={setUploadQueue}
              isUploading={isUploading}
              tagsInput={tagsInput}
              setTagsInput={setTagsInput}
              handleEditClick={handleEditClick}
              handleToggleStatus={handleToggleStatus}
              handleDeleteProduct={handleDeleteProduct}
              onViewProduct={onViewProduct}
            />
          </Suspense>
        )}
        {activeTab === 'orders' && (
          <Suspense fallback={tabFallback}>
            <MerchantOrdersTab
              lang={lang}
              t={t}
              orders={orders}
              loading={loading}
              refreshData={refreshData}
              setOrderToInvoice={setOrderToInvoice}
              setInvoiceUrlInput={setInvoiceUrlInput}
              createShipment={createShipment}
              handleCheckStatus={handleCheckStatus}
              handleCancelShipment={handleCancelShipment}
            />
          </Suspense>
                )}
              </div>

      {/* Modal رفع الفاتورة الضريبية */}
      {orderToInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => !uploadingInvoice && (setOrderToInvoice(null), setInvoiceUrlInput(''))}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir={lang === 'en' ? 'ltr' : 'rtl'}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <Receipt className="w-7 h-7 text-amber-600" />
                  </div>
              <div>
                <h3 className="text-lg font-black text-palma-navy">
                  {lang === 'ar' ? 'رفع الفاتورة الضريبية' : 'Upload tax invoice'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                    {lang === 'ar'
                    ? 'أدخل رابط الفاتورة (رابط عام لملف PDF أو صورة).'
                    : 'Enter the invoice link (public URL to PDF or image).'}
                  </p>
                </div>
                  </div>
            <p className="text-slate-600 text-sm mb-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
              {lang === 'ar' ? 'الطلب' : 'Order'} <span className="font-mono font-bold">{orderToInvoice.id}</span>
            </p>
            <label className="block text-xs font-bold text-slate-500 mb-2">
              {lang === 'ar' ? 'رابط الفاتورة' : 'Invoice URL'}
            </label>
            <input
              type="url"
              value={invoiceUrlInput}
              onChange={(e) => setInvoiceUrlInput(e.target.value)}
              placeholder={lang === 'ar' ? 'https://...' : 'https://...'}
              className="w-full py-3 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
            <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                onClick={() => !uploadingInvoice && (setOrderToInvoice(null), setInvoiceUrlInput(''))}
                disabled={uploadingInvoice}
                className="flex-1 min-h-[48px] py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSubmitInvoice}
                disabled={uploadingInvoice || !invoiceUrlInput.trim()}
                className="flex-1 min-h-[48px] py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploadingInvoice
                  ? lang === 'ar'
                    ? 'جاري الرفع...'
                    : 'Uploading...'
                  : lang === 'ar'
                    ? 'رفع الفاتورة'
                    : 'Upload invoice'}
                  </button>
                </div>
          </div>
        </div>
      )}

      {/* مودال تأكيد إلغاء التفعيل — بدل نافذة المتصفح */}
      <ConfirmModal
        isOpen={!!productToDeactivate}
        title={lang === 'ar' ? 'إلغاء تفعيل المنتج' : lang === 'he' ? 'ביטול הפעלת מוצר' : 'Deactivate product'}
        message={
          productToDeactivate
            ? lang === 'ar'
              ? `سيُخفى «${productToDeactivate.name || productToDeactivate.title || productToDeactivate.id}» من المتجر.`
                        : lang === 'he'
                ? `"${productToDeactivate.name || productToDeactivate.title || productToDeactivate.id}" יוסתר מהחנות.`
                : `"${productToDeactivate.name || productToDeactivate.title || productToDeactivate.id}" will be hidden from the store.`
            : ''
        }
        confirmLabel={lang === 'ar' ? 'نعم، إلغاء التفعيل' : lang === 'he' ? 'בטל הפעלה' : 'Yes, deactivate'}
        cancelLabel={t.common.cancel}
        onConfirm={doDeactivateProduct}
        onCancel={() => setProductToDeactivate(null)}
        variant="warning"
      />

      {/* مودال تأكيد إنشاء الشحنة */}
      <ConfirmModal
        isOpen={!!orderToCreateShipment}
        title={lang === 'ar' ? 'إنشاء شحنة' : lang === 'he' ? 'יצירת משלוח' : 'Create shipment'}
        message={t.common.confirmGen}
        confirmLabel={lang === 'ar' ? 'نعم، إنشاء' : lang === 'he' ? 'צור משלוח' : 'Yes, create'}
        cancelLabel={t.common.cancel}
        onConfirm={doCreateShipment}
        onCancel={() => setOrderToCreateShipment(null)}
        variant="primary"
      />

      {/* مودال تأكيد إلغاء الشحنة */}
      <ConfirmModal
        isOpen={!!orderToCancelShipment}
        title={lang === 'ar' ? 'إلغاء الشحنة' : lang === 'he' ? 'ביטול משלוח' : 'Cancel shipment'}
        message={t.common.cancelWarning}
        confirmLabel={lang === 'ar' ? 'نعم، إلغاء الشحنة' : lang === 'he' ? 'בטל משלוח' : 'Yes, cancel'}
        cancelLabel={t.common.cancel}
        onConfirm={doCancelShipment}
        onCancel={() => setOrderToCancelShipment(null)}
        variant="danger"
      />

      {/* Modal تأكيد حذف المنتج */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => !deleting && setProductToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir={lang === 'en' ? 'ltr' : 'rtl'}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-palma-navy">
                  {lang === 'ar' ? 'حذف المنتج' : lang === 'he' ? 'מחיקת מוצר' : 'Delete product'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {lang === 'ar'
                    ? 'لا يمكن التراجع عن هذا الإجراء.'
                    : lang === 'he'
                      ? 'לא ניתן לבטל פעולה זו.'
                      : 'This action cannot be undone.'}
                </p>
              </div>
            </div>
            <p className="text-slate-700 font-medium mb-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-1">
                {lang === 'ar' ? 'المنتج' : lang === 'he' ? 'המוצר' : 'Product'}
              </span>
              «{productToDelete.name}»
            </p>
            <div className="flex gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => !deleting && setProductToDelete(null)}
                disabled={deleting}
                className="flex-1 min-h-[48px] py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={doDeleteProduct}
                disabled={deleting}
                className="flex-1 min-h-[48px] py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition shadow-lg shadow-red-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting
                  ? lang === 'ar'
                    ? 'جاري الحذف...'
                    : lang === 'he'
                      ? 'מוחק...'
                      : 'Deleting...'
                  : lang === 'ar'
                    ? 'حذف'
                    : lang === 'he'
                      ? 'מחק'
                      : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
