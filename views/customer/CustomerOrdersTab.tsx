/**
 * Customer orders tab: list of orders with status and actions.
 * Lazy-loaded when the orders tab is active.
 */

import React from 'react';
import { Order, OrderItem, CartItem } from '../../types';
import { marketStore } from '../../store';
import { mapFlashlineStatus } from '../../services/flashlineService';
import type { Language } from '../../translations';
import { Package, Truck, RefreshCw, Check, ChevronLeft, Download } from 'lucide-react';
import { ProductConditionBadge } from '../../components/ProductConditionBadge';
import { secureImageSrc, setImageToPlaceholder } from '../../utils/secureUrl';

const ORDER_ITEM_IMG_FALLBACK = 'https://placehold.co/100x100?text=No+Image';

const TRACK_STEPS = [
  { key: 'placed', ar: 'تم الطلب', en: 'Order Placed' },
  { key: 'accepted', ar: 'مقبول', en: 'Accepted' },
  { key: 'progress', ar: 'قيد التجهيز', en: 'In Progress' },
  { key: 'onway', ar: 'في الطريق', en: 'On the Way' },
  { key: 'delivered', ar: 'تم التوصيل', en: 'Delivered' },
];

function getStepIndex(status: string): number {
  const s = (status || '').toUpperCase();
  if (s === 'CANCELLED') return -1;
  if (s === 'COMPLETED' || s === 'DELIVERED') return 4;
  if (s === 'ON_THE_WAY' || s === 'SHIPPED') return 3;
  if (s === 'IN_PROGRESS' || s === 'PROCESSING' || s === 'READY_FOR_PICKUP') return 2;
  if (s === 'PAID' || s === 'ACCEPTED') return 1;
  return 0;
}

export function getOrderStatusLabel(status: string, lang: string): string {
  const s = (status || '').toUpperCase();
  const labelsAr: Record<string, string> = {
    PENDING: 'قيد الانتظار',
    ACCEPTED: 'مقبول',
    IN_PROGRESS: 'قيد التجهيز',
    ON_THE_WAY: 'في الطريق',
    COMPLETED: 'مكتمل',
    CANCELLED: 'ملغى',
    DELIVERED: 'تم التوصيل',
    SHIPPED: 'تم الشحن',
    PAID: 'مدفوع',
  };
  const labelsEn: Record<string, string> = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    IN_PROGRESS: 'In Progress',
    ON_THE_WAY: 'On the Way',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DELIVERED: 'Delivered',
    SHIPPED: 'Shipped',
    PAID: 'Paid',
  };
  if (lang === 'he') {
    const labelsHe: Record<string, string> = {
      PENDING: 'ממתין',
      ACCEPTED: 'אושר',
      IN_PROGRESS: 'בעיבוד',
      ON_THE_WAY: 'בדרך',
      COMPLETED: 'הושלם',
      CANCELLED: 'בוטל',
      PAID: 'שולם',
    };
    return labelsHe[s] || s;
  }
  const labels = lang === 'ar' ? labelsAr : labelsEn;
  return labels[s] || s;
}

