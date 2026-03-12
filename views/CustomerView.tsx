import {
  Product,
  User,
  PaymentMethod,
  OrderStatus,
  Order,
  OrderItem,
  CartItem,
  ShipmentType,
  PRODUCT_CATEGORIES,
} from '../types';
import { marketStore, paymentProcessor } from '../store';
import { productService } from '../services/productService';
import { Language, translations, getAuthErrorMessage } from '../translations';
import {
  createShipment,
  prepareShipmentPayload,
  cancelLogestechsShipment,
  getShipmentStatus,
  mapFlashlineStatus,
  getShipmentLabels,
  resolveLocationName,
} from '../services/flashlineService';
import { cancelOrder as cancelOrderApi, fetchMyOrders, getCities as getCitiesApi, getVillages as getVillagesApi } from '../services/checkoutApi';
import type { City as ApiCity, Village as ApiVillage } from '../services/checkoutApi';
import { sendEmail, getShipmentDetailsTemplate } from '../services/emailService';
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { ShippingInputGroup } from '../components/CustomerShared';
import {
  MapPin,
  User as UserIcon,
  Mail,
  Phone,
  FileText,
  Truck,
  ArrowRight,
  ArrowLeft,
  X,
  Building,
  Navigation,
  ShoppingBag,
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const CustomerShopTab = lazy(() => import('./customer/CustomerShopTab').then((m) => ({ default: m.CustomerShopTab })));
const CustomerCartTab = lazy(() => import('./customer/CustomerCartTab').then((m) => ({ default: m.CustomerCartTab })));
const CustomerOrdersTab = lazy(() =>
  import('./customer/CustomerOrdersTab').then((m) => ({ default: m.CustomerOrdersTab }))
);

interface Props {
  lang: Language;
  user: User;
  view: string;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  /** Product id currently being added (for loading state on button) */
  addingToCartProductId?: string | null;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  onRefresh?: () => void;
  onTabChange?: (tab: string) => void;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (profileId: string) => void;
  onProceedToApiCheckout?: (items: CartItem[]) => void;
  /** When true (e.g. for MERCHANT/BROKER), show only shop + cart in a dedicated section with sub-tabs */
  shopOnlySection?: boolean;
}

export const CustomerView: React.FC<Props> = ({
  lang,
  user,
  view,
  cart,
  addToCart,
  addingToCartProductId,
  removeFromCart,
  updateQuantity,
  clearCart,
  onRefresh,
  onTabChange,
  onViewProduct,
  onViewProfile,
  onProceedToApiCheckout,
  shopOnlySection,
}) => {
  const t = translations[lang];
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'orders'>('shop');

  useEffect(() => {
    if (shopOnlySection) {
      if (view === 'cart') setActiveTab('cart');
      else setActiveTab('shop');
    } else {
      if (view === 'orders' || view === 'orders_customer') setActiveTab('orders');
      else if (view === 'cart') setActiveTab('cart');
      else if (view === 'home' || view === 'shop') setActiveTab('shop');
    }
  }, [view, shopOnlySection]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCancelId, setProcessingCancelId] = useState<string | null>(null);
  const [cancelConfirmOrderId, setCancelConfirmOrderId] = useState<string | null>(null);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [trackingDisplay, setTrackingDisplay] = useState<{ orderId: string; status: string } | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'summary'>('form');
  const [showJsonPayload, setShowJsonPayload] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Cities and villages from API
  const [cities, setCities] = useState<ApiCity[]>([]);
  const [villages, setVillages] = useState<ApiVillage[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | undefined>(undefined);

  useEffect(() => {
    getCitiesApi()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setCities(res.data);
      })
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!selectedCityId) {
      setVillages([]);
      return;
    }
    getVillagesApi({ cityId: selectedCityId })
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setVillages(res.data);
        else setVillages([]);
      })
      .catch(() => setVillages([]));
  }, [selectedCityId]);

  const [shippingData, setShippingData] = useState({
    fullName: user.name || '',
    email: user.email || '',
    phone: String(user.phone ?? ''),
    phone2: '',
    address: '',
    paymentMethod: PaymentMethod.COD,
    villageId: undefined as number | undefined,
    cityId: undefined as number | undefined,
    regionId: undefined as number | undefined,
    cityName: '',
    villageName: '',
    shipmentType: 'COD' as ShipmentType,
    notes: '',
  });

  // Effect to set city/village names from API data when selection or lang changes
  useEffect(() => {
    if (shippingData.cityId && cities.length > 0) {
      const city = cities.find((c) => String(c.id) === String(shippingData.cityId));
      if (city) {
        setShippingData((prev) => ({ ...prev, cityName: city.name }));
      }
    }
    if (shippingData.villageId && villages.length > 0) {
      const v = villages.find((vv) => String(vv.id) === String(shippingData.villageId));
      if (v) {
        setShippingData((prev) => ({ ...prev, villageName: v.name }));
      }
    }
  }, [lang, shippingData.cityId, shippingData.villageId, cities, villages]);

  // When checkout modal opens, sync selectedCityId from shippingData so city dropdown shows correct value
  useEffect(() => {
    if (showCheckoutForm && shippingData.cityId != null && shippingData.cityId !== undefined) {
      setSelectedCityId(String(shippingData.cityId));
    }
  }, [showCheckoutForm]);

  const [products, setProducts] = useState<Product[]>(() =>
    marketStore.getProducts().filter((p) => p.isActive !== false)
  );
  const [apiOrders, setApiOrders] = useState<any[]>([]);
  const [selectedCartIds, setSelectedCartIds] = useState<Set<string>>(() => new Set(cart.map((c) => c.id)));
  const [shopSearch, setShopSearch] = useState('');
  const [shopCategoryId, setShopCategoryId] = useState<string>('all');
  const [shopConditionFilter, setShopConditionFilter] = useState<string>('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const categories = PRODUCT_CATEGORIES;
  const productsFetchedRef = useRef(false);

  useEffect(() => {
    if (productsFetchedRef.current) return;
    productsFetchedRef.current = true;
    const load = async () => {
      const all = await productService.getAll();
      setProducts(all.filter((p) => p.isActive !== false));
    };
    load();
  }, []);

  useEffect(() => {
    const ids = new Set(cart.map((c) => c.id));
    setSelectedCartIds((prev) => {
      const kept = new Set([...prev].filter((id) => ids.has(id)));
      ids.forEach((id) => {
        if (!kept.has(id)) kept.add(id);
      });
      return kept;
    });
  }, [cart]);

  const selectedCartItems = useMemo(() => cart.filter((c) => selectedCartIds.has(c.id)), [cart, selectedCartIds]);
  // --- Performance: memoize cart total so it is not recalculated every render ---
  const totalAmount = useMemo(
    () => selectedCartItems.reduce((s, p) => s + (p.price || p.price_ils || 0) * p.quantity, 0),
    [selectedCartItems]
  );
  const myOrders = marketStore.getOrders().filter((o) => o.customer_id === user.id || o.customerId === user.id);
  const displayOrders = useMemo(() => {
    const apiIds = new Set(apiOrders.map((o) => o.id));
    const localOnly = myOrders.filter((o) => !apiIds.has(o.id));
    return [...apiOrders, ...localOnly];
  }, [apiOrders, myOrders]);

  const loadApiOrders = React.useCallback(async () => {
    try {
      const res = await fetchMyOrders();
      if (res.success && Array.isArray(res.orders)) setApiOrders(res.orders);
      else setApiOrders([]);
    } catch (e: any) {
      setApiOrders([]);
      const msg =
        getAuthErrorMessage(e?.message || '', lang) || (lang === 'ar' ? 'فشل تحميل الطلبات' : 'Failed to load orders');
      showToast(msg, 'error');
    }
  }, [lang, showToast]);

  useEffect(() => {
    if (activeTab === 'orders') loadApiOrders();
  }, [activeTab, loadApiOrders]);

  useEffect(() => {
    const handler = () => loadApiOrders();
    window.addEventListener('palma-refresh-orders', handler);
    return () => window.removeEventListener('palma-refresh-orders', handler);
  }, [loadApiOrders]);

  const filteredShopProducts = useMemo<Product[]>(() => {
    let base = products;
    if (shopCategoryId !== 'all') {
      base = base.filter((p) => p.category === shopCategoryId);
    }
    if (shopConditionFilter !== 'all') {
      base = base.filter((p) => (p.condition || 'new') === shopConditionFilter);
    }
    const term = shopSearch.trim().toLowerCase();
    if (term) {
      base = base.filter((p) => p.name.toLowerCase().includes(term) || (p.category || '').toLowerCase().includes(term));
    }
    return base;
  }, [products, shopCategoryId, shopConditionFilter, shopSearch]);

  useEffect(() => {
    if (activeTab === 'orders' && apiOrders.length === 0) {
      const syncStatuses = async () => {
        for (const order of myOrders) {
          if (order.delivery_id && order.delivery_status !== 'CANCELLED' && order.delivery_status !== 'DELIVERED') {
            const status = await getShipmentStatus(order.delivery_id);
            if (status && status !== order.delivery_status) {
              await marketStore.updateLocalOrderStatus(order.id, status);
            }
          }
        }
        if (onRefresh) onRefresh();
      };
      syncStatuses();
    }
  }, [activeTab, apiOrders.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setShippingData((prev) => ({
      ...prev,
      [name]: name === 'phone' || name === 'phone2' ? String(value) : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const cityId = (e.target as HTMLSelectElement).value;
    const city = cities.find((c) => String(c.id) === String(cityId));
    if (city) {
      setSelectedCityId(cityId);
      setShippingData((prev) => ({
        ...prev,
        cityId: city.id as any,
        regionId: city.regionId as any,
        cityName: city.name,
        villageId: undefined,
        villageName: '',
      }));
      setFormErrors((prev) => ({ ...prev, cityId: false }));
    }
  };

  const handleVillageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const vId = (e.target as HTMLSelectElement).value;
    const v = villages.find((vv) => String(vv.id) === String(vId));
    if (v) {
      setShippingData((prev) => ({
        ...prev,
        villageId: v.id as any,
        villageName: v.name,
      }));
      setFormErrors((prev) => ({ ...prev, villageId: false }));
    }
  };

  const previewPayload = useMemo(() => {
    if (selectedCartItems.length === 0 || !shippingData.cityId || !shippingData.villageId) return null;
    const item = selectedCartItems[0];
    const merchantId = item.merchantId || item.merchant_id || '';
    const merchant = marketStore.getUserById(merchantId);
    const mProfile = marketStore.getMerchantProfileByUserId(merchantId);

    return prepareShipmentPayload({
      orderId: 'PREVIEW-ID',
      productName: item.name,
      category: item.category,
      price: item.price || item.price_ils || 0,
      customer: {
        name: shippingData.fullName,
        email: shippingData.email,
        phone: shippingData.phone,
        phone2: shippingData.phone2,
        address: shippingData.address,
        cityId: shippingData.cityId!,
        villageId: shippingData.villageId!,
        regionId: shippingData.regionId!,
        notes: shippingData.notes,
        type: shippingData.shipmentType,
      },
      merchant: {
        name: merchant?.name || 'Palma Merchant',
        businessName: mProfile?.business_name || 'Palma Store',
        phone: mProfile?.phone || '0590000000',
        phone2: '',
        address: mProfile?.city || 'Merchant Hub',
        cityId: 1,
        villageId: 101,
        regionId: 1,
      },
    });
  }, [shippingData, selectedCartItems]);

  const proceedToSummary = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, boolean> = {};
    if (!shippingData.fullName?.trim()) errors.fullName = true;
    if (!shippingData.email?.trim()) errors.email = true;
    if (!shippingData.phone?.trim()) errors.phone = true;
    if (shippingData.cityId == null || shippingData.cityId === undefined) errors.cityId = true;
    if (shippingData.villageId == null || shippingData.villageId === undefined) errors.villageId = true;
    if (!shippingData.address?.trim()) errors.address = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const missing = Object.keys(errors);
      const msg =
        missing.length === 1
          ? lang === 'ar'
            ? `الحقل الناقص: ${missing[0] === 'fullName' ? 'الاسم' : missing[0] === 'email' ? 'البريد' : missing[0] === 'phone' ? 'الهاتف' : missing[0] === 'cityId' ? 'المدينة' : missing[0] === 'villageId' ? 'القرية/المنطقة' : 'العنوان'}`
            : `Missing: ${missing[0]}`
          : lang === 'ar'
            ? 'يرجى إكمال الحقول المطلوبة'
            : 'Please fill required fields';
      showToast(msg, 'error');
      return;
    }
    setCheckoutStep('summary');
  };

  const finalizeCheckout = async () => {
    const total = selectedCartItems.reduce((s, p) => s + (p.price || p.price_ils || 0), 0);
    setIsProcessing(true);

    try {
      const res = await paymentProcessor.processDigitalPayment(shippingData.paymentMethod, total);

      if (res.success) {
        for (const item of selectedCartItems) {
          const orderRes = await marketStore.placeOrder(item.id, user.id, shippingData.paymentMethod, {
            ...shippingData,
            fullName: shippingData.fullName,
            email: shippingData.email,
          });

          if (orderRes.success && orderRes.data) {
            const order = orderRes.data;
            const merchantId = item.merchantId || item.merchant_id || '';
            const merchant = marketStore.getUserById(merchantId);
            const mProfile = marketStore.getMerchantProfileByUserId(merchantId);

            const flPayload = prepareShipmentPayload({
              orderId: order.id,
              productName: item.name,
              category: item.category,
              price: item.price || item.price_ils || 0,
              customer: {
                name: shippingData.fullName,
                email: shippingData.email,
                phone: shippingData.phone,
                phone2: shippingData.phone2,
                address: shippingData.address,
                cityId: shippingData.cityId!,
                villageId: shippingData.villageId!,
                regionId: shippingData.regionId!,
                notes: shippingData.notes,
                type: shippingData.shipmentType,
              },
              merchant: {
                name: merchant?.name || 'Palma Merchant',
                businessName: mProfile?.business_name || 'Palma Store',
                phone: mProfile?.phone || '0590000000',
                phone2: '',
                address: mProfile?.city || 'Merchant Hub',
                cityId: 1,
                villageId: 101,
                regionId: 1,
              },
            });

            const flResponse = await createShipment(flPayload);

            if (flResponse.success) {
              await marketStore.updateOrderShipment(order.id, flResponse);
              await sendEmail({
                to: shippingData.email,
                ...getShipmentDetailsTemplate({
                  customerName: shippingData.fullName,
                  orderId: order.id,
                  shipmentId: flResponse.shipmentId!,
                  barcodeImage: flResponse.barcodeImage!,
                  cod: flPayload.pkg.cod,
                  deliveryDate: flResponse.expectedDeliveryDate!,
                  notes: `Type: ${shippingData.shipmentType}`,
                }),
              });
            } else {
              showToast(flResponse.error || 'Logistics Error', 'error');
              setIsProcessing(false);
              return;
            }
          }
        }

        clearCart();
        if (onRefresh) onRefresh();
        showToast(t.common.success, 'success');
        setShowCheckoutForm(false);
        setCheckoutStep('form');
        setActiveTab('orders');
      }
    } catch (err) {
      showToast(t.common.error, 'error');
    }
    setIsProcessing(false);
  };

  const handlePrintAwb = (orderId: string, shipmentId: string) => {
    showToast(`Printing AWB for ${shipmentId} (Simulated)`, 'info');
  };

  const handleCancelOrderApi = async (orderId: string) => {
    setProcessingCancelId(orderId);
    try {
      const res = await cancelOrderApi(orderId);
      if (res.success) {
        setApiOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o)));
        if (onRefresh) onRefresh();
        showToast(lang === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Order cancelled successfully', 'success');
      } else {
        showToast(getAuthErrorMessage((res as any).error || '', lang) || (res as any).error || t.common.error, 'error');
      }
    } catch (err: any) {
      showToast(getAuthErrorMessage(err?.message || '', lang) || err?.message || t.common.error, 'error');
    } finally {
      setProcessingCancelId(null);
    }
  };

  const handleCheckOrderStatus = async (order: Order) => {
    const deliveryId = order.delivery_id || order.shipmentId;
    if (!deliveryId) {
      showToast(lang === 'ar' ? 'لا يوجد رقم شحنة لهذا الطلب بعد.' : 'No shipment ID for this order yet.', 'info');
      return;
    }
    setCheckingStatusId(order.id);
    setTrackingDisplay(null);
    try {
      const status = await getShipmentStatus(deliveryId);
      if (status) {
        await marketStore.updateLocalOrderStatus(order.id, status);
        const displayStatus = mapFlashlineStatus(status);
        setTrackingDisplay({ orderId: order.id, status: displayStatus });
        showToast(lang === 'ar' ? `حالة الطلب: ${displayStatus}` : `Order status: ${displayStatus}`, 'success');
        loadApiOrders();
        if (onRefresh) onRefresh();
      } else {
        setTrackingDisplay({ orderId: order.id, status: lang === 'ar' ? '—' : '—' });
        showToast(
          lang === 'ar' ? 'تعذر جلب حالة الشحن. حاول لاحقاً.' : 'Could not fetch shipment status. Try again later.',
          'warning'
        );
      }
    } catch (err: any) {
      setTrackingDisplay({ orderId: order.id, status: lang === 'ar' ? 'تعذر جلب الحالة' : 'Could not fetch status' });
      showToast(getAuthErrorMessage(err?.message || '', lang) || err?.message || t.common.error, 'error');
    } finally {
      setCheckingStatusId(null);
    }
  };

  const executeCancellation = async () => {
    if (!orderToCancel || !orderToCancel.delivery_id) return;
    setProcessingCancelId(orderToCancel.id);
    const order = orderToCancel;
    const deliveryId = order.delivery_id;
    setOrderToCancel(null);

    if (!deliveryId) return;

    try {
      const response = await cancelLogestechsShipment(deliveryId, user.email, user.password ?? '');

      if (response.success) {
        await marketStore.updateLocalOrderStatus(order.id, 'CANCELLED');
        if (onRefresh) onRefresh();
        showToast(
          lang === 'ar' ? 'تم إلغاء الشحنة والطلب بنجاح' : 'Shipment and order cancelled successfully',
          'success'
        );
      } else {
        showToast(getAuthErrorMessage(response.error || '', lang) || response.error || t.common.error, 'error');
      }
    } catch (err: any) {
      showToast(getAuthErrorMessage(err?.message || '', lang) || err?.message || t.common.error, 'error');
    } finally {
      setProcessingCancelId(null);
    }
  };

  const handleAddToCart = useCallback(
    (product: Product) => {
      addToCart(product);
      // Toast is shown by App.addToCart on success/error; avoid duplicate "تمت العملية بنجاح"
    },
    [addToCart]
  );

  const handleRemoveFromCart = useCallback(
    (productId: string, productName?: string) => {
      // حذف مباشر بضغطة واحدة + رسالة واضحة للمستخدم
      removeFromCart(productId);
      const name = productName || (lang === 'ar' ? 'المنتج' : 'item');
      showToast(
        lang === 'ar' ? `تمت إزالة "${name}" من السلة.` : `\"${name}\" has been removed from your cart.`,
        'info'
      );
    },
    [lang, removeFromCart, showToast]
  );

  const toggleCartSelection = useCallback((id: string) => {
    setSelectedCartIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllCart = useCallback(() => setSelectedCartIds(new Set(cart.map((c) => c.id))), [cart]);

  const handleCategorySelect = useCallback((category: string) => {
    setShopCategoryId((prev) => (prev === category ? 'all' : category));
  }, []);

  const setShopOrCart = (tab: 'shop' | 'cart') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-20 font-heading dashboard-page px-4 sm:px-6 pt-6">
      <ConfirmModal
        isOpen={!!cancelConfirmOrderId}
        title={lang === 'ar' ? 'إلغاء الطلب' : 'Cancel order'}
        message={
          lang === 'ar'
            ? 'هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.'
            : 'Are you sure you want to cancel this order? This action cannot be undone.'
        }
        confirmLabel={lang === 'ar' ? 'نعم، إلغاء' : 'Yes, cancel'}
        cancelLabel={lang === 'ar' ? 'إبقاء الطلب' : 'Keep order'}
        onConfirm={() => {
          if (cancelConfirmOrderId) {
            handleCancelOrderApi(cancelConfirmOrderId);
            setCancelConfirmOrderId(null);
          }
        }}
        onCancel={() => setCancelConfirmOrderId(null)}
        isLoading={!!cancelConfirmOrderId && processingCancelId === cancelConfirmOrderId}
        variant="danger"
      />
      {/* Shop/Cart/Orders sub-tabs (تظهر لكل الأدوار) */}
      <div className="dashboard-tabs flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShopOrCart('shop')}
          className={`dashboard-tab ${activeTab === 'shop' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
        >
          <ShoppingBag className="w-4 h-4" /> {lang === 'ar' ? 'التسوق' : 'Shop'}
        </button>
        <button
          type="button"
          onClick={() => setShopOrCart('cart')}
          className={`dashboard-tab flex items-center gap-2 ${activeTab === 'cart' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
        >
          {lang === 'ar' ? 'السلة' : 'Cart'}
          {cart.length > 0 && (
            <span className="bg-white/20 text-current text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`dashboard-tab ${activeTab === 'orders' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
        >
          {lang === 'ar' ? 'طلباتي' : 'My orders'}
        </button>
      </div>

      {/* Cancellation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 shadow-inner">
                ⚠️
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {lang === 'ar' ? 'تأكيد إلغاء الشحنة' : 'Confirm Cancellation'}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed text-sm">
                {lang === 'ar'
                  ? `هل أنت متأكد من رغبتك في إلغاء الشحنة رقم (${orderToCancel.delivery_id})؟ لا يمكن التراجع عن هذا الإجراء.`
                  : `Are you sure you want to cancel shipment (${orderToCancel.delivery_id})? This action cannot be undone.`}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={executeCancellation}
                className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-rose-700 active:scale-95 transition-all"
              >
                {lang === 'ar' ? 'تأكيد الإلغاء النهائي' : 'Confirm Final Cancellation'}
              </button>
              <button
                onClick={() => setOrderToCancel(null)}
                className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
              >
                {lang === 'ar' ? 'الاحتفاظ بالطلب' : 'Keep Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutForm && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
          onClick={() => setShowCheckoutForm(false)}
        >
          <div
            className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden min-h-[85vh] sm:min-h-[600px] max-h-[95vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ... (Checkout Form Content stays largely same, just ensuring classes match new styles) */}
            {/* Left Panel */}
            <div className="md:w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col justify-between">
              <div>
                <h3 className="font-heading text-2xl font-black text-palma-navy tracking-tight mb-1">
                  {t.common.checkout}
                </h3>
                <p className="text-xs font-bold text-slate-400 mb-8">
                  {checkoutStep === 'form'
                    ? lang === 'ar'
                      ? 'بيانات الشحن'
                      : 'Shipping Details'
                    : lang === 'ar'
                      ? 'المراجعة والدفع'
                      : 'Review & Pay'}
                </p>
                {/* Steps */}
                <div className="space-y-6">
                  <div
                    className={`flex items-center gap-4 ${checkoutStep === 'form' ? 'opacity-100' : 'opacity-50 grayscale'}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${checkoutStep === 'form' ? 'bg-palma-navy text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}
                    >
                      1
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase">
                        {lang === 'ar' ? 'معلومات الشحن' : 'Shipping Info'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-0.5 h-8 bg-slate-200 ml-5`}></div>
                  <div
                    className={`flex items-center gap-4 ${checkoutStep === 'summary' ? 'opacity-100' : 'opacity-50 grayscale'}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${checkoutStep === 'summary' ? 'bg-palma-primary text-white shadow-soft' : 'bg-slate-200 text-slate-500'}`}
                    >
                      2
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase">
                        {lang === 'ar' ? 'الدفع والتأكيد' : 'Payment & Confirm'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-8 border-t border-slate-200 mt-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">{t.cart.total}</span>
                  <span className="text-xl font-black text-palma-navy">₪{totalAmount}</span>
                </div>
              </div>
            </div>
            {/* Right Panel - extra bottom padding so fixed mobile nav doesn't cover form */}
            <div className="md:w-2/3 p-8 md:p-12 pb-28 sm:pb-12 bg-white relative overflow-y-auto max-h-[80vh] md:max-h-full">
              <button
                onClick={() => setShowCheckoutForm(false)}
                className={`absolute top-6 ${lang === 'en' ? 'right-6' : 'left-6'} p-2 hover:bg-slate-50 rounded-xl transition-colors`}
              >
                <X className="w-6 h-6 text-slate-400 hover:text-red-500" />
              </button>
              {checkoutStep === 'form' ? (
                <form onSubmit={proceedToSummary} className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  {/* ... Inputs ... */}
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-5">
                      <ShippingInputGroup
                        label={t.auth.name}
                        name="fullName"
                        icon={UserIcon}
                        required
                        placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                        value={shippingData.fullName}
                        error={!!formErrors.fullName}
                        onChange={handleInputChange}
                        lang={lang}
                      />
                      <ShippingInputGroup
                        label={t.auth.email}
                        name="email"
                        icon={Mail}
                        type="email"
                        required
                        placeholder="example@mail.com"
                        value={shippingData.email}
                        error={!!formErrors.email}
                        onChange={handleInputChange}
                        lang={lang}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      <ShippingInputGroup
                        label={t.auth.phone}
                        name="phone"
                        icon={Phone}
                        required
                        placeholder="05x-xxxxxxx"
                        value={shippingData.phone}
                        error={!!formErrors.phone}
                        onChange={handleInputChange}
                        lang={lang}
                      />
                      <ShippingInputGroup
                        label={lang === 'en' ? 'Alternative Phone' : 'هاتف بديل'}
                        name="phone2"
                        icon={Phone}
                        placeholder={lang === 'ar' ? 'اختياري' : 'Optional'}
                        value={shippingData.phone2}
                        error={!!formErrors.phone2}
                        onChange={handleInputChange}
                        lang={lang}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-5">
                      <ShippingInputGroup
                        label={lang === 'ar' ? 'المدينة' : 'City'}
                        name="cityId"
                        icon={Building}
                        type="select"
                        required
                        options={
                          <>
                            {cities.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </>
                        }
                        value={selectedCityId ?? ''}
                        error={!!formErrors.cityId}
                        onChange={handleCityChange}
                        lang={lang}
                      />
                      <ShippingInputGroup
                        label={lang === 'ar' ? 'القرية/المنطقة' : 'Area'}
                        name="villageId"
                        icon={Navigation}
                        type="select"
                        required
                        options={
                          <>
                            {villages.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </>
                        }
                        value={shippingData.villageId ?? ''}
                        error={!!formErrors.villageId}
                        onChange={handleVillageChange}
                        lang={lang}
                        disabled={!selectedCityId}
                      />
                    </div>
                    <ShippingInputGroup
                      label={t.checkout.address}
                      name="address"
                      icon={MapPin}
                      required
                      placeholder={
                        lang === 'ar' ? 'اسم الشارع، رقم العمارة، الطابق...' : 'Street name, Building No, Floor...'
                      }
                      value={shippingData.address}
                      error={!!formErrors.address}
                      onChange={handleInputChange}
                      lang={lang}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-5">
                      <ShippingInputGroup
                        label={lang === 'en' ? 'Shipment Mode' : 'نمط الشحن'}
                        name="shipmentType"
                        icon={Truck}
                        type="select"
                        options={
                          <>
                            <option value="COD">COD</option>
                            <option value="REGULAR">Regular</option>
                          </>
                        }
                        value={shippingData.shipmentType}
                        error={!!formErrors.shipmentType}
                        onChange={handleInputChange}
                        lang={lang}
                      />
                      <ShippingInputGroup
                        label={lang === 'en' ? 'Notes' : 'ملاحظات'}
                        name="notes"
                        icon={FileText}
                        placeholder={lang === 'ar' ? 'مثال: الرجاء الاتصال قبل الوصول' : 'e.g. Call before arrival'}
                        value={shippingData.notes}
                        error={!!formErrors.notes}
                        onChange={handleInputChange}
                        lang={lang}
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary px-10 py-4 text-xs uppercase tracking-widest active:scale-[0.98] flex items-center gap-3 group"
                    >
                      {lang === 'ar' ? 'متابعة للدفع' : 'Proceed to Payment'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4 h-full flex flex-col">
                  <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">
                    {lang === 'ar' ? 'تأكيد الطلب' : 'Confirm Order'}
                  </h4>
                  {/* ... Summary Content ... */}
                  <div className="bg-palma-soft rounded-[2rem] p-8 border border-slate-100 flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {lang === 'ar' ? 'المستلم' : 'Recipient'}
                        </p>
                        <p className="font-bold text-slate-800">{shippingData.fullName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {lang === 'ar' ? 'الدفع' : 'Payment'}
                        </p>
                        <p className="font-bold text-slate-800">
                          {shippingData.shipmentType} (₪{totalAmount})
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 mt-auto">
                    <button
                      onClick={finalizeCheckout}
                      disabled={isProcessing}
                      className="btn-primary w-full py-5 text-[11px] uppercase tracking-widest active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70"
                    >
                      {isProcessing ? t.common.processing : lang === 'ar' ? 'تأكيد الطلب' : 'Confirm Order'}
                    </button>
                    <button
                      onClick={() => setCheckoutStep('form')}
                      disabled={isProcessing}
                      className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> {lang === 'ar' ? 'العودة للتعديل' : 'Back to Edit'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shop' && (
        <Suspense fallback={<div className="py-12 text-center text-slate-500 font-medium">{t.common.loading}</div>}>
          <CustomerShopTab
            lang={lang}
            t={t}
            filteredShopProducts={filteredShopProducts}
            shopSearch={shopSearch}
            setShopSearch={setShopSearch}
            shopCategoryId={shopCategoryId}
            shopConditionFilter={shopConditionFilter}
            setShopConditionFilter={setShopConditionFilter}
            categorySearch={categorySearch}
            setCategorySearch={setCategorySearch}
            expandedGroupId={expandedGroupId}
            setExpandedGroupId={setExpandedGroupId}
            showAllGroups={showAllGroups}
            setShowAllGroups={setShowAllGroups}
            onCategorySelect={handleCategorySelect}
            onAddToCart={handleAddToCart}
            addingToCartProductId={addingToCartProductId}
            onViewProduct={onViewProduct}
            onViewProfile={onViewProfile}
          />
        </Suspense>
      )}

      {activeTab === 'cart' && (
        <Suspense fallback={<div className="py-12 text-center text-slate-500 font-medium">{t.common.loading}</div>}>
          <CustomerCartTab
            lang={lang}
            t={t}
            cart={cart}
            selectedCartIds={selectedCartIds}
            selectedCartItems={selectedCartItems}
            totalAmount={totalAmount}
            onToggleSelection={toggleCartSelection}
            onSelectAll={selectAllCart}
            onUpdateQuantity={updateQuantity}
            onRemove={handleRemoveFromCart}
            onProceedToCheckout={onProceedToApiCheckout}
          />
        </Suspense>
      )}

      {activeTab === 'orders' && (
        <Suspense fallback={<div className="py-12 text-center text-slate-500 font-medium">{t.common.loading}</div>}>
          <CustomerOrdersTab
            lang={lang}
            t={t}
            displayOrders={displayOrders}
            apiOrders={apiOrders}
            onRefreshOrders={loadApiOrders}
            processingCancelId={processingCancelId}
            setCancelConfirmOrderId={setCancelConfirmOrderId}
            setOrderToCancel={setOrderToCancel}
            checkingStatusId={checkingStatusId}
            onCheckOrderStatus={handleCheckOrderStatus}
            trackingDisplay={trackingDisplay}
          />
        </Suspense>
      )}
    </div>
  );
};
