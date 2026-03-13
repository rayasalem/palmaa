/**
 * Merchant orders tab: orders table and shipment actions.
 * Lazy-loaded when the orders tab is active.
 */

import React from 'react';
import { Order } from '../../types';
import { FlashLineService } from '../../services/flashlineService';
import type { Language } from '../../translations';
import { Truck, Search, Receipt, XCircle } from 'lucide-react';

export interface MerchantOrdersTabProps {
  lang: Language;
  t: Record<string, any> & { common: Record<string, string> };
  orders: Order[];
  loading: boolean;
  refreshData: () => void;
  setOrderToInvoice: (order: Order | null) => void;
  setInvoiceUrlInput: (v: string) => void;
  createShipment: (order: Order) => void;
  handleCheckStatus: (order: Order) => void;
  handleCancelShipment: (order: Order) => void;
}

export const MerchantOrdersTab: React.FC<MerchantOrdersTabProps> = ({
  lang,
  t,
  orders,
  loading,
  refreshData,
  setOrderToInvoice,
  setInvoiceUrlInput,
  createShipment,
  handleCheckStatus,
  handleCancelShipment,
}) => (
  <div className="bg-white rounded-3xl shadow-card border border-palma-border overflow-hidden hover:shadow-card-hover transition-shadow">
    <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-white">
      <h3 className="font-black text-palma-navy text-lg sm:text-xl">{t.common.recentOrders}</h3>
      <button
        type="button"
        onClick={() => refreshData()}
        disabled={loading}
        className="text-[10px] font-bold text-palma-primary hover:bg-palma-primaryLight flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-palma-border transition-colors disabled:opacity-50"
      >
        {loading
          ? lang === 'ar'
            ? 'جاري التحميل...'
            : 'Loading...'
          : lang === 'ar'
            ? 'تحديث الطلبات'
            : 'Refresh orders'}
      </button>
    </div>
    <div className="px-6 sm:px-8 pt-4 pb-2">
      <div className="bg-palma-primaryLight/40 border border-palma-primary/20 rounded-2xl p-4 text-center">
        <p className="text-sm font-bold text-palma-navy mb-1">
          {lang === 'ar'
            ? 'يمكنك مراقبة حالة الشحن وتحديثها لكل طلب من زر «مراقبة حالة الطلب» في عمود الإجراءات.'
            : lang === 'he'
              ? 'ניתן לעקוב אחר סטטוס המשלוח ולעדכן אותו מכפתור «מעקב סטטוס» בעמודת הפעולות.'
              : 'You can track and update shipment status for each order using the "Track order status" button in the actions column.'}
        </p>
        <p className="text-[11px] text-slate-600">
          {lang === 'ar'
            ? 'بعد إنشاء الشحنة يظهر الزر لمراقبة الحالة أو إلغاء الشحن.'
            : 'After creating a shipment, the button appears to check status or cancel.'}
        </p>
      </div>
    </div>
    <div className="overflow-x-auto">
      {orders.length === 0 ? (
        <div className="p-16 text-center">
          <p className="text-slate-400 font-bold text-sm mb-2">
            {lang === 'ar' ? 'لا توجد طلبات حتى الآن.' : 'No orders yet.'}
          </p>
          <p className="text-[11px] text-slate-400">
            {lang === 'ar'
              ? 'ستظهر هنا الطلبات المرتبطة بمتجرك فور وصولها.'
              : 'Orders for your store will appear here when they come in.'}
          </p>
        </div>
      ) : (
        <table className="min-w-full text-left rtl:text-right whitespace-nowrap">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t.common.orderDetails}
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t.common.customerInfo}
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t.common.amount}
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t.common.status}
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {lang === 'ar' ? 'الفاتورة' : 'Invoice'}
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t.common.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="block text-xs font-bold text-palma-navy font-mono mb-0.5">{order.id}</span>
                  <div className="text-[10px] font-medium text-slate-400">
                    {order.date ? new Date(order.date).toLocaleDateString() : 'Just now'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-palma-soft flex items-center justify-center text-xs font-black text-palma-navy border border-slate-100">
                      {order.shippingAddress?.cityName?.charAt(0) || '—'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-palma-navy">{order.shippingAddress?.cityName || '—'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{order.shipping_phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-black text-emerald-600">{order.totalAmount} ₪</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${['SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : order.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}
                  >
                    {order.status?.toLowerCase()}
                  </span>
                  {order.delivery_status && (
                    <div className="text-[9px] font-bold text-slate-400 mt-1.5 flex items-center gap-1.5">
                      <Truck className="w-3 h-3 text-palma-primary" />
                      {FlashLineService.mapFlashlineStatus(order.delivery_status)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {order.payment_method === 'online' ? (
                    order.invoice_uploaded && order.invoice_file_url ? (
                      <a
                        href={order.invoice_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 hover:underline"
                      >
                        <Receipt className="w-3.5 h-3.5" /> {lang === 'ar' ? 'مرفوعة — عرض' : 'Uploaded — View'}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderToInvoice(order);
                          setInvoiceUrlInput('');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                      >
                        <Receipt className="w-3.5 h-3.5" /> {lang === 'ar' ? 'رفع الفاتورة' : 'Upload invoice'}
                      </button>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => createShipment(order)}
                        disabled={loading}
                        className="bg-palma-navy text-white px-3 py-1.5 rounded-lg text-[9px] font-bold hover:bg-palma-primary transition shadow-sm flex items-center gap-1.5"
                      >
                        <Truck className="w-3 h-3" /> {t.common.ship}
                      </button>
                    )}
                    {(order.shipmentId || order.delivery_id) && order.status !== 'CANCELLED' && (
                      <>
                        {(order.delivery_id || order.shipmentId || '').toString().startsWith('sim-') && (
                          <span className="text-[9px] text-amber-600 font-medium" title={lang === 'ar' ? 'شحنة محاكاة — أضف LOGESTECHS_EMAIL و LOGESTECHS_PASSWORD في .env أو Render ثم أعد تشغيل السيرفر / Redeploy' : 'Simulated — add LOGESTECHS_EMAIL and LOGESTECHS_PASSWORD in .env or Render, then restart / Redeploy'}>
                            {lang === 'ar' ? 'محاكاة' : 'Sim'}
                          </span>
                        )}
                        <button
                          onClick={() => handleCheckStatus(order)}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-palma-primary hover:bg-palma-primaryLight rounded-xl border border-palma-primary/30 bg-white shadow-sm transition"
                          title={t.common.checkStatus}
                        >
                          <Search className="w-3.5 h-3.5" />
                          {lang === 'ar' ? 'مراقبة حالة الطلب' : 'Track status'}
                        </button>
                        <button
                          onClick={() => handleCancelShipment(order)}
                          disabled={loading}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100 bg-white shadow-sm"
                          title={t.common.cancelShipment}
                        >
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
);
