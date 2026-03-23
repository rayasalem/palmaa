import React, { useMemo, useState } from 'react';
import Logo from '../components/Logo';
import { Globe, ChevronDown, ArrowRight, Tag, LayoutGrid } from 'lucide-react';
import type { Language } from '../translations';
import { translations } from '../translations';
import type { MediatorMarketingItem } from '../types/mediatorMarketing';
import mockData from '../data/mediatorMarketingMock.json';
import { getOffers, type ShopOffer } from '../services/offersApi';
import { secureImageSrc, setImageToPlaceholder } from '../utils/secureUrl';
import { productIdFromLink } from '../components/MediatorMarketingSection';
import type { User } from '../types';

const LANG_LABELS: Record<Language, string> = { ar: 'العربية', en: 'English', he: 'עברית' };
const IMG_FALLBACK = 'https://placehold.co/400x400?text=Palma';

export interface MediatorShowcasePageProps {
  lang: Language;
  setLang: (l: Language) => void;
  onBack: () => void;
  onProductClick: (productId: string) => void;
  /** Guests: open auth. Logged-in: optional profile navigation */
  onLoginClick: () => void;
  /** When set, navbar shows profile instead of login */
  currentUser?: User | null;
  onProfileClick?: () => void;
}

/**
 * Dedicated mediator marketing page: all curated products + active offers + filters.
 */
