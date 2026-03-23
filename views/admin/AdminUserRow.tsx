/**
 * Memoized user row for Admin Users tab. Extracted from AdminView for lazy tab split.
 */

import React from 'react';
import { Check, X, Shield, Database, Globe, Trash2, Eye } from 'lucide-react';
import type { AdminUser } from './AdminViewContext';
import type { Language } from '../../translations';
import { translations } from '../../translations';

interface AdminUserRowProps {
  user: AdminUser;
  isProcessing: boolean;
  lang: Language;
  t: (typeof translations)[keyof typeof translations];
  onStatusChange: (userId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING') => void;
  onViewProfile: ((id: string) => void) | undefined;
  onRestore: (user: AdminUser) => void;
  onOpenDelete: (user: AdminUser) => void;
}

export const AdminUserRow = React.memo(function AdminUserRow({
  user,
  isProcessing,
  lang,
  t,
  onStatusChange,
  onViewProfile,
  onRestore,
  onOpenDelete,
}: AdminUserRowProps) {
  const isSuspended = user.status === 'SUSPENDED';
  const isDeleted = user.status === 'DELETED';
  const isApproved =
    (user.status === 'APPROVED' || user.status === 'ACTIVE' || (user as any).isApproved) && !isSuspended && !isDeleted;
  const statusLabel = isDeleted
    ? lang === 'ar'
      ? 'محذوف (مسودة 30 يوم)'
      : 'Deleted (30-day draft)'
    : isSuspended
      ? lang === 'ar'
        ? 'موقوف'
        : 'Suspended'
      : isApproved
        ? t.common.approved
        : t.common.pending;
  const statusColor = isDeleted
    ? 'bg-slate-100 text-slate-500 border-slate-200'
    : isSuspended
      ? 'bg-red-50 text-red-600 border-red-100'
      : isApproved
        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
        : 'bg-amber-50 text-amber-600 border-amber-100';
  const getSourceLabel = (u: AdminUser) => {
    if (u.source === 'API')
      return { label: t.common.realData, icon: <Database className="w-3 h-3" />, color: 'bg-slate-100 text-slate-500' };
    if (u.source && u.source === 'CLOUD')
      return { label: 'Database', icon: <Globe className="w-3 h-3" />, color: 'bg-indigo-50 text-indigo-600' };
    return {
      label: 'Registered',
      icon: <Check className="w-3 h-3" />,
      color: 'bg-palma-primary/10 text-palma-primary',
    };
  };
  const sourceMeta = getSourceLabel(user);
  return (
    <tr className="hover:bg-slate-50/80 transition-colors group">
      <td className="px-8 py-5">
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md ${user.source === 'SEED' ? 'bg-slate-400' : 'bg-palma-navy'}`}
          >
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 leading-tight">{user.name}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-8 py-5">
        <span className="bg-white border border-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-600 uppercase tracking-wide shadow-sm">
          {t.roles[user.role as keyof typeof t.roles] || user.role}
        </span>
      </td>
      <td className="px-8 py-5">
        <span
          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${statusColor}`}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-8 py-5">
        <span
          className={`flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${sourceMeta.color}`}
        >
          {sourceMeta.icon}
          {sourceMeta.label}
        </span>
      </td>
      <td className="px-8 py-5">
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-palma-primary border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
            {(user.role === 'MERCHANT' || user.role === 'BROKER') && onViewProfile && (
              <button
                onClick={() => onViewProfile(user.id)}
                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                title={lang === 'ar' ? 'عرض الملف' : 'View profile'}
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {!isDeleted && !isApproved && !isSuspended && (
              <button
                onClick={() => onStatusChange(user.id, 'APPROVED')}
                className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
                title={t.common.approve}
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            {isSuspended && (user.role === 'MERCHANT' || user.role === 'BROKER') && !isDeleted && (
              <button
                onClick={() => onStatusChange(user.id, 'APPROVED')}
                className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
                title={lang === 'ar' ? 'إعادة التفعيل' : 'Reactivate'}
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            {!isDeleted && !isSuspended && user.status !== 'REJECTED' && (
              <button
                onClick={() => onStatusChange(user.id, 'REJECTED')}
                className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition"
                title={t.common.reject}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {(user.role === 'MERCHANT' || user.role === 'BROKER') && isApproved && !isDeleted && (
              <button
                onClick={() => onStatusChange(user.id, 'SUSPENDED')}
                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                title={lang === 'ar' ? 'تعليق المتجر' : 'Suspend store'}
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
            {isDeleted ? (
              <button
                onClick={() => onRestore(user)}
                className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
                title={lang === 'ar' ? 'استرجاع المستخدم' : 'Restore user'}
              >
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onOpenDelete(user)}
                className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition"
                title={lang === 'ar' ? 'حذف المستخدم (مسودة 30 يوم)' : 'Delete user (30-day draft)'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
});
