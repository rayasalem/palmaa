/**
 * Admin Orders tab: list, refresh. Lazy-loaded.
 */

import React from 'react';
import { Database } from 'lucide-react';
import { useAdminView } from './AdminViewContext';

export default function AdminOrdersTab() {
  const { t, lang, orders, ordersLoading, loadOrders } = useAdminView();

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex justify-between items-center">
        <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-palma-primary animate-pulse"></span>
          {lang === 'ar' ? 'كل الطلبات' : 'All Orders'} ({orders.length})
        </h3>
        <button
          onClick={loadOrders}
          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase transition-all"
        >
          {lang === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>
      {ordersLoading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{t.common.loading}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
          <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{t.common.noData}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left rtl:text-right">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    {t.common.orderRef}
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    {t.common.customer}
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    {t.common.amount}
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    {t.common.status}
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    {t.common.date}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold">
                {orders.map((o) => {
                  const status = (o.status || o.payment_status || 'PENDING').toUpperCase();
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-600">{o.id}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-900">{o.shipping_name || o.recipient_name || '-'}</span>
                        <span className="block text-xs text-slate-500">{o.shipping_phone || o.phone || ''}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-palma-primary">
                        ₪{o.total_amount ?? o.amount ?? 0}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase border ${
                            status === 'CANCELLED'
                              ? 'bg-red-50 text-red-600 border-red-100'
                              : status === 'PAID' || status === 'DELIVERED' || status === 'ACCEPTED'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
