/**
 * Admin Treasury tab: pending withdrawals. Lazy-loaded.
 */

import React from 'react';
import { Banknote } from 'lucide-react';
import { useAdminView } from './AdminViewContext';

export default function AdminTreasuryTab() {
  const { t, allUsers, pendingWithdrawals, handleWithdrawal } = useAdminView();

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3 mb-8">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span> {t.common.pendingWithdrawals} (
        {pendingWithdrawals.length})
      </h3>
      {pendingWithdrawals.length === 0 ? (
        <div className="p-20 bg-white rounded-[3rem] border border-slate-100 text-center shadow-soft">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
            <Banknote className="w-8 h-8" />
          </div>
          <p className="text-palma-navy font-bold text-lg">{t.common.treasuryClear}</p>
          <p className="text-palma-muted text-sm uppercase tracking-wide mt-1">{t.common.noPendingWithdrawals}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-soft border border-slate-100 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {t.common.requestID}
                </th>
                <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {t.common.users}
                </th>
                <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {t.common.amount}
                </th>
                <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {t.common.date}
                </th>
                <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingWithdrawals.map((w) => {
                const reqUser = allUsers.find((u) => u.id === w.userId);
                return (
                  <tr key={w.id} className="hover:bg-slate-50 transition group">
                    <td className="px-8 py-5 text-xs font-mono text-slate-500 font-bold">{w.id.split('-')[0]}...</td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-black text-slate-900">{reqUser?.name || w.userId}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {reqUser ? t.roles[reqUser.role as keyof typeof t.roles] : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-lg font-black text-palma-primary">{w.amount} ₪</td>
                    <td className="px-8 py-5 text-xs text-slate-500 font-bold">
                      {new Date(w.date).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 flex gap-3">
                      <button
                        onClick={() => handleWithdrawal(w.id, 'APPROVED')}
                        className="bg-palma-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition shadow-lg shadow-soft"
                      >
                        {t.common.approve}
                      </button>
                      <button
                        onClick={() => handleWithdrawal(w.id, 'REJECTED')}
                        className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition"
                      >
                        {t.common.reject}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
