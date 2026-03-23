/**
 * Reusable card for shop offers (admin offers) in catalog and customer shop.
 */

import React from 'react';
import type { ShopOffer } from '../services/offersApi';
import type { Language } from '../translations';
import { secureImageSrc, setImageToPlaceholder } from '../utils/secureUrl';

export interface OfferCardProps {
  offer: ShopOffer;
  lang: Language;
  onShopNow: () => void;
  className?: string;
}

export const OfferCard = React.memo(function OfferCard({
  offer: o,
  lang,
  onShopNow,
  className = '',
}: OfferCardProps) {
  return (
    <button
      type="button"
      onClick={onShopNow}
      className={`min-w-[180px] max-w-[220px] rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex-shrink-0 text-left ${className}`}
    >
      {o.image_url ? (
        <div className="aspect-square overflow-hidden bg-slate-100">
          <img
            src={secureImageSrc(o.image_url, 'https://placehold.co/400x400?text=Offer')}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={setImageToPlaceholder}
          />
        </div>
      ) : null}
      <div className="p-3">
        <p className="text-xs text-slate-600 line-clamp-2">{o.subtitle || o.title}</p>
        <span className="text-xl font-black text-emerald-600">%{o.discount_label ?? 0}</span>
        {(o.scope === 'all' || o.scope === 'category') && (
          <p className="text-xs font-bold text-emerald-600 mt-1">
            {lang === 'ar' ? 'خصم على كل السلة' : lang === 'he' ? 'הנחה על כל העגלה' : 'Discount on entire cart'}
          </p>
        )}
      </div>
      <div className="px-3 pb-3">
        <span className="inline-block w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center">
          {lang === 'ar' ? 'تسوق الآن — الخصم يُطبّق تلقائياً' : lang === 'he' ? 'קנה עכשיו — ההנחה אוטומטית' : 'Shop Now — discount applied automatically'}
        </span>
      </div>
    </button>
  );
});
