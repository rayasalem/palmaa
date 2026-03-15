/**
 * Reusable product card for catalog grid and horizontal strips.
 */

import React from 'react';
import { Product } from '../types';
import { ProductConditionBadge } from './ProductConditionBadge';
import { marketStore } from '../store';
import type { Language } from '../translations';

export interface ProductCardProps {
  product: Product;
  lang: Language;
  onProductClick: (id: string) => void;
  onMouseEnter?: () => void;
  variant?: 'grid' | 'compact';
  className?: string;
}

function getDisplayPrice(p: Product) {
  const base = p.price ?? p.price_ils ?? 0;
  const final = (p as any).final_price != null ? (p as any).final_price : base;
  const hasDiscount = final < base;
  const discountPercent =
    (p as any).discount_percent != null
      ? Number((p as any).discount_percent)
      : base > 0 && hasDiscount
        ? Math.round((1 - final / base) * 100)
        : undefined;
  return { base, final, hasDiscount, discountPercent };
}

function getFlashLabel(p: Product, lang: Language): string | null {
  const discountEndsAt = (p as any).discount_ends_at || (p as any).discountEndsAt || (p as any).flash_sale_ends_at;
  if (!discountEndsAt) return null;
  const end = new Date(discountEndsAt);
  const now = new Date();
  if (end.getTime() <= now.getTime()) return null;
  const diffMs = end.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0)
    return lang === 'ar' ? `عرض لفترة محدودة • ${diffDays} يوم` : lang === 'he' ? `הטבה • ${diffDays} ימים` : `Ends in ${diffDays} days`;
  if (diffHours > 0)
    return lang === 'ar' ? `ينتهي خلال ${diffHours} ساعة` : lang === 'he' ? `מסתיים בעוד ${diffHours} שעות` : `Ends in ${diffHours}h`;
  if (diffMinutes > 0)
    return lang === 'ar' ? `ينتهي خلال ${diffMinutes} دقيقة` : lang === 'he' ? `מסתיים בעוד ${diffMinutes} דקות` : `Ends in ${diffMinutes}m`;
  return null;
}

export const ProductCard = React.memo(function ProductCard({
  product: p,
  lang,
  onProductClick,
  onMouseEnter,
  variant = 'grid',
  className = '',
}: ProductCardProps) {
  const mName = marketStore.getMerchantNameByUserId(p.merchant_id || p.merchantId || '');
  const { average, count } = marketStore.getProductRating(p.id);
  const displayImage = p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
  const shortDesc = p.shortDescription || (p.description || '').slice(0, 60) || mName;
  const stock = p.stock ?? 0;
  const { base: basePrice, final: finalPrice, hasDiscount, discountPercent } = getDisplayPrice(p);
  const flashLabel = variant === 'grid' ? getFlashLabel(p, lang) : null;

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => onProductClick(p.id)}
        onMouseEnter={onMouseEnter}
        onFocus={onMouseEnter}
        className={`min-w-[180px] max-w-[220px] bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex-shrink-0 text-left overflow-hidden group ${className}`}
      >
        <div className="aspect-[4/3] overflow-hidden bg-slate-50 relative">
          <img
            src={displayImage}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            alt={p.name}
          />
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-red-600 text-white px-2 py-0.5 rounded-sm text-[10px] font-black">
              %{discountPercent ?? Math.round((1 - finalPrice / basePrice) * 100)} {lang === 'ar' ? 'خصم' : 'off'}
            </span>
          )}
          {(p.rating ?? 0) > 0 && (
            <span className="absolute bottom-2 left-2 bg-amber-400 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">★ {Number(p.rating).toFixed(1)}</span>
          )}
        </div>
        <div className="p-3 space-y-1">
          <p className="text-[11px] font-bold text-palma-navy line-clamp-2">{p.name}</p>
          <p className="text-[11px] font-semibold text-palma-primary">
            {hasDiscount ? <><span className="text-red-600 font-bold">₪{finalPrice}</span> <span className="line-through text-slate-400">₪{basePrice}</span></> : <>₪{basePrice}</>}
          </p>
        </div>
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onProductClick(p.id)}
      onMouseEnter={onMouseEnter}
      onFocus={onMouseEnter}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onProductClick(p.id); }}
      className={`bg-white rounded-2xl overflow-hidden border border-palma-border shadow-card hover:shadow-card-hover transition-all duration-300 group cursor-pointer flex flex-col h-full hover:-translate-y-1 ${className}`}
    >
      <div className="aspect-square overflow-hidden bg-slate-50 relative">
        <img
          src={displayImage}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt={p.name}
        />
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 rounded-sm text-xs font-black shadow-lg">
            {discountPercent != null && discountPercent > 0 ? <span>%{discountPercent}-</span> : <span>{lang === 'ar' ? 'تخفيضات!' : 'Sale!'}</span>}
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg text-palma-navy border border-slate-200/80">
          {hasDiscount ? (
            <span className="flex items-baseline gap-1.5"><span className="text-sm font-bold text-red-600">₪{finalPrice}</span><span className="line-through text-[11px] text-slate-400">₪{basePrice}</span></span>
          ) : (
            <>₪{basePrice}</>
          )}
        </div>
        {flashLabel && (
          <div className="absolute bottom-3 left-3 right-3 bg-red-600/95 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg flex items-center justify-between gap-2">
            <span className="truncate">{flashLabel}</span><span className="text-xs">⏳</span>
          </div>
        )}
        {average >= 4.5 && count >= 1 && <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 px-2 py-0.5 rounded-lg text-[9px] font-black">⭐</div>}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-black text-palma-navy text-base mb-1 group-hover:text-palma-primary transition-colors line-clamp-2">{p.name}</h4>
        <p className="text-xs text-slate-500 mb-2 line-clamp-1">{shortDesc}</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {stock > 0 && <span className="text-[10px] font-bold text-slate-600">{lang === 'ar' ? `متوفر: ${stock}` : `Available: ${stock}`}</span>}
          <ProductConditionBadge condition={p.condition} lang={lang} className="shrink-0" />
        </div>
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2 min-h-0">
          <span className="text-xs sm:text-[10px] font-bold text-slate-400 truncate min-w-0" title={mName}>{mName}</span>
          <span className="w-8 h-8 rounded-full bg-palma-navy text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow">→</span>
        </div>
      </div>
    </div>
  );
});
