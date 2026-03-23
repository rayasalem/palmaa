import React from 'react';
import type { Language } from '../translations';

type ConditionValue = 'new' | 'used_like_new' | 'used_good' | 'used_fair' | 'refurbished' | 'open_box' | 'vintage';

interface ConditionMeta {
  labelAr: string;
  labelEn: string;
  labelHe: string;
  className: string;
}

const CONDITION_META: Record<ConditionValue, ConditionMeta> = {
  new: {
    labelAr: 'جديد',
    labelEn: 'New',
    labelHe: 'חדש',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  used_like_new: {
    labelAr: 'مستعمل – كالجديد',
    labelEn: 'Used – Like New',
    labelHe: 'משומש – כמו חדש',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  used_good: {
    labelAr: 'مستعمل – حالة جيدة',
    labelEn: 'Used – Good',
    labelHe: 'משומש – מצב טוב',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  used_fair: {
    labelAr: 'مستعمل – حالة مقبولة',
    labelEn: 'Used – Fair',
    labelHe: 'משומש – מצב סביר',
    className: 'bg-slate-200 text-slate-800 border-slate-300',
  },
  refurbished: {
    labelAr: 'مجدّد',
    labelEn: 'Refurbished',
    labelHe: 'מחודש',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  open_box: {
    labelAr: 'فتح صندوق فقط',
    labelEn: 'Open Box',
    labelHe: 'קופסה פתוחה',
    className: 'bg-palma-primary/10 text-palma-navy border-palma-primary/30',
  },
  vintage: {
    labelAr: 'فنتاج',
    labelEn: 'Vintage',
    labelHe: 'וינטג׳',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export interface ProductConditionBadgeProps {
  condition?: string | null;
  lang: Language;
  className?: string;
}

export const ProductConditionBadge = React.memo(function ProductConditionBadge({
  condition,
  lang,
  className,
}: ProductConditionBadgeProps) {
  const value = condition || 'new';
  const meta = CONDITION_META[value as ConditionValue];
  if (!meta) {
    // Legacy or unknown: show generic "used" style
    const fallback = {
      labelAr: 'مستعمل',
      labelEn: 'Used',
      labelHe: 'משומש',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    const label = lang === 'he' ? fallback.labelHe : lang === 'en' ? fallback.labelEn : fallback.labelAr;
    const baseClasses =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-widest border';
    return <span className={`${baseClasses} ${fallback.className} ${className ?? ''}`}>{label}</span>;
  }

  const label = lang === 'he' ? meta.labelHe : lang === 'en' ? meta.labelEn : meta.labelAr;

  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-widest border';

  return <span className={`${baseClasses} ${meta.className} ${className ?? ''}`}>{label}</span>;
});
