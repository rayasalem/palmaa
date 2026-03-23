import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { MediatorMarketingItem } from '../types/mediatorMarketing';
import type { Language } from '../translations';
import { secureImageSrc, setImageToPlaceholder } from '../utils/secureUrl';

const IMG_FALLBACK = 'https://placehold.co/400x400?text=Palma';

export interface MediatorMarketingSectionProps {
  lang: Language;
  items: MediatorMarketingItem[];
  /** Called with product id extracted from productLink */
  onProductClick: (productId: string) => void;
  onViewMore: () => void;
  /** Optional section id for skip links */
  sectionId?: string;
}

/** Parse `productLink` like `product/demo-prod-زيت زيتون 1 لتر` → product id for routing */
export function productIdFromLink(productLink: string): string {
  const cleaned = productLink.replace(/^#\/?/, '').trim();
  if (cleaned.startsWith('product/')) {
    return decodeURIComponent(cleaned.slice('product/'.length));
  }
  const parts = cleaned.split('/').filter(Boolean);
  if (parts[0] === 'product' && parts.length > 1) {
    return decodeURIComponent(parts.slice(1).join('/'));
  }
  return decodeURIComponent(cleaned);
}

/**
 * Mediator marketing strip — mobile-first horizontal scroll; grid on xl.
 * Visible to all visitors; badge overlay on images.
 */
export const MediatorMarketingSection: React.FC<MediatorMarketingSectionProps> = ({
  lang,
  items,
  onProductClick,
  onViewMore,
  sectionId = 'mediator-marketing',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRtl = lang !== 'en';
  const title =
    lang === 'ar'
      ? 'اختيارات الوسيط'
      : lang === 'he'
        ? 'בחירות הסוכן השיווקי'
        : 'Mediator picks';
  const subtitle =
    lang === 'ar'
      ? 'منتجات مختارة بعناية — توصيات مسوّق معتمد'
      : lang === 'he'
        ? 'מוצרים נבחרים — המלצות סוכן מאושר'
        : 'Curated products — trusted mediator recommendations';

  const scrollByDir = (dir: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === 'next' ? (isRtl ? -delta : delta) : isRtl ? delta : -delta, behavior: 'smooth' });
  };

  return (
    <section
      id={sectionId}
      className="w-full rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-emerald-50/40 shadow-md overflow-hidden"
      aria-labelledby={`${sectionId}-heading`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg"
              aria-hidden
            >
              <Sparkles className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <div>
              <h2 id={`${sectionId}-heading`} className="text-lg sm:text-xl font-black text-palma-navy tracking-tight">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 max-w-xl">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="flex rounded-full bg-white/90 border border-amber-200/60 shadow-sm">
              <button
                type="button"
                onClick={() => scrollByDir('prev')}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-amber-800 hover:bg-amber-50 rounded-s-full transition"
                aria-label={lang === 'ar' ? 'السابق' : lang === 'he' ? 'הקודם' : 'Previous'}
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => scrollByDir('next')}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-amber-800 hover:bg-amber-50 rounded-e-full transition"
                aria-label={lang === 'ar' ? 'التالي' : lang === 'he' ? 'הבא' : 'Next'}
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
            <button
              type="button"
              onClick={onViewMore}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-palma-primary text-white text-sm font-black shadow-md hover:bg-emerald-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {lang === 'ar' ? 'عرض المزيد' : lang === 'he' ? 'הצג עוד' : 'View more'}
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          role="list"
          aria-label={title}
        >
          {items.map((item, idx) => {
            const pid = productIdFromLink(item.productLink);
            const badge =
              lang === 'en' ? item.badgeTextEn || 'Recommended by Mediator' : item.badgeText;
            const img = secureImageSrc(item.imageURL, IMG_FALLBACK);
            return (
              <article
                key={`${item.productName}-${idx}`}
                role="listitem"
                className="snap-start shrink-0 w-[min(100%,280px)] sm:w-[260px] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
              >
                <button
                  type="button"
                  onClick={() => onProductClick(pid)}
                  className="w-full text-start block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-t-2xl"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <img
                      src={img}
                      alt={`${item.productName} — ${item.tagline}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={setImageToPlaceholder}
                    />
                    <span
                      className="absolute top-2 end-2 max-w-[calc(100%-1rem)] px-2.5 py-1 rounded-lg text-xs sm:text-xs font-black uppercase tracking-wide text-white shadow-lg bg-gradient-to-r from-amber-500 to-orange-600 border border-white/30"
                      aria-hidden={false}
                    >
                      {badge}
                    </span>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 leading-snug">{item.productName}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.tagline}</p>
                    <p className="mt-2 text-base font-black text-emerald-700">
                      ₪{item.price.toFixed(item.price % 1 === 0 ? 0 : 2)}
                    </p>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
