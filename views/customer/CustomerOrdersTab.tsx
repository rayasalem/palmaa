/**
 * Customer orders tab: list of orders with status and actions.
 * Lazy-loaded when the orders tab is active.
 */

import React from 'react';
import { Order, OrderItem, CartItem } from '../../types';
import { marketStore } from '../../store';
import { mapFlashlineStatus } from '../../services/flashlineService';
import type { Language } from '../../translations';
import { Package, Truck, RefreshCw } from 'lucide-react';
import { ProductConditionBadge } from '../../components/ProductConditionBadge';

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
}

export const CustomerOrdersTab: React.FC<CustomerOrdersTabProps> = ({
  lang,
  t,
  displayOrders,
  apiOrders,
  onRefreshOrders,
  processingCancelId,
  onCancelConfirm,
  setOrderToCancel,
  checkingStatusId,
  onCheckOrderStatus,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
            const isDelivered = orderStatus === 'DELIVERED';
            const isApiOrder = apiOrders.some((ao: any) => ao.id === o.id);
            const orderItemsFromApi = Array.isArray(o.order_items) ? o.order_items : [];
            const orderItemsFromLocal = marketStore.getOrderItems().filter((oi) => oi.order_id === o.id);
            const orderItems = orderItemsFromApi.length > 0 ? orderItemsFromApi : orderItemsFromLocal;
            return (
              <div key={o.id} className="dashboard-card overflow-hidden hover:shadow-md transition-all group">
                <div className="p-6 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <Package className="w-5 h-5 text-palma-muted" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Ref</p>
                      <p className="text-xs font-mono font-bold text-slate-900">{o.id}</p>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isCancelled ? 'bg-red-50 text-red-600 border-red-100' : isDelivered ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}
                  >
                    {mapFlashlineStatus(o.delivery_status || o.status)}
                  </span>
                </div>

                <div className="p-6 sm:p-8 grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {orderItems.length > 0 ? (
                      orderItems.map((item: OrderItem | CartItem, idx: number) => {
                        const productId = item.product_id ?? item.productId;
                        const prod = marketStore.getProducts().find((p) => p.id === productId);
                        return (
                          <div key={item.id || `oi-${idx}`} className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                              <img
                                src={
                                  prod?.images?.[0] || prod?.imageUrl || 'https://placehold.co/100x100?text=No+Image'
                                }
                                loading="lazy"
                                className="w-full h-full object-cover"
                                alt=""
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate mb-0.5">{prod?.name}</p>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[10px] font-medium text-slate-500">
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
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {t.checkout.address}
                      </p>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        {o.shippingAddress?.cityName || o.city || ''} - {o.shippingAddress?.villageName || ''}
                        <br />
                        <span className="text-slate-500 font-medium">
                          {o.shipping_address || o.shippingAddress?.addressDetails || o.address || ''}
                        </span>
                      </p>
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
                          className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-palma-primary text-white hover:bg-palma-navy transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
                      </div>
                    )}
                    {isApiOrder && isPending && (
                      <div className="pt-4 border-t border-slate-200">
                        <button
                          onClick={() => setCancelConfirmOrderId(o.id)}
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
            );
          })}
        </div>
      )}
    </div>
  );
};