const MediatorShowcasePage: React.FC<MediatorShowcasePageProps> = ({
  lang,
  setLang,
  onBack,
  onProductClick,
  onLoginClick,
  currentUser,
  onProfileClick,
}) => {
  const t = translations[lang];
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [offerTypeFilter, setOfferTypeFilter] = useState<'all' | 'product' | 'custom'>('all');
  const [offers, setOffers] = useState<ShopOffer[]>([]);

  const items = mockData as MediatorMarketingItem[];

  React.useEffect(() => {
    getOffers().then((res) => {
      if (res.success && res.offers) setOffers(res.offers);
    });
  }, []);

  const categories = useMemo(() => {
    const s = new Set(items.map((i) => i.category));
    return ['all', ...Array.from(s).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return items;
    return items.filter((i) => i.category === categoryFilter);
  }, [items, categoryFilter]);

  const filteredOffers = useMemo(() => {
    if (offerTypeFilter === 'all') return offers;
    return offers.filter((o) => o.type === offerTypeFilter);
  }, [offers, offerTypeFilter]);

  const pageTitle =
    lang === 'ar'
      ? 'تسويق الوسيط — جميع التوصيات'
      : lang === 'he'
        ? 'שיווק סוכן — כל ההמלצות'
        : 'Mediator marketing — all picks';

  return (
    <div className="min-h-screen bg-[#f8f7fa] font-sans text-palma-text" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <nav
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-palma-border shadow-sm"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <div className="max-w-[1600px] mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-palma-primaryLight/40 text-palma-muted shrink-0"
              aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
            >
              <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </button>
            <button type="button" onClick={onBack} className="cursor-pointer">
              <Logo size="small" />
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen((p) => !p)}
                className="flex items-center gap-1 min-h-[44px] px-2 text-xs font-bold uppercase text-slate-500"
              >
                <Globe className="w-4 h-4" />
                {LANG_LABELS[lang]}
                <ChevronDown className={`w-4 h-4 transition ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {langMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" aria-hidden onClick={() => setLangMenuOpen(false)} />
                  <div className="absolute top-full end-0 mt-1 min-w-[130px] py-1 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                    {(['ar', 'en', 'he'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setLang(l);
                          setLangMenuOpen(false);
                        }}
                        className={`block w-full text-start px-3 py-2.5 text-sm ${l === lang ? 'bg-palma-primaryLight text-palma-primary' : 'hover:bg-slate-50'}`}
                      >
                        {LANG_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {currentUser && onProfileClick ? (
              <button
                type="button"
                onClick={onProfileClick}
                className="btn-primary min-h-[44px] px-4 text-xs font-bold uppercase rounded-xl"
              >
                {lang === 'ar' ? 'الملف الشخصي' : lang === 'he' ? 'פרופיל' : 'Profile'}
              </button>
            ) : (
              <button type="button" onClick={onLoginClick} className="btn-primary min-h-[44px] px-4 text-xs font-bold uppercase rounded-xl">
                {t.auth.login}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 pb-24">
        <header className="mb-8 text-center max-w-2xl mx-auto">
          <p className="text-4xl mb-2" aria-hidden>
            ✨
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-palma-navy">{pageTitle}</h1>
          <p className="text-sm text-slate-600 mt-2">
            {lang === 'ar'
              ? 'منتجات وعروض مختارة من قبل مسوّق معتمد — تصفّح حسب التصنيف أو نوع العرض.'
              : lang === 'he'
                ? 'מוצרים ומבצעים נבחרים על ידי סוכן מאושר.'
                : 'Products and campaigns curated by a certified mediator — filter by category or offer type.'}
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-8 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <LayoutGrid className="w-5 h-5 text-palma-primary shrink-0" aria-hidden />
            <label htmlFor="mediator-cat-filter" className="sr-only">
              {lang === 'ar' ? 'تصفية حسب التصنيف' : 'Filter by category'}
            </label>
            <select
              id="mediator-cat-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">{lang === 'ar' ? 'كل التصنيفات' : lang === 'he' ? 'כל הקטגוריות' : 'All categories'}</option>
              {categories
                .filter((c) => c !== 'all')
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Tag className="w-5 h-5 text-amber-600 shrink-0" aria-hidden />
            <label htmlFor="mediator-offer-filter" className="sr-only">
              {lang === 'ar' ? 'نوع العرض' : 'Offer type'}
            </label>
            <select
              id="mediator-offer-filter"
              value={offerTypeFilter}
              onChange={(e) => setOfferTypeFilter(e.target.value as 'all' | 'product' | 'custom')}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 bg-amber-50/50 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="all">{lang === 'ar' ? 'كل العروض' : lang === 'he' ? 'כל המבצעים' : 'All offer types'}</option>
              <option value="product">{lang === 'ar' ? 'عروض على منتج' : 'Product offers'}</option>
              <option value="custom">{lang === 'ar' ? 'عروض مخصصة' : 'Custom campaigns'}</option>
            </select>
          </div>
        </div>

        {/* Offers */}
        {filteredOffers.length > 0 && (
          <section className="mb-12" aria-labelledby="mediator-offers-heading">
            <h2 id="mediator-offers-heading" className="text-lg font-black text-palma-navy mb-4">
              {lang === 'ar' ? 'العروض النشطة' : lang === 'he' ? 'מבצעים פעילים' : 'Active campaigns'}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOffers.map((o) => (
                <li key={o.id || o.title}>
                  <article className="h-full rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                    <div className="relative aspect-[21/9] bg-slate-100">
                      <img
                        src={secureImageSrc(o.image_url || '', IMG_FALLBACK)}
                        alt={o.title || 'Offer'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={setImageToPlaceholder}
                      />
                      {o.discount_label != null && (
                        <span className="absolute top-2 start-2 px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-black">
                          {typeof o.discount_label === 'number' ? `${o.discount_label}%` : o.discount_label}
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-slate-900">{o.title}</h3>
                      {o.subtitle && <p className="text-sm text-slate-600 mt-1">{o.subtitle}</p>}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Product grid */}
        <section aria-labelledby="mediator-products-heading">
          <h2 id="mediator-products-heading" className="text-lg font-black text-palma-navy mb-4">
            {lang === 'ar' ? 'المنتجات المروّجة' : lang === 'he' ? 'מוצרים מקודמים' : 'Promoted products'}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map((item, idx) => {
              const pid = productIdFromLink(item.productLink);
              const badge = lang === 'en' ? item.badgeTextEn || 'Recommended by Mediator' : item.badgeText;
              const img = secureImageSrc(item.imageURL, IMG_FALLBACK);
              return (
                <li key={`${item.productName}-${idx}`}>
                  <article className="h-full rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-lg transition flex flex-col">
                    <button
                      type="button"
                      onClick={() => onProductClick(pid)}
                      className="text-start flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset"
                    >
                      <div className="relative aspect-[4/3] bg-slate-100">
                        <img
                          src={img}
                          alt={`${item.productName} — ${item.tagline}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={setImageToPlaceholder}
                        />
                        <span className="absolute top-2 end-2 px-2.5 py-1 rounded-lg text-[10px] font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-md max-w-[55%] text-center leading-tight">
                          {badge}
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{item.category}</span>
                        <h3 className="font-black text-slate-900 text-lg mt-1">{item.productName}</h3>
                        <p className="text-sm text-slate-600 mt-1 flex-1 line-clamp-2">{item.tagline}</p>
                        <p className="mt-3 text-xl font-black text-emerald-700">₪{item.price.toFixed(item.price % 1 === 0 ? 0 : 2)}</p>
                      </div>
                    </button>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default MediatorShowcasePage;