function formatOrderDate(date: string | number | undefined, lang: string): string {
  if (!date) return '—';
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface TrackingDisplay {
  orderId: string;
  status: string;
}

export interface CustomerOrdersTabProps {
  lang: Language;
  t: Record<string, any> & { nav: { orders: string }; checkout: { address: string } };
  displayOrders: Order[];
  apiOrders: Order[] | any[];
  onRefreshOrders: () => void;
  processingCancelId: string | null;
  setCancelConfirmOrderId: (orderId: string | null) => void;
  setOrderToCancel: (order: Order | null) => void;
  checkingStatusId: string | null;
  onCheckOrderStatus: (order: Order) => void;
  /** آخر نتيجة تتبع معروضة للمستخدم */
  trackingDisplay?: TrackingDisplay | null;
}

export const CustomerOrdersTab: React.FC<CustomerOrdersTabProps> = ({
  lang,
  t,
  displayOrders,
  apiOrders,
  onRefreshOrders,
  processingCancelId,
  setCancelConfirmOrderId,
  setOrderToCancel,
  checkingStatusId,
  onCheckOrderStatus,
  trackingDisplay = null,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb — طراز Plant Shop */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2" aria-label="Breadcrumb">
        <span>{lang === 'ar' ? 'الرئيسية' : 'Home'}</span>
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" aria-hidden />
        <span className="font-bold text-slate-800">
          {lang === 'ar' ? 'تتبع الطلب' : 'Track Your Order'}
        </span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-2xl font-black text-palma-navy tracking-tight">{t.nav.orders}</h2>
        <button
          type="button"
          onClick={onRefreshOrders}
          className="flex items-center gap-2 text-sm font-bold text-palma-primary hover:text-palma-navy transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {lang === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>
      {displayOrders.length === 0 ? (
        <div className="bg-white p-16 rounded-[2.5rem] text-center border border-palma-border shadow-soft">
          <p className="text-slate-400 font-bold text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {(apiOrders.length > 0 ? [...displayOrders].reverse() : displayOrders.slice().reverse()).map((o) => {
            const orderStatus = (o.status || o.delivery_status || '').toUpperCase();
            const isPending = orderStatus === 'PENDING';
            const isCancelled = orderStatus === 'CANCELLED';
            const isDelivered = orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED';
            const isApiOrder = apiOrders.some((ao: any) => ao.id === o.id);
            const orderItemsFromApi = Array.isArray(o.order_items) ? o.order_items : [];
            const orderItemsFromLocal = marketStore.getOrderItems().filter((oi) => oi.order_id === o.id);
            const orderItems = orderItemsFromApi.length > 0 ? orderItemsFromApi : orderItemsFromLocal;
            const stepIndex = getStepIndex(o.delivery_status || o.status);
            const orderDate = o.created_at ?? (o as any).createdAt;
            const deliveryDate = o.expected_delivery_date ?? (o as any).expected_delivery_date;

            return (
              <div key={o.id} className="dashboard-card overflow-hidden hover:shadow-md transition-all group">
                <div className="p-6 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <Package className="w-5 h-5 text-palma-muted" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{lang === 'ar' ? 'رقم الطلب' : 'Order Ref'}</p>
                      <p className="text-xs font-mono font-bold text-slate-900">{o.order_reference || o.id}</p>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${isCancelled ? 'bg-red-50 text-red-600 border-red-100' : isDelivered ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}
                  >
                    {getOrderStatusLabel(o.status || o.delivery_status || '', lang)}
                  </span>
                </div>

                {/* Order Completed — طراز Grocery (للطلبات المستلمة) */}
                {isDelivered && (
                  <div className="p-6 bg-amber-50/50 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-800">
                            {lang === 'ar' ? 'تم استلام طلبك!' : 'Your order is completed!'}
                          </p>
                          <p className="text-sm text-slate-600">
                            {lang === 'ar' ? 'شكراً. تم استلام الطلب.' : 'Thank you. Your order has been received.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition"
                      >
                        <Download className="w-4 h-4" />
                        {lang === 'ar' ? 'تحميل الفاتورة' : 'Download Invoice'}
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">{lang === 'ar' ? 'رقم الطلب' : 'Order ID'}</p>
                        <p className="font-mono font-bold text-emerald-700">#{String(o.order_reference || o.id).slice(-8)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{lang === 'ar' ? 'طريقة الدفع' : 'Payment'}</p>
                        <p className="font-bold text-slate-800">{String(o.payment_method || (o as any).payment_method || '—').toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{lang === 'ar' ? 'تاريخ التوصيل' : 'Delivery'}</p>
                        <p className="font-bold text-slate-800">{formatOrderDate(deliveryDate, lang)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{lang === 'ar' ? 'المجموع' : 'Total'}</p>
                        <p className="font-bold text-slate-800">₪{o.total_amount ?? (o as any).amount ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Status — شريط التتبع (طراز Plant Shop) */}
                {!isCancelled && (
                  <div className="px-6 py-5 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                      {lang === 'ar' ? 'حالة الطلب' : 'Order Status'} — {lang === 'ar' ? 'رقم' : 'ID'}: #{String(o.order_reference || o.id).slice(-8)}
                    </p>
                    <div className="flex items-start justify-between gap-2 overflow-x-auto pb-2">
                      {TRACK_STEPS.map((step, idx) => {
                        const done = stepIndex >= idx;
                        const isLast = idx === TRACK_STEPS.length - 1;
                        const label = lang === 'ar' ? step.ar : step.en;
                        let dateStr = '—';
                        if (idx === 0) dateStr = formatOrderDate(orderDate, lang);
                        else if (idx === 4 && deliveryDate) dateStr = formatOrderDate(deliveryDate, lang);
                        else if (done && idx > 0) dateStr = formatOrderDate(orderDate, lang);
                        return (
                          <React.Fragment key={step.key}>
                            <div className="flex flex-col items-center min-w-[80px] sm:min-w-0">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                  done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {done ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                              </div>
                              <p className="text-xs font-bold text-slate-700 mt-2 text-center">{label}</p>
                              <p className="text-xs text-slate-500 mt-0.5 text-center">{dateStr}</p>
                            </div>
                            {!isLast && (
                              <div
                                className={`flex-1 min-w-[20px] h-0.5 mt-5 shrink-0 ${
                                  stepIndex > idx ? 'bg-emerald-600' : 'bg-slate-200'
                                }`}
                                aria-hidden
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8 grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      {lang === 'ar' ? 'المنتجات' : 'Products'}
                    </p>
                    {orderItems.length > 0 ? (
                      orderItems.map((item: OrderItem | CartItem, idx: number) => {
                        const productId = item.product_id ?? item.productId;
                        const prod = marketStore.getProducts().find((p) => p.id === productId);
                        return (
                          <div key={item.id || `oi-${idx}`} className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                              <img
                                src={secureImageSrc(
                                  prod?.images?.[0] || prod?.imageUrl || prod?.image_url,
                                  ORDER_ITEM_IMG_FALLBACK
                                )}
                                loading="lazy"
                                className="w-full h-full object-cover"
                                alt=""
                                onError={setImageToPlaceholder}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate mb-0.5">{prod?.name}</p>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-xs font-medium text-slate-500">
                                  Qty: {item.quantity} × ₪{item.price ?? item.price_ils ?? 0}
                                </p>
                                <ProductConditionBadge condition={prod?.condition || 'new'} lang={lang} />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm font-bold text-slate-600">
                        ₪{o.total_amount ?? o.amount ?? '—'} {o.shipping_address || o.address || ''}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-center space-y-4">
                    <div className="space-y-3">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        {lang === 'ar' ? 'تفاصيل الطلب' : 'Order details'}
                      </p>
                      <div className="text-xs text-slate-700 space-y-2">
                        {(o.order_reference || o.id) && (
                          <p>
                            <span className="text-slate-500 font-medium">{lang === 'ar' ? 'رقم المرجع: ' : 'Ref: '}</span>
                            <span className="font-mono font-bold">{o.order_reference || o.id}</span>
                          </p>
                        )}
                        {(o.created_at || (o as any).createdAt) && (
                          <p>
                            <span className="text-slate-500 font-medium">{lang === 'ar' ? 'تاريخ الطلب: ' : 'Order date: '}</span>
                            {new Date(o.created_at || (o as any).createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        )}
                        <p className="font-bold">
                          <span className="text-slate-500 font-medium">{lang === 'ar' ? 'العنوان: ' : 'Address: '}</span>
                          {o.shipping_address || o.shippingAddress?.addressDetails || o.address || '—'}
                        </p>
                        {(o.shippingAddress?.cityName || o.shippingAddress?.villageName || o.shipping_city_id || o.shipping_village_id) && (
                          <>
                            <p>
                              <span className="text-slate-500 font-medium">{lang === 'ar' ? 'المحافظة: ' : 'District: '}</span>
                              {o.shippingAddress?.cityName || (o as any).city_name || o.shipping_city_id || '—'}
                            </p>
                            <p>
                              <span className="text-slate-500 font-medium">{lang === 'ar' ? 'القرية / الحي: ' : 'Village: '}</span>
                              {o.shippingAddress?.villageName || (o as any).village_name || o.shipping_village_id || '—'}
                            </p>
                          </>
                        )}
                        <p>
                          <span className="text-slate-500 font-medium">{lang === 'ar' ? 'المستلم: ' : 'Recipient: '}</span>
                          {o.shipping_name || (o as any).recipient_name || '—'}
                        </p>
                        <p>
                          <span className="text-slate-500 font-medium">{lang === 'ar' ? 'الهاتف: ' : 'Phone: '}</span>
                          {o.shipping_phone || (o as any).phone || '—'}
                        </p>
                        <p>
                          <span className="text-slate-500 font-medium">{lang === 'ar' ? 'المبلغ: ' : 'Amount: '}</span>
                          <span className="font-bold">₪{o.total_amount ?? (o as any).amount ?? '—'}</span>
                        </p>
                        {(o.payment_method || (o as any).payment_method) && (
                          <p>
                            <span className="text-slate-500 font-medium">{lang === 'ar' ? 'طريقة الدفع: ' : 'Payment: '}</span>
                            {String(o.payment_method || (o as any).payment_method || '').toUpperCase()}
                          </p>
                        )}
                      </div>
                    </div>
                    {(o.delivery_id || o.shipmentId) && !isCancelled && !isDelivered && (
                      <div className="bg-white rounded-xl p-4 border border-palma-primary/20 space-y-3">
                        <p className="text-xs font-bold text-palma-navy">
                          {lang === 'ar'
                            ? 'يمكنك مراقبة حالة الشحن وتحديثها مباشرة من هنا.'
                            : 'You can track and update your shipment status here.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => onCheckOrderStatus(o)}
                          disabled={checkingStatusId === o.id}
                          className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-palma-primary text-white hover:bg-palma-navy transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {checkingStatusId === o.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{' '}
                              {lang === 'ar' ? 'جاري التحقق...' : 'Checking...'}
                            </>
                          ) : (
                            <>
                              <Truck className="w-4 h-4" /> {lang === 'ar' ? 'مراقبة حالة الطلب' : 'Track order status'}
                            </>
                          )}
                        </button>
                        {trackingDisplay && trackingDisplay.orderId === o.id && (
                          <div className="mt-3 p-3 rounded-lg bg-palma-primary/10 border border-palma-primary/30 text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                              {lang === 'ar' ? 'حالة الطلب' : 'Order status'}
                            </p>
                            <p className="text-sm font-bold text-palma-navy mt-1">
                              {trackingDisplay.status}
                            </p>
                            {(o.delivery_id || o.shipmentId || '').toString().startsWith('sim-') && (
                              <p className="text-xs text-amber-700 mt-2">
                                {lang === 'ar'
                                  ? 'شحنة محاكاة — لظهور الطلب على موقع لوجستيك: أضف LOGESTECHS_EMAIL و LOGESTECHS_PASSWORD في ملف .env (محلياً) أو في Render Environment، ثم أعد تشغيل السيرفر أو اعمل Redeploy.'
                                  : 'Simulated shipment — add LOGESTECHS_EMAIL and LOGESTECHS_PASSWORD in .env (local) or Render Environment, then restart the server or Redeploy.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {isApiOrder && isPending && (
                      <div className="pt-4 border-t border-slate-200">
                        <button
                          onClick={() => setCancelConfirmOrderId(o.id)}
                          disabled={processingCancelId === o.id}
                          className={`w-full py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 border ${
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
                          className={`w-full py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 border ${
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
            );
          })}
        </div>
      )}
    </div>
  );
};
