/**
 * Memoized product row for Admin Products tab. Extracted from AdminView for lazy tab split.
 */

import React from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { ProductConditionBadge } from '../../components/ProductConditionBadge';
import type { Language } from '../../translations';
import { translations } from '../../translations';

interface AdminProductRowProps {
  product: any;
  isProcessing: boolean;
  t: (typeof translations)[keyof typeof translations];
  lang: Language;
  onViewProduct: ((id: string) => void) | undefined;
  onViewProfile: ((id: string) => void) | undefined;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string, name: string) => void;
}

export const AdminProductRow = React.memo(function AdminProductRow({
  product: p,
  isProcessing,
  t,
  lang,
  onViewProduct,
  onViewProfile,
  onToggleActive,
  onDelete,
}: AdminProductRowProps) {
  const isActive = p.is_active !== false && p.status !== 'inactive';
  return (
    <tr className="hover:bg-slate-50/80 transition-colors group">
      <td className="px-6 py-4">
        <div
          className="flex items-center gap-4 cursor-pointer hover:opacity-80"
          onClick={() => onViewProduct && onViewProduct(p.id)}
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            <img
              src={p.image_url || p.images?.[0] || 'https://placehold.co/100'}
              loading="lazy"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-black text-slate-900 line-clamp-1 block">{p.title || p.name}</span>
            <div className="mt-1">
              <ProductConditionBadge condition={p.condition || 'new'} lang={lang} />
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <button
          type="button"
          onClick={() => {
            const mid = p.merchant_id;
            if (mid && onViewProfile) onViewProfile(mid);
          }}
          className="text-xs font-bold text-slate-700 hover:text-palma-primary hover:underline text-left"
        >
          {p.merchant_name ?? '-'}
        </button>
      </td>
      <td className="px-6 py-4 text-xs text-slate-600">{p.category || '-'}</td>
      <td className="px-6 py-4 text-sm font-black text-palma-primary">₪{p.price ?? p.price_ils ?? 0}</td>
      <td className="px-6 py-4">
        <span
          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
        >
          {isActive ? t.common.active : t.common.inactive}
        </span>
      </td>
      <td className="px-6 py-4">
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-palma-primary border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onToggleActive(p.id, isActive)}
              className="p-2 rounded-lg hover:bg-slate-100 transition"
              title={isActive ? (lang === 'ar' ? 'إخفاء' : 'Hide') : lang === 'ar' ? 'إظهار' : 'Show'}
            >
              {isActive ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-emerald-600" />}
            </button>
            <button
              onClick={() => onDelete(p.id, p.title || p.name)}
              className="p-2 rounded-lg hover:bg-red-50 transition"
              title={t.common.delete}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
});
