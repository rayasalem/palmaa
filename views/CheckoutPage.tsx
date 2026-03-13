/**
 * Checkout page: createOrder → Hosted Checkout (تحويل لصفحة Cybersource حسب توثيق البنك).
 * Shipment details stored in localStorage keyed by orderId for use on return page.
 */

import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, MapPin, User, Phone } from 'lucide-react';
import {
  createOrder,
  createCybersourceHostedSession,
  getCities,
  getVillages,
  getDistrictsAndVillages,
  type City,
  type Village,
} from '../services/checkoutApi';
import { DistrictVillageSelect } from '../components/CustomerShared';
import type { CartItem } from '../types';
import type { Language } from '../translations';

interface CheckoutPageProps {
  lang: Language;
  cart: CartItem[];
  clearCart: () => void;
  onBack: () => void;
  /** بعد نجاح الدفع: ينتقل لصفحة العودة لربط الشحن بالطلب */
  onPaymentSuccess?: (orderId: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ lang, cart, clearCart, onBack, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    recipient_name: '',
    addressLine1: '',
    addressLine2: '',
    cityId: '',
    villageId: '',
    cityName: '',
    villageName: '',
    phone: '',
    weight: 1,
    cod: 0,
    notes: '',
    invoiceNumber: '',
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    quantity: 1,
    description: '',
  });
  const [districts, setDistricts] = useState<City[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [addressDataLoaded, setAddressDataLoaded] = useState(false);
  const [useDistrictsVillagesApi, setUseDistrictsVillagesApi] = useState(false);

  const totalAmount = cart.reduce((s, p) => s + (p.price || (p as any).price_ils || 0) * p.quantity, 0);
  const suggestedWeight = Math.max(0.5, cart.reduce((s, p) => s + p.quantity, 0) * 0.5);

  useEffect(() => {
    (async () => {
      setAddressDataLoaded(false);
      try {
        const res = await getDistrictsAndVillages();
        if (res.success && res.data?.districts?.length) {
          setDistricts(res.data.districts);
          setVillages(res.data.villages ?? []);
          setUseDistrictsVillagesApi(true);
        } else {
          const citiesRes = await getCities();
          if (citiesRes.success) setDistricts(citiesRes.data);
          setVillages([]);
          setUseDistrictsVillagesApi(false);
        }
        setAddressDataLoaded(true);
      } catch (e) {
        console.error('[Checkout] getDistrictsAndVillages error:', e);
        const citiesRes = await getCities();
        if (citiesRes.success) setDistricts(citiesRes.data);
        setVillages([]);
        setUseDistrictsVillagesApi(false);
        setAddressDataLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (useDistrictsVillagesApi || !form.cityId) return;
    (async () => {
      try {
        const res = await getVillages({ cityId: form.cityId });
        setVillages(res?.success && Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('[Checkout] getVillages error:', e);
        setVillages([]);
      }
    })();
  }, [form.cityId, useDistrictsVillagesApi]);

  // عند استخدام واجهة المحافظات+القرى: إذا اختار محافظة ولا توجد قرى لها، جلب القرى من الـ API
  useEffect(() => {
    if (!useDistrictsVillagesApi || !form.cityId) return;
    const forDistrict = villages.filter((v) => String(v.cityId ?? '') === String(form.cityId));
    if (forDistrict.length > 0) return;
    getVillages({ cityId: form.cityId })
      .then((res) => {
        if (!res?.success || !Array.isArray(res.data) || res.data.length === 0) return;
        setVillages((prev) => {
          const ids = new Set(prev.map((v) => String(v.id)));
          const withCityId = (res.data || []).map((v) => ({
            ...v,
            id: String(v.id ?? ''),
            cityId: String((v as any).cityId ?? form.cityId ?? ''),
          }));
          const added = withCityId.filter((v) => !ids.has(v.id));
          return added.length > 0 ? [...prev, ...added] : prev;
        });
      })
      .catch(() => {});
  }, [useDistrictsVillagesApi, form.cityId, villages]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === 'weight') {
        return { ...prev, weight: parseFloat(value) || 0.5 };
      }
      if (name === 'cod') {
        return { ...prev, cod: Math.max(0, parseFloat(value) || 0) };
      }
      if (name === 'quantity') {
        return { ...prev, quantity: Math.max(1, parseInt(value, 10) || 1) };
      }
      if (name === 'cityId') {
        const city = districts.find((c) => String(c.id) === String(value));
        return {
          ...prev,
          cityId: value,
          cityName: city?.name || '',
          villageId: '',
          villageName: '',
        };
      }
      if (name === 'villageId') {
        const v = villages.find((vv) => vv.id === value);
        return { ...prev, villageId: value, villageName: v?.name || '' };
      }
      return { ...prev, [name]: value };
    });
    setError(null);
  };

  const validate = (): boolean => {
    if (!form.recipient_name.trim()) {
      setError(lang === 'ar' ? 'الاسم مطلوب' : 'Recipient name is required');
      return false;
    }
    if (!form.addressLine1.trim()) {
      setError(lang === 'ar' ? 'العنوان مطلوب' : 'Address line 1 is required');
      return false;
    }
    if (!form.cityId) {
      setError(lang === 'ar' ? 'يرجى اختيار المحافظة' : 'Please select district');
      return false;
    }
    if (!form.villageId) {
      setError(lang === 'ar' ? 'يرجى اختيار القرية أو الحي' : 'Please select village');
      return false;
    }
    if (!form.phone.trim()) {
      setError(lang === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone is required');
      return false;
    }
    if (form.weight <= 0) {
      setError(lang === 'ar' ? 'الوزن يجب أن يكون موجباً' : 'Weight must be positive');
      return false;
    }
    if (form.cod < 0) {
      setError(lang === 'ar' ? 'قيمة التحصيل يجب أن تكون موجبة أو صفر' : 'COD must be zero or positive');
      return false;
    }
    if (form.quantity <= 0) {
      setError(lang === 'ar' ? 'الكمية يجب أن تكون موجبة' : 'Quantity must be positive');
      return false;
    }
    const phoneDigits = form.phone.replace(/\s+/g, '');
    if (!/^\d{6,}$/.test(phoneDigits)) {
      setError(lang === 'ar' ? 'رقم الهاتف غير صالح (أرقام فقط)' : 'Invalid phone number (digits only)');
      return false;
    }
    if (totalAmount <= 0 || cart.length === 0) {
      setError(lang === 'ar' ? 'السلة فارغة' : 'Cart is empty');
      return false;
    }
    return true;
  };

  const brokerIdFromUrl = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('broker') || params.get('brokerId') || null;
    } catch {
      return null;
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const orderRes = await createOrder({
        recipient_name: form.recipient_name.trim(),
        address: `${form.addressLine1.trim()} ${form.addressLine2.trim()}`.trim(),
        city: form.cityName || form.cityId,
        cityId: form.cityId,
        villageId: form.villageId,
        phone: form.phone.trim(),
        amount: totalAmount,
        weight: form.weight,
        ...(brokerIdFromUrl ? { broker_id: brokerIdFromUrl } : {}),
        items: cart.map((item) => ({
          product_id: (item as any).id,
          quantity: item.quantity,
          price: (item as any).price ?? (item as any).price_ils ?? 0,
        })),
      });
      if (!orderRes.success || !orderRes.order?.id) {
        setError((orderRes as any).error || (lang === 'ar' ? 'فشل إنشاء الطلب' : 'Failed to create order'));
        setLoading(false);
        return;
      }
      const order = orderRes.order as { id?: string; order_reference?: string };
      const orderId = String(order?.order_reference ?? order?.id ?? '').trim();

      // Persist shipment details client-side for use on return page
      try {
        const shipmentKey = `checkout-shipment-${orderId}`;
        const shipmentPayload = {
          orderId,
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim(),
          cityId: form.cityId,
          cityName: form.cityName,
          villageId: form.villageId,
          villageName: form.villageName,
          recipient_name: form.recipient_name.trim(),
          phone: form.phone.trim(),
          weight: form.weight,
          cod: form.cod,
          notes: form.notes.trim(),
          invoiceNumber: form.invoiceNumber.trim(),
          senderName: form.senderName.trim(),
          senderPhone: form.senderPhone.trim(),
          receiverName: form.receiverName.trim() || form.recipient_name.trim(),
          receiverPhone: form.receiverPhone.trim() || form.phone.trim(),
          quantity: form.quantity,
          description: form.description.trim(),
          serviceType: 'STANDARD',
          shipmentType: 'COD',
        };
        window.localStorage.setItem(shipmentKey, JSON.stringify(shipmentPayload));
      } catch (e) {
        console.warn('[Checkout] Failed to store shipment details:', e);
      }

      // Hosted Checkout (الطريقة الموصى بها من البنك – Secure Acceptance Redirection)
      const session = await createCybersourceHostedSession(orderId, totalAmount);
      if (!session.success) {
        setError(
          (session as any).error ||
            (lang === 'ar'
              ? 'فشل إنشاء جلسة الدفع. تحقق من CYBS_PROFILE_ID و CYBS_ACCESS_KEY و CYBS_SECRET_KEY في .env'
              : 'Failed to create payment session. Check CYBS_* in .env')
        );
        setLoading(false);
        return;
      }
      const actionUrl = (session as any).actionUrl || (session as any).action_url;
      const fields = (session as any).fields || {};
      if (!actionUrl || !Object.keys(fields).length) {
        setError(
          lang === 'ar' ? 'استجابة غير صالحة من الباكند (Hosted Checkout).' : 'Invalid Hosted Checkout response.'
        );
        setLoading(false);
        return;
      }
      try {
        sessionStorage.setItem(
          'palma_pending_checkout_return',
          JSON.stringify({ orderId, payment: 'success' })
        );
        sessionStorage.setItem('palma_went_to_payment_at', String(Date.now()));
      } catch (_) {
        /* ignore */
      }
      const redirectForm = document.createElement('form');
      redirectForm.method = 'POST';
      redirectForm.action = actionUrl;
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value);
        redirectForm.appendChild(input);
      });
      document.body.appendChild(redirectForm);
      redirectForm.submit();
      return;
    } catch (err: any) {
      console.error('[Checkout] Error:', err);
      const msg = err?.message || '';
      const data = err?.data;
      const isGatewayError = data && (data.stage === 'authorization' || data.stage === 'capture');
      const isServerUnreachable =
        !data && (msg === 'Not found' || msg.includes('404') || msg.includes('Failed to fetch'));
      let friendly: string;
      if (isGatewayError) {
        const raw = data?.raw;
        friendly =
          lang === 'ar'
            ? `فشل من بوابة الدفع (Cybersource). ${raw ? `السبب: ${typeof raw === 'string' ? raw : JSON.stringify(raw)}` : 'تحقق من تفعيل REST API لحسابك في Business Center.'}`
            : `Payment gateway error (Cybersource). ${raw ? `Details: ${typeof raw === 'string' ? raw : JSON.stringify(raw)}` : 'Check that REST API is enabled for your account in Business Center.'}`;
      } else if (isServerUnreachable) {
        friendly =
          lang === 'ar'
            ? 'الخادم غير متصل أو الرابط غير صحيح. تحقق من الاتصال بالإنترنت أو راجع إعدادات الموقع.'
            : 'Server not reachable or wrong address. Check your connection or site settings.';
      } else {
        friendly = msg || (lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
      }
      setError(friendly);
    }
    setLoading(false);
  };

  const isRtl = lang === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-xl mx-auto w-full px-6 py-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> {lang === 'ar' ? 'العودة' : 'Back'}
        </button>
        <h1 className="font-heading text-2xl font-black text-palma-navy mb-2">
          {lang === 'ar' ? 'الدفع والشحن' : 'Checkout (Payment + Shipment)'}
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          {lang === 'ar' ? 'أكمل البيانات ثم انقر متابعة للدفع.' : 'Fill details then proceed to payment.'}
        </p>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {lang === 'ar' ? 'إجمالي الطلب' : 'Order total'}
          </p>
          <p className="text-2xl font-black text-slate-900">₪{totalAmount.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {cart.length} {lang === 'ar' ? 'منتج' : 'item(s)'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              {lang === 'ar' ? 'الاسم الكامل' : 'Full name'}
            </label>
            <div className="relative">
              <User className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 left-3 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                name="recipient_name"
                value={form.recipient_name}
                onChange={handleChange}
                className="w-full pl-10 rtl:pr-10 rtl:pl-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full name'}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              {lang === 'ar' ? 'العنوان (سطر 1)' : 'Address line 1'}
            </label>
            <div className="relative">
              <MapPin className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 left-3 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleChange}
                className="w-full pl-10 rtl:pr-10 rtl:pl-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={lang === 'ar' ? 'الشارع، رقم المبنى' : 'Street, building number'}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              {lang === 'ar' ? 'العنوان (سطر 2) - اختياري' : 'Address line 2 (optional)'}
            </label>
            <input
              type="text"
              name="addressLine2"
              value={form.addressLine2}
              onChange={handleChange}
              className="w-full py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={lang === 'ar' ? 'شقة، طابق، معلم قريب' : 'Apartment, floor, landmark'}
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {addressDataLoaded ? (
              <DistrictVillageSelect
                districts={districts}
                villages={villages}
                districtId={form.cityId || undefined}
                villageId={form.villageId || undefined}
                villageName={form.villageName}
                onDistrictChange={(districtId, districtName) =>
                  setForm((prev) => ({
                    ...prev,
                    cityId: districtId,
                    cityName: districtName,
                    villageId: '',
                    villageName: '',
                  }))
                }
                onVillageChange={(villageId, villageName) =>
                  setForm((prev) => ({ ...prev, villageId: villageId, villageName }))
                }
                errorDistrict={false}
                errorVillage={false}
                lang={lang}
                required
                villageSearchPlaceholder={lang === 'ar' ? 'ابحث عن القرية أو الحي...' : 'Search village or district...'}
              />
            ) : (
              <div className="py-3 text-slate-500 text-sm">
                {lang === 'ar' ? 'جاري تحميل المحافظات والقرى...' : 'Loading districts and villages...'}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{lang === 'ar' ? 'الهاتف' : 'Phone'}</label>
            <div className="relative">
              <Phone className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 left-3 rtl:left-auto rtl:right-3" />
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full pl-10 rtl:pr-10 rtl:pl-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="05xxxxxxxx"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              {lang === 'ar' ? 'الوزن (كغ)' : 'Weight (kg)'}
            </label>
            <input
              type="number"
              name="weight"
              min="0.5"
              step="0.5"
              value={form.weight}
              onChange={handleChange}
              className="w-full py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'ar' ? 'اقتراح' : 'Suggested'}: {suggestedWeight} kg
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {lang === 'ar' ? 'قيمة التحصيل (COD)' : 'COD amount'}
              </label>
              <input
                type="number"
                name="cod"
                min="0"
                step="1"
                value={form.cod}
                onChange={handleChange}
                className="w-full py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {lang === 'ar' ? 'الكمية' : 'Quantity'}
              </label>
              <input
                type="number"
                name="quantity"
                min="1"
                step="1"
                value={form.quantity}
                onChange={handleChange}
                className="w-full py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              {lang === 'ar' ? 'رقم الفاتورة (اختياري)' : 'Invoice number (optional)'}
            </label>
            <input
              type="text"
              name="invoiceNumber"
              value={form.invoiceNumber}
              onChange={handleChange}
              className="w-full py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              {lang === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
            </label>
            <input
              type="text"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          {/* الدفع يتم على صفحة البنك الآمنة — لا ندخل رقم البطاقة هنا */}
          <div className="pt-2 border-t border-slate-200 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-600">
              {lang === 'ar'
                ? 'بعد الضغط على «متابعة للدفع» ستُنقل إلى صفحة الدفع الآمنة للبنك لإدخال بيانات البطاقة هناك.'
                : "After clicking «Proceed to payment» you will be redirected to the bank's secure payment page to enter your card details there."}
            </p>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {lang === 'ar' ? 'متابعة للدفع' : 'Proceed to payment'} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
