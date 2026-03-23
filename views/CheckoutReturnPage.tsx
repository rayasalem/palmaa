/**
 * Shown after return from payment. Reads ?orderId=...&payment=success|failed.
 * Polls GET /api/orders/:id until status=paid, then calls /api/shipment/create
 * with full shipment details restored from localStorage.
 * Shows order id, payment status, shipment id/status, and allows printing AWB.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getOrder, createShipment, printAWB, claimOrder } from '../services/checkoutApi';
import type { Language } from '../translations';
import type { User } from '../types';
import { useToast } from '../components/ToastProvider';

const POLL_MS = 2000;
const TIMEOUT_MS = 60000;

interface CheckoutReturnPageProps {
  lang: Language;
  orderId: string;
  paymentParam: string;
  user?: User | null;
  clearCart?: () => void | Promise<void>;
  onBack: () => void;
}

type Step = 'waiting_payment' | 'paid_creating_shipment' | 'done' | 'payment_failed' | 'error';

export const CheckoutReturnPage: React.FC<CheckoutReturnPageProps> = ({
  lang,
  orderId,
  paymentParam,
  user,
  clearCart,
  onBack,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>(paymentParam === 'success' ? 'waiting_payment' : 'payment_failed');
  const [order, setOrder] = useState<any>(null);
  const [shipment, setShipment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [awbIds, setAwbIds] = useState<string[]>([]);
  const [claimed, setClaimed] = useState(false);
  const [cartCleared, setCartCleared] = useState(false);

  // إفراغ السلة فور وصول صفحة العودة من الدفع (لا ننتظر؛ لئلا يغادر المستخدم قبل انتهاء التأخير)
  useEffect(() => {
    if (paymentParam !== 'success' || cartCleared || !clearCart) return;
    setCartCleared(true);
    clearCart();
  }, [paymentParam, cartCleared, clearCart]);

  const fetchOrder = useCallback(async () => {
    const res = await getOrder(orderId);
    if (res.success && res.order) {
      setOrder(res.order);
      return res.order.status;
    }
    return null;
  }, [orderId]);

  useEffect(() => {
    if (step !== 'waiting_payment' || !orderId) return;
    let cancelled = false;
    const start = Date.now();
    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - start > TIMEOUT_MS) {
        const timeoutMsg =
          lang === 'ar' ? 'تأخر تأكيد الدفع. حاول مرة أخرى.' : 'Payment confirmation timed out. Please try again.';
        setError(timeoutMsg);
        setCanRetry(true);
        setStep('error');
        return;
      }
      try {
        const status = await fetchOrder();
        if (cancelled) return;

        if (status == null) {
          setError(lang === 'ar' ? 'تعذر تأكيد حالة الدفع. حاول مرة أخرى.' : 'Unable to confirm payment status. Please try again.');
          setCanRetry(true);
          setStep('error');
          return;
        }

        const s = String(status || '').toUpperCase();
        if (s === 'ACCEPTED' || s === 'COMPLETED') {
          setCanRetry(false);
          setStep('paid_creating_shipment');
          return;
        }
        if (s === 'CANCELLED') {
          setCanRetry(false);
          setStep('payment_failed');
          return;
        }

        setTimeout(poll, POLL_MS);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error)?.message || (lang === 'ar' ? 'حدث خطأ أثناء تأكيد الدفع.' : 'An error occurred while confirming payment.'));
        setCanRetry(true);
        setStep('error');
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [step, orderId, fetchOrder]);

  // إفراغ السلة فور تأكيد الدفع (ما تنتظر زر "العودة للتسوق")
  useEffect(() => {
    if (cartCleared || (step !== 'paid_creating_shipment' && step !== 'done')) return;
    if (clearCart) {
      setCartCleared(true);
      clearCart();
    }
  }, [step, cartCleared, clearCart]);

  // Toast for critical payment/shipping states (once per step transition)
  const lastNotifiedStepRef = React.useRef<Step | null>(null);
  useEffect(() => {
    if (lastNotifiedStepRef.current === step) return;
    lastNotifiedStepRef.current = step;

    if (step === 'payment_failed') {
      showToast(lang === 'ar' ? 'فشل تأكيد الدفع.' : 'Payment confirmation failed.', 'error');
    } else if (step === 'done') {
      showToast(lang === 'ar' ? 'تم تأكيد الدفع وإنشاء الشحنة.' : 'Payment and shipment completed.', 'success');
    } else if (step === 'error' && error) {
      showToast(error, 'error');
    }
  }, [step, error, lang, showToast]);

  const handleRetryPayment = () => {
    setError(null);
    setCanRetry(false);
    setStep('waiting_payment');
  };

  // ربط الطلب بالمستخدم عند العودة من الدفع حتى يظهر في "طلباتي"
  useEffect(() => {
    if (!order || !user?.id || claimed) return;
    const customerId = order.customer_id ?? (order as any).customerId;
    if (customerId != null && String(customerId).trim() !== '') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await claimOrder(orderId);
        if (!cancelled && res.success) {
          setClaimed(true);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('palma-refresh-orders'));
          }
        }
      } catch (_) {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [order, orderId, user?.id, claimed]);

  useEffect(() => {
    if (step !== 'paid_creating_shipment') return;
    let cancelled = false;
    (async () => {
      try {
        let currentOrder = order;
        if (!currentOrder) {
          const orderRes = await getOrder(orderId);
          if (cancelled) return;
          currentOrder = orderRes && typeof orderRes === 'object' && orderRes.order ? orderRes.order : null;
        }
        if (cancelled || !currentOrder) return;

        const shipmentKey = `checkout-shipment-${orderId}`;
        const stored = window.localStorage.getItem(shipmentKey);
        if (!stored) {
          setError(lang === 'ar' ? 'تفاصيل الشحن غير متوفرة' : 'Shipment details not found.');
          setStep('error');
          return;
        }
        let payload: Record<string, unknown>;
        try {
          const parsed = JSON.parse(stored);
          payload = parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
          setError(lang === 'ar' ? 'بيانات الشحن غير صالحة' : 'Invalid shipment data.');
          setStep('error');
          return;
        }
        if (!payload || typeof payload !== 'object' || !payload.addressLine1 || !payload.cityId || !payload.villageId) {
          setError(lang === 'ar' ? 'بيانات الشحن ناقصة' : 'Shipment data incomplete.');
          setStep('error');
          return;
        }

        const res = await createShipment({
          ...payload,
          orderId,
        } as Parameters<typeof createShipment>[0]);
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
    return () => {
      cancelled = true;
    };
  }, [step, orderId, order, lang]);

  const isRtl = lang === 'ar';

  if (step === 'payment_failed') {
    return (
      <div
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="font-heading text-xl font-black text-palma-navy mb-2">
            {lang === 'ar' ? 'فشل الدفع' : 'Payment failed'}
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            {lang === 'ar' ? 'لم يتم تأكيد الدفع.' : 'Payment was not confirmed.'}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="btn-primary w-full py-3 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {lang === 'ar' ? 'العودة للتسوق' : 'Back to shop'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'waiting_payment') {
    return (
      <div
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <h1 className="font-heading text-xl font-black text-palma-navy mb-2">
            {lang === 'ar' ? 'جاري تأكيد الدفع...' : 'Confirming payment...'}
          </h1>
          <p className="text-slate-600 text-sm">{lang === 'ar' ? 'انتظر قليلاً.' : 'Please wait.'}</p>
        </div>
      </div>
    );
  }

  if (step === 'paid_creating_shipment') {
    return (
      <div
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="font-heading text-xl font-black text-palma-navy mb-2">
            {lang === 'ar' ? 'تم الدفع' : 'Payment successful'}
          </h1>
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mt-4" />
          <p className="text-slate-600 text-sm mt-4">
            {lang === 'ar' ? 'جاري إنشاء الشحنة...' : 'Creating shipment...'}
          </p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="font-heading text-xl font-black text-palma-navy mb-2">
            {lang === 'ar' ? 'حدث خطأ' : 'Something went wrong'}
          </h1>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            {canRetry && (
              <button
                type="button"
                onClick={handleRetryPayment}
                className="btn-primary w-full py-3 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="btn-primary w-full py-3 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {lang === 'ar' ? 'العودة' : 'Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="font-heading text-xl font-black text-palma-navy mb-2">
          {lang === 'ar' ? 'تم تأكيد الطلب' : 'Order confirmed'}
        </h1>
        <p className="text-slate-600 text-sm mb-6">
          {lang === 'ar' ? 'تم الدفع وإنشاء الشحنة.' : 'Payment and shipment completed.'}
        </p>
        <div className="bg-slate-50 rounded-xl p-4 text-left rtl:text-right space-y-2 mb-6">
          <p className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'رقم الطلب' : 'Order ID'}</p>
          <p className="text-sm font-mono text-slate-900 break-all">{order?.id || orderId}</p>
          <p className="text-xs font-bold text-slate-500 mt-2">{lang === 'ar' ? 'حالة الدفع' : 'Payment'}</p>
          <p className="text-sm font-bold text-green-600">{order?.status || 'paid'}</p>
          {(order?.shipment_id || shipment) && (
            <>
              <p className="text-xs font-bold text-slate-500 mt-2">{lang === 'ar' ? 'الشحنة' : 'Shipment'}</p>
              <p className="text-sm font-mono text-slate-900">
                {order?.shipment_id ||
                  shipment?.id ||
                  (shipment && (shipment.shipment_id || shipment.shipmentId)) ||
                  '—'}
              </p>
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'الحالة' : 'Status'}: {order?.shipment_status || shipment?.status || 'created'}
              </p>
              {shipment?.barcode && (
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'الباركود' : 'Barcode'}: {shipment.barcode}
                </p>
              )}
              {shipment?.expectedDeliveryDate && (
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'تاريخ التسليم المتوقع' : 'Expected delivery'}: {shipment.expectedDeliveryDate}
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
          className="btn-primary w-full py-3 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {lang === 'ar' ? 'العودة للتسوق' : 'Back to shop'}
        </button>
      </div>
    </div>
  );
};

export default CheckoutReturnPage;
