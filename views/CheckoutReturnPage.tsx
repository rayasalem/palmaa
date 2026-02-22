/**
 * Shown after return from payment. Reads ?orderId=...&payment=success|failed.
 * Polls GET /api/orders/:id until status=paid, then calls /api/shipment/create
 * with full shipment details restored from localStorage.
 * Shows order id, payment status, shipment id/status, and allows printing AWB.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getOrder, createShipment, printAWB } from '../services/checkoutApi';
import type { Language } from '../translations';

const POLL_MS = 2000;
const TIMEOUT_MS = 60000;

interface CheckoutReturnPageProps {
  lang: Language;
  orderId: string;
  paymentParam: string;
  clearCart?: () => void | Promise<void>;
  onBack: () => void;
}

type Step = 'waiting_payment' | 'paid_creating_shipment' | 'done' | 'payment_failed' | 'error';

export const CheckoutReturnPage: React.FC<CheckoutReturnPageProps> = ({ lang, orderId, paymentParam, clearCart, onBack }) => {
  const [step, setStep] = useState<Step>(paymentParam === 'success' ? 'waiting_payment' : 'payment_failed');
  const [order, setOrder] = useState<any>(null);
  const [shipment, setShipment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [awbIds, setAwbIds] = useState<string[]>([]);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await getOrder(orderId);
      if (res.success && res.order) {
        setOrder(res.order);
        return res.order.status;
      }
      return null;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, [orderId]);

  useEffect(() => {
    if (step !== 'waiting_payment' || !orderId) return;
    let cancelled = false;
    const start = Date.now();
    const poll = async () => {
      if (cancelled || Date.now() - start > TIMEOUT_MS) return;
      const status = await fetchOrder();
      if (cancelled) return;
      if (status === 'paid') {
        setStep('paid_creating_shipment');
        return;
      }
      if (status === 'failed') {
        setStep('payment_failed');
        return;
      }
      setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { cancelled = true; };
  }, [step, orderId, fetchOrder]);

  useEffect(() => {
    if (step !== 'paid_creating_shipment') return;
    let cancelled = false;
    (async () => {
      try {
        const currentOrder = order || (await getOrder(orderId)).order;
        if (cancelled || !currentOrder) return;

        const shipmentKey = `checkout-shipment-${orderId}`;
        const stored = window.localStorage.getItem(shipmentKey);
        if (!stored) {
          setError(lang === 'ar' ? 'تفاصيل الشحن غير متوفرة' : 'Shipment details not found.');
          setStep('error');
          return;
        }
        const payload = JSON.parse(stored);
        if (!payload.addressLine1 || !payload.cityId || !payload.villageId) {
          setError(lang === 'ar' ? 'بيانات الشحن ناقصة' : 'Shipment data incomplete.');
          setStep('error');
          return;
        }

        const res = await createShipment({
          ...payload,
          orderId,
        });
        if (cancelled) return;
        if (res.success) {
          setOrder(res.order || currentOrder);
          setShipment(res.shipment);
          const sid =
            (res.shipment && (res.shipment.id || res.shipment.shipment_id || res.shipment.shipmentId)) ||
            res.order?.shipment_id ||
            currentOrder?.shipment_id;
          if (sid) setAwbIds([String(sid)]);
          setStep('done');
        } else {
          setError((res as any).error || (lang === 'ar' ? 'فشل إنشاء الشحنة' : 'Shipment creation failed'));
          setStep('error');
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setStep('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [step, orderId, order, lang]);

  const isRtl = lang === 'ar';

  if (step === 'payment_failed') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-900 mb-2">{lang === 'ar' ? 'فشل الدفع' : 'Payment failed'}</h1>
          <p className="text-slate-600 text-sm mb-6">{lang === 'ar' ? 'لم يتم تأكيد الدفع.' : 'Payment was not confirmed.'}</p>
          <button type="button" onClick={onBack} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">{lang === 'ar' ? 'العودة للتسوق' : 'Back to shop'}</button>
        </div>
      </div>
    );
  }

  if (step === 'waiting_payment') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-900 mb-2">{lang === 'ar' ? 'جاري تأكيد الدفع...' : 'Confirming payment...'}</h1>
          <p className="text-slate-600 text-sm">{lang === 'ar' ? 'انتظر قليلاً.' : 'Please wait.'}</p>
        </div>
      </div>
    );
  }

  if (step === 'paid_creating_shipment') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-900 mb-2">{lang === 'ar' ? 'تم الدفع' : 'Payment successful'}</h1>
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mt-4" />
          <p className="text-slate-600 text-sm mt-4">{lang === 'ar' ? 'جاري إنشاء الشحنة...' : 'Creating shipment...'}</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-900 mb-2">{lang === 'ar' ? 'حدث خطأ' : 'Something went wrong'}</h1>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button type="button" onClick={onBack} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">{lang === 'ar' ? 'العودة' : 'Back'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-xl font-black text-slate-900 mb-2">{lang === 'ar' ? 'تم تأكيد الطلب' : 'Order confirmed'}</h1>
        <p className="text-slate-600 text-sm mb-6">{lang === 'ar' ? 'تم الدفع وإنشاء الشحنة.' : 'Payment and shipment completed.'}</p>
        <div className="bg-slate-50 rounded-xl p-4 text-left rtl:text-right space-y-2 mb-6">
          <p className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'رقم الطلب' : 'Order ID'}</p>
          <p className="text-sm font-mono text-slate-900 break-all">{order?.id || orderId}</p>
          <p className="text-xs font-bold text-slate-500 mt-2">{lang === 'ar' ? 'حالة الدفع' : 'Payment'}</p>
          <p className="text-sm font-bold text-green-600">{order?.status || 'paid'}</p>
          {(order?.shipment_id || shipment) && (
            <>
              <p className="text-xs font-bold text-slate-500 mt-2">{lang === 'ar' ? 'الشحنة' : 'Shipment'}</p>
              <p className="text-sm font-mono text-slate-900">{order?.shipment_id || shipment?.id || (shipment && (shipment.shipment_id || shipment.shipmentId)) || '—'}</p>
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'الحالة' : 'Status'}:{' '}
                {order?.shipment_status || shipment?.status || 'created'}
              </p>
              {shipment?.barcode && (
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'الباركود' : 'Barcode'}: {shipment.barcode}
                </p>
              )}
              {shipment?.expectedDeliveryDate && (
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'تاريخ التسليم المتوقع' : 'Expected delivery'}:{' '}
                  {shipment.expectedDeliveryDate}
                </p>
              )}
            </>
          )}
        </div>
        {awbIds.length > 0 && (
          <button
            type="button"
            onClick={() => printAWB(awbIds)}
            className="w-full py-3 mb-3 bg-slate-800 text-white rounded-xl font-bold"
          >
            {lang === 'ar' ? 'طباعة بوليصة الشحن' : 'Print AWB'}
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            if (clearCart) await clearCart();
            onBack();
          }}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-bold"
        >
          {lang === 'ar' ? 'العودة للتسوق' : 'Back to shop'}
        </button>
      </div>
    </div>
  );
};

export default CheckoutReturnPage;
