
import { Product, User, PaymentMethod, OrderStatus, Order, OrderItem, CartItem, ShipmentType } from '../types';
import { marketStore, paymentProcessor } from '../store';
import { productService } from '../services/productService';
import { Language, translations } from '../translations';
import { 
  createShipment, 
  prepareShipmentPayload,
  cancelLogestechsShipment, 
  getShipmentStatus, 
  mapFlashlineStatus,
  getInternalCities,
  getInternalVillages,
  getShipmentLabels,
  resolveLocationName
} from '../services/flashlineService';
import { cancelOrder as cancelOrderApi, fetchMyOrders } from '../services/checkoutApi';
import { sendEmail, getShipmentDetailsTemplate } from '../services/emailService';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  User as UserIcon, 
  Mail, 
  Phone, 
  FileText, 
  Truck, 
  CreditCard, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  X,
  Package,
  Building,
  Navigation,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';

interface Props {
  lang: Language;
  user: User;
  view: string; 
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  onRefresh?: () => void;
  onTabChange?: (tab: string) => void;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (profileId: string) => void;
  onProceedToApiCheckout?: (items: CartItem[]) => void;
}

export const CustomerView: React.FC<Props> = ({ lang, user, view, cart, addToCart, removeFromCart, updateQuantity, clearCart, onRefresh, onTabChange, onViewProduct, onViewProfile, onProceedToApiCheckout }) => {
  const t = translations[lang];
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'orders'>('shop');
  
  useEffect(() => {
    if (view === 'orders' || view === 'orders_customer') setActiveTab('orders');
    else if (view === 'cart') setActiveTab('cart');
    else if (view === 'home' || view === 'shop') setActiveTab('shop');
  }, [view]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCancelId, setProcessingCancelId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'summary'>('form');
  const [showJsonPayload, setShowJsonPayload] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Hierarchical Location State
  const cities = useMemo(() => getInternalCities(), []);
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(undefined);
  const availableVillages = useMemo(() => selectedCityId ? getInternalVillages(selectedCityId) : [], [selectedCityId]);

  const [shippingData, setShippingData] = useState({
    fullName: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    phone2: '',
    address: '',
    paymentMethod: PaymentMethod.COD,
    villageId: undefined as number | undefined,
    cityId: undefined as number | undefined,
    regionId: undefined as number | undefined,
    cityName: '',
    villageName: '',
    shipmentType: 'COD' as ShipmentType,
    notes: ''
  });

  // Effect to update resolved names when language changes (so summary updates)
  useEffect(() => {
    if (shippingData.cityId) {
        setShippingData(prev => ({
            ...prev,
            cityName: resolveLocationName(prev.cityId!, 'city', lang),
            villageName: prev.villageId ? resolveLocationName(prev.villageId, 'village', lang) : ''
        }));
    }
  }, [lang]);

  const [products, setProducts] = useState<Product[]>(() => marketStore.getProducts().filter(p => p.isActive !== false));
  const [apiOrders, setApiOrders] = useState<any[]>([]);
  const [selectedCartIds, setSelectedCartIds] = useState<Set<string>>(() => new Set(cart.map(c => c.id)));

  useEffect(() => {
    const load = async () => {
      const all = await productService.getAll();
      setProducts(all.filter(p => p.isActive !== false));
    };
    load();
  }, []);

  useEffect(() => {
    const ids = new Set(cart.map(c => c.id));
    setSelectedCartIds(prev => {
      const kept = new Set([...prev].filter(id => ids.has(id)));
      ids.forEach(id => { if (!kept.has(id)) kept.add(id); });
      return kept;
    });
  }, [cart]);

  const selectedCartItems = useMemo(() => cart.filter(c => selectedCartIds.has(c.id)), [cart, selectedCartIds]);
  const myOrders = marketStore.getOrders().filter(o => o.customer_id === user.id || o.customerId === user.id);
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
    } catch (_e) {
      setApiOrders([]);
      showToast(lang === 'ar' ? 'فشل تحميل الطلبات' : 'Failed to load orders', 'error');
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
    setShippingData({ ...shippingData, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: false });
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = parseInt(e.target.value);
    const city = cities.find(c => c.id === cityId);
    if (city) {
      setSelectedCityId(cityId);
      setShippingData({
        ...shippingData,
        cityId: city.id,
        regionId: city.regionId,
        cityName: lang === 'en' ? city.nameEn : city.nameAr,
        villageId: undefined, 
        villageName: ''
      });
      setFormErrors({ ...formErrors, cityId: false });
    }
  };

  const handleVillageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = parseInt(e.target.value);
    const v = availableVillages.find(v => v.id === vId);
    if (v) {
      setShippingData({
        ...shippingData,
        villageId: v.id,
        villageName: lang === 'en' ? v.nameEn : v.nameAr
      });
      setFormErrors({ ...formErrors, villageId: false });
    }
  };

  const previewPayload = useMemo(() => {
    if (selectedCartItems.length === 0 || !shippingData.cityId || !shippingData.villageId) return null;
    const item = selectedCartItems[0];
    const merchantId = item.merchantId || item.merchant_id || '';
    const merchant = marketStore.getUserById(merchantId);
    const mProfile = marketStore.getMerchantProfileByUserId(merchantId);
    
    return prepareShipmentPayload({
      orderId: "PREVIEW-ID",
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
        type: shippingData.shipmentType
      },
      merchant: {
        name: merchant?.name || "Palma Merchant",
        businessName: mProfile?.business_name || "Palma Store",
        phone: mProfile?.phone || "0590000000",
        phone2: "",
        address: mProfile?.city || "Merchant Hub",
        cityId: 1, 
        villageId: 101, 
        regionId: 1
      }
    });
  }, [shippingData, selectedCartItems]);

  const proceedToSummary = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, boolean> = {};
    if (!shippingData.fullName) errors.fullName = true;
    if (!shippingData.email) errors.email = true;
    if (!shippingData.phone) errors.phone = true;
    if (!shippingData.cityId) errors.cityId = true;
    if (!shippingData.villageId) errors.villageId = true;
    if (!shippingData.address) errors.address = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast(lang === 'ar' ? 'يرجى إكمال الحقول المطلوبة' : 'Please fill required fields', 'error');
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
                email: shippingData.email
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
                  type: shippingData.shipmentType
                },
                merchant: {
                  name: merchant?.name || "Palma Merchant",
                  businessName: mProfile?.business_name || "Palma Store",
                  phone: mProfile?.phone || "0590000000",
                  phone2: "",
                  address: mProfile?.city || "Merchant Hub",
                  cityId: 1,
                  villageId: 101,
                  regionId: 1
                }
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
                    notes: `Type: ${shippingData.shipmentType}`
                  })
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
        setApiOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
        if (onRefresh) onRefresh();
        showToast(lang === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Order cancelled successfully', 'success');
      } else {
        showToast((res as any).error || t.common.error, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || t.common.error, 'error');
    } finally {
      setProcessingCancelId(null);
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
      const response = await cancelLogestechsShipment(
        deliveryId,
        user.email,
        user.password || 'password' 
      );

      if (response.success) {
        await marketStore.updateLocalOrderStatus(order.id, 'CANCELLED');
        if (onRefresh) onRefresh();
        showToast(lang === 'ar' ? 'تم إلغاء الشحنة والطلب بنجاح' : 'Shipment and order cancelled successfully', 'success');
      } else {
        showToast(response.error || 'API Error', 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.common.error, 'error');
    } finally {
      setProcessingCancelId(null);
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    showToast(t.common.success, 'success');
  };

  const handleRemoveFromCart = (productId: string) => {
    removeFromCart(productId);
    showToast(lang === 'ar' ? 'تمت إزالة المنتج من السلة' : 'Item removed from cart', 'info');
  };

  const totalAmount = selectedCartItems.reduce((s,p) => s + (p.price || p.price_ils || 0) * p.quantity, 0);

  const toggleCartSelection = (id: string) => {
    setSelectedCartIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCart = () => setSelectedCartIds(new Set(cart.map(c => c.id)));

  // Reusable Components for Form
  const InputGroup = ({ label, name, icon: Icon, required = false, type = "text", placeholder, options }: any) => (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-black uppercase text-palma-muted tracking-widest flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        <div className={`absolute top-1/2 -translate-y-1/2 ${lang === 'en' ? 'left-4' : 'right-4'} text-slate-400 group-focus-within:text-palma-primary transition-colors`}>
          <Icon className="w-5 h-5" />
        </div>
        {type === 'select' ? (
          <select 
            name={name} 
            required={required}
            className={`w-full ${lang === 'en' ? 'pl-12 pr-4' : 'pr-12 pl-4'} py-3.5 bg-slate-50 border ${formErrors[name] ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-2xl text-sm font-bold text-palma-navy outline-none focus:bg-white focus:border-palma-primary focus:ring-4 focus:ring-palma-primary/10 transition-all appearance-none cursor-pointer`}
            value={name === 'cityId' ? selectedCityId : shippingData[name as keyof typeof shippingData]}
            onChange={name === 'cityId' ? handleCityChange : name === 'villageId' ? handleVillageChange : handleInputChange}
            disabled={name === 'villageId' && !selectedCityId}
          >
            {options}
          </select>
        ) : (
          <input 
            type={type} 
            name={name} 
            required={required}
            placeholder={placeholder}
            className={`w-full ${lang === 'en' ? 'pl-12 pr-4' : 'pr-12 pl-4'} py-3.5 bg-slate-50 border ${formErrors[name] ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-2xl text-sm font-bold text-palma-navy outline-none focus:bg-white focus:border-palma-primary focus:ring-4 focus:ring-palma-primary/10 transition-all placeholder:text-slate-400`}
            value={shippingData[name as keyof typeof shippingData]}
            onChange={handleInputChange}
          />
        )}
        {type === 'select' && (
           <div className={`absolute top-1/2 -translate-y-1/2 ${lang === 'en' ? 'right-4' : 'left-4'} text-slate-400 pointer-events-none`}>
             <ArrowRight className={`w-4 h-4 rotate-90`} />
           </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* Cancellation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
             <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 shadow-inner">⚠️</div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {lang === 'ar' ? 'تأكيد إلغاء الشحنة' : 'Confirm Cancellation'}
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed text-sm">
                  {lang === 'ar' 
                    ? `هل أنت متأكد من رغبتك في إلغاء الشحنة رقم (${orderToCancel.delivery_id})؟ لا يمكن التراجع عن هذا الإجراء.` 
                    : `Are you sure you want to cancel shipment (${orderToCancel.delivery_id})? This action cannot be undone.`
                  }
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setShowCheckoutForm(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden min-h-[600px] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
             {/* ... (Checkout Form Content stays largely same, just ensuring classes match new styles) */}
             {/* Left Panel */}
             <div className="md:w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col justify-between">
                <div>
                   <h3 className="text-2xl font-black text-palma-navy tracking-tight mb-1">{t.common.checkout}</h3>
                   <p className="text-xs font-bold text-slate-400 mb-8">{checkoutStep === 'form' ? (lang === 'ar' ? 'بيانات الشحن' : 'Shipping Details') : (lang === 'ar' ? 'المراجعة والدفع' : 'Review & Pay')}</p>
                   {/* Steps */}
                   <div className="space-y-6">
                      <div className={`flex items-center gap-4 ${checkoutStep === 'form' ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${checkoutStep === 'form' ? 'bg-palma-navy text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>1</div>
                         <div>
                            <p className="text-xs font-black text-slate-900 uppercase">{lang === 'ar' ? 'معلومات الشحن' : 'Shipping Info'}</p>
                         </div>
                      </div>
                      <div className={`w-0.5 h-8 bg-slate-200 ml-5`}></div>
                      <div className={`flex items-center gap-4 ${checkoutStep === 'summary' ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${checkoutStep === 'summary' ? 'bg-palma-green text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>2</div>
                         <div>
                            <p className="text-xs font-black text-slate-900 uppercase">{lang === 'ar' ? 'الدفع والتأكيد' : 'Payment & Confirm'}</p>
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
             {/* Right Panel */}
             <div className="md:w-2/3 p-8 md:p-12 bg-white relative overflow-y-auto max-h-[80vh] md:max-h-full">
                <button onClick={() => setShowCheckoutForm(false)} className={`absolute top-6 ${lang === 'en' ? 'right-6' : 'left-6'} p-2 hover:bg-slate-50 rounded-xl transition-colors`}>
                   <X className="w-6 h-6 text-slate-400 hover:text-red-500" />
                </button>
                {checkoutStep === 'form' ? (
                   <form onSubmit={proceedToSummary} className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      {/* ... Inputs ... */}
                      <div className="space-y-4">
                         <div className="grid md:grid-cols-2 gap-5">
                            <InputGroup label={t.auth.name} name="fullName" icon={UserIcon} required placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} />
                            <InputGroup label={t.auth.email} name="email" icon={Mail} type="email" required placeholder="example@mail.com" />
                         </div>
                         <div className="grid md:grid-cols-2 gap-5">
                            <InputGroup label={t.auth.phone} name="phone" icon={Phone} required placeholder="05x-xxxxxxx" />
                            <InputGroup label={lang === 'en' ? 'Alternative Phone' : 'هاتف بديل'} name="phone2" icon={Phone} placeholder={lang === 'ar' ? 'اختياري' : 'Optional'} />
                         </div>
                      </div>
                      <div className="space-y-4">
                         <div className="grid md:grid-cols-2 gap-5">
                            <InputGroup label={lang === 'ar' ? 'المدينة' : 'City'} name="cityId" icon={Building} type="select" required options={<>{cities.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.nameAr : c.nameEn}</option>)}</>} />
                            <InputGroup label={lang === 'ar' ? 'القرية/المنطقة' : 'Area'} name="villageId" icon={Navigation} type="select" required options={<>{availableVillages.map(v => <option key={v.id} value={v.id}>{lang === 'ar' ? v.nameAr : v.nameEn}</option>)}</>} />
                         </div>
                         <InputGroup label={t.checkout.address} name="address" icon={MapPin} required placeholder={lang === 'ar' ? 'اسم الشارع، رقم العمارة، الطابق...' : 'Street name, Building No, Floor...'} />
                      </div>
                      <div className="space-y-4">
                         <div className="grid md:grid-cols-2 gap-5">
                            <InputGroup label={lang === 'en' ? 'Shipment Mode' : 'نمط الشحن'} name="shipmentType" icon={Truck} type="select" options={<><option value="COD">COD</option><option value="REGULAR">Regular</option></>} />
                            <InputGroup label={lang === 'en' ? 'Notes' : 'ملاحظات'} name="notes" icon={FileText} placeholder={lang === 'ar' ? 'مثال: الرجاء الاتصال قبل الوصول' : 'e.g. Call before arrival'} />
                         </div>
                      </div>
                      <div className="pt-4 flex justify-end">
                         <button type="submit" className="bg-palma-navy text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-palma-navy/20 hover:bg-palma-primary transition-all active:scale-[0.98] flex items-center gap-3 group">
                            {lang === 'ar' ? 'متابعة للدفع' : 'Proceed to Payment'}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                         </button>
                      </div>
                   </form>
                ) : (
                   <div className="space-y-8 animate-in slide-in-from-right-4 h-full flex flex-col">
                      <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">{lang === 'ar' ? 'تأكيد الطلب' : 'Confirm Order'}</h4>
                      {/* ... Summary Content ... */}
                      <div className="bg-palma-soft rounded-[2rem] p-8 border border-slate-100 flex-1 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lang === 'ar' ? 'المستلم' : 'Recipient'}</p>
                                <p className="font-bold text-slate-800">{shippingData.fullName}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lang === 'ar' ? 'الدفع' : 'Payment'}</p>
                                <p className="font-bold text-slate-800">{shippingData.shipmentType} (₪{totalAmount})</p>
                             </div>
                          </div>
                      </div>
                      <div className="flex flex-col gap-4 mt-auto">
                        <button onClick={finalizeCheckout} disabled={isProcessing} className="w-full py-5 bg-palma-green text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-palma-green/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70">
                            {isProcessing ? t.common.processing : (lang === 'ar' ? 'تأكيد الطلب' : 'Confirm Order')}
                        </button>
                        <button onClick={() => setCheckoutStep('form')} disabled={isProcessing} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-800 transition-colors flex items-center justify-center gap-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {products.map(p => {
            const merchantId = p.merchant_id || p.merchantId || '';
            const merchantName = marketStore.getMerchantNameByUserId(merchantId);
            const displayImage = p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
            return (
              <div key={p.id} className="bg-white rounded-3xl p-4 border border-slate-100 group shadow-card hover:shadow-hover transition-all duration-300 flex flex-col hover:-translate-y-1">
                 <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-50 mb-4 relative cursor-pointer" onClick={() => onViewProduct && onViewProduct(p.id)}>
                    <img src={displayImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={p.name} />
                    <div className={`absolute top-3 ${lang === 'en' ? 'right-3' : 'left-3'} bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-black shadow-sm text-palma-navy border border-slate-100`}>₪{p.price || p.price_ils}</div>
                  </div>
                  <div className="px-1 space-y-3 flex-1 flex flex-col">
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (merchantId && onViewProfile) onViewProfile(merchantId); }}
                        className="text-[9px] font-black text-palma-muted uppercase tracking-widest mb-1 block text-left hover:text-palma-primary hover:underline transition-colors"
                      >
                        {merchantName || (lang === 'ar' ? 'التاجر' : 'Merchant')}
                      </button>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 cursor-pointer" onClick={() => onViewProduct && onViewProduct(p.id)}>{p.name}</h4>
                    </div>
                    <button onClick={() => handleAddToCart(p)} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-palma-green transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                       <ShoppingBag className="w-3.5 h-3.5" /> {t.product.addToCart}
                    </button>
                  </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'cart' && (
        <div className="max-w-4xl mx-auto space-y-8">
           <h2 className="text-2xl font-black text-palma-navy tracking-tight">{t.cart.title}</h2>
           {cart.length === 0 ? (
             <div className="bg-white p-20 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100">
                <span className="text-5xl block mb-6 grayscale opacity-50">🛒</span>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{t.cart.empty}</p>
             </div>
           ) : (
             <div className="space-y-8">
                <div className="space-y-4">
                   {cart.length > 1 && (
                     <div className="flex items-center justify-between mb-4">
                       <button type="button" onClick={selectAllCart} className="text-xs font-bold text-palma-primary hover:underline">
                         {lang === 'ar' ? 'تحديد الكل' : 'Select all'}
                       </button>
                       <span className="text-[10px] font-bold text-slate-500">
                         {selectedCartItems.length} / {cart.length} {lang === 'ar' ? 'محدد' : 'selected'}
                       </span>
                     </div>
                   )}
                   {cart.map((item, idx) => (
                     <div key={idx} className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex items-center gap-4 sm:gap-6 group hover:border-palma-primary/20 transition-all">
                        {cart.length > 1 ? (
                          <input type="checkbox" checked={selectedCartIds.has(item.id)} onChange={() => toggleCartSelection(item.id)} className="w-5 h-5 rounded border-slate-300 text-palma-primary focus:ring-palma-primary shrink-0" />
                        ) : null}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                          <img src={item.images?.[0] || item.imageUrl || item.image_url || 'https://placehold.co/200x200?text=No+Image'} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1 truncate">{item.name}</h4>
                           <p className="text-[10px] font-black text-palma-muted uppercase tracking-widest mb-3">{item.category}</p>
                           <div className="flex items-center gap-4">
                              <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100">
                                <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="text-xs font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"><Plus className="w-3.5 h-3.5" /></button>
                              </div>
                              <span className="text-sm font-black text-palma-green">₪{(item.price || item.price_ils || 0) * item.quantity}</span>
                           </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                           <Trash2 className="w-5 h-5" />
                        </button>
                     </div>
                   ))}
                </div>
                
                <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-soft flex flex-col md:flex-row justify-between items-center gap-8">
                   <div className="space-y-1 text-center md:text-left rtl:md:text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.cart.total}</p>
                      <h3 className="text-4xl font-black text-palma-navy tracking-tight">₪{selectedCartItems.reduce((s,p) => s + (p.price || p.price_ils || 0) * p.quantity, 0)}</h3>
                      {cart.length > 1 && <p className="text-[10px] text-slate-500">{selectedCartItems.length} {lang === 'ar' ? 'منتج محدد' : 'items selected'}</p>}
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <button onClick={() => { setCheckoutStep('form'); setShowCheckoutForm(true); }} disabled={selectedCartItems.length === 0} className="w-full md:w-auto bg-palma-navy text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-palma-navy/20 hover:bg-palma-primary hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                         {lang === 'ar' ? 'متابعة للدفع' : 'Proceed to Checkout'} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </button>
                      {onProceedToApiCheckout && (
                        <button onClick={() => selectedCartItems.length > 0 && onProceedToApiCheckout(selectedCartItems)} disabled={selectedCartItems.length === 0} className="w-full md:w-auto bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                           {lang === 'ar' ? 'دفع + شحن (رابط تجريبي)' : 'Payment + Shipment (API)'}
                        </button>
                      )}
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-palma-navy tracking-tight">{t.nav.orders}</h2>
            <button type="button" onClick={loadApiOrders} className="flex items-center gap-2 text-sm font-bold text-palma-primary hover:text-palma-navy transition-colors">
              <RefreshCw className="w-4 h-4" /> {lang === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
          </div>
          {displayOrders.length === 0 ? (
             <div className="bg-white p-16 rounded-[2.5rem] text-center border border-slate-100">
                <p className="text-slate-400 font-bold text-sm">No orders found.</p>
             </div>
          ) : (
            <div className="grid gap-6">
              {(apiOrders.length > 0 ? [...displayOrders].reverse() : displayOrders.slice().reverse()).map(o => {
                const orderStatus = (o.status || o.delivery_status || '').toUpperCase();
                const isPending = orderStatus === 'PENDING';
                const isCancelled = orderStatus === 'CANCELLED';
                const isDelivered = orderStatus === 'DELIVERED';
                const isApiOrder = apiOrders.some((ao) => ao.id === o.id);
                const orderItemsFromApi = Array.isArray(o.order_items) ? o.order_items : [];
                const orderItemsFromLocal = marketStore.getOrderItems().filter((oi) => oi.order_id === o.id);
                const orderItems = orderItemsFromApi.length > 0 ? orderItemsFromApi : orderItemsFromLocal;
                return (
                <div key={o.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                   <div className="p-6 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm"><Package className="w-5 h-5 text-palma-muted" /></div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Ref</p>
                            <p className="text-xs font-mono font-bold text-slate-900">{o.id}</p>
                         </div>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isCancelled ? 'bg-red-50 text-red-600 border-red-100' : (isDelivered ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100')}`}>
                        {mapFlashlineStatus(o.delivery_status || o.status)}
                      </span>
                   </div>
                   
                   <div className="p-6 sm:p-8 grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        {orderItems.length > 0 ? orderItems.map((item: OrderItem | CartItem, idx: number) => {
                          const productId = item.product_id ?? (item as { productId?: string }).productId;
                          const prod = marketStore.getProducts().find((p) => p.id === productId);
                          return (
                            <div key={item.id || `oi-${idx}`} className="flex items-center gap-4">
                               <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                                  <img src={prod?.images?.[0] || prod?.imageUrl || 'https://placehold.co/100x100?text=No+Image'} className="w-full h-full object-cover" />
                               </div>
                               <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate mb-0.5">{prod?.name}</p>
                                  <p className="text-[10px] font-medium text-slate-500">Qty: {item.quantity} × ₪{item.price ?? (item as { price_ils?: number }).price_ils ?? 0}</p>
                               </div>
                            </div>
                          );
                        }) : (
                          <div className="text-sm font-bold text-slate-600">
                            ₪{o.total_amount ?? o.amount ?? '—'} {o.shipping_address || o.address || ''}
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-center space-y-4">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.checkout.address}</p>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">
                              {o.shippingAddress?.cityName || o.city || ''} - {o.shippingAddress?.villageName || ''}<br/>
                              <span className="text-slate-500 font-medium">{o.shipping_address || o.shippingAddress?.addressDetails || o.address || ''}</span>
                            </p>
                         </div>
                         {isApiOrder && isPending && (
                           <div className="pt-4 border-t border-slate-200">
                             <button 
                               onClick={() => handleCancelOrderApi(o.id)} 
                               disabled={processingCancelId === o.id}
                               className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 border ${
                                 processingCancelId === o.id 
                                  ? 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed' 
                                  : 'bg-white text-red-500 border-red-100 hover:bg-red-50'
                               }`}
                             >
                               {processingCancelId === o.id ? (
                                 <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                               ) : (
                                 <>{lang === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}</>
                               )}
                             </button>
                           </div>
                         )}
                         {!isApiOrder && o.delivery_id && !isCancelled && !isDelivered && (
                           <div className="pt-4 border-t border-slate-200">
                             <button 
                               onClick={() => setOrderToCancel(o)} 
                               disabled={processingCancelId === o.id}
                               className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 border ${
                                 processingCancelId === o.id 
                                  ? 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed' 
                                  : 'bg-white text-red-500 border-red-100 hover:bg-red-50'
                               }`}
                             >
                               {processingCancelId === o.id ? (
                                 <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                               ) : (
                                 <>Cancel Shipment</>
                               )}
                             </button>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              );})}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
