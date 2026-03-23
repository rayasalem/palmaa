import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { marketStore } from '../store';
import { productService } from '../services/productService';
import { Product, PRODUCT_CATEGORIES, CATEGORY_EMOJI } from '../types';
import Logo from '../components/Logo';
import { ProductConditionBadge } from './ProductConditionBadge';
import { prefetchComponent, prefetchProductData } from '../prefetch';
import { Language, translations } from '../translations';
import { ArrowRight, ShoppingCart, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { getOffers, type ShopOffer } from '../services/offersApi';
import { ProductCard } from './ProductCard';
import { OfferCard } from './OfferCard';
import { secureImageSrc, setImageToPlaceholder } from '../utils/secureUrl';
import { MediatorMarketingSection } from './MediatorMarketingSection';
import type { MediatorMarketingItem } from '../types/mediatorMarketing';
import mediatorMarketingMock from '../data/mediatorMarketingMock.json';

const RECENT_IMG_FALLBACK = 'https://placehold.co/300x200?text=No+Image';

const CONDITION_OPTIONS = [
  'new',
  'used_like_new',
  'used_good',
  'used_fair',
  'refurbished',
  'open_box',
  'vintage',
] as const;

interface PublicCatalogProps {
  onBack: () => void;
  onProductClick: (id: string) => void;
  onLoginClick: () => void;
  /** عند true يُخفى ناف بار الكتالوج (يُستخدم عند عرضه داخل Layout للزبون المسجّل) */
  embeddedInLayout?: boolean;
}

const PublicCatalog: React.FC<PublicCatalogProps> = ({ onBack, onProductClick, onLoginClick, embeddedInLayout }) => {
  const lang: Language =
    typeof document !== 'undefined' &&
    (document.documentElement.lang === 'en' || document.documentElement.lang === 'he')
      ? document.documentElement.lang
      : 'ar';
  const t = translations[lang];

  // Filter States (كل البيانات محفوظة — لا حذف)
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('all');
  const [conditionId, setConditionId] = useState<string>('all');
  const [merchantId, setMerchantId] = useState<string>('all');
  const [availability, setAvailability] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // List States — server-side page only (no client "load all then filter")
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{ cursor_created_at: string; cursor_id: string } | null>(null);
  const nextCursorRef = useRef<{ cursor_created_at: string; cursor_id: string } | null>(null);
  nextCursorRef.current = nextCursor;
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;
  /** عروض الإدمن (قسم تخفيضات) */
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const catalogProductsRef = useRef<HTMLDivElement | null>(null);

  // Load auxiliary static data — عرض كل التصنيفات المفصّلة مع الإيموجي
  const categories = PRODUCT_CATEGORIES;

  // Sync with URL params on mount (لا حذف أي معامل)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) setSearchTerm(params.get('q')!);
    if (params.get('minP')) setMinPrice(params.get('minP')!);
    if (params.get('maxP')) setMaxPrice(params.get('maxP')!);
    if (params.get('minR')) setMinRating(parseInt(params.get('minR')!));
    if (params.get('sort')) setSortBy(params.get('sort')!);
    if (params.get('category')) setCategoryId(params.get('category')!);
    if (params.get('condition')) setConditionId(params.get('condition')!);
  }, []);
  useEffect(() => {
    setPage(1);
    setNextCursor(null);
  }, [categoryId, conditionId, merchantId, availability, minPrice, maxPrice, minRating, searchTerm]);

  // Server-side catalog page: filtering, sorting, pagination (no "load all then filter")
  const fetchAndFilterProducts = useCallback(async (pageNum = 1, append = false) => {
    setIsLoading(true);
    try {
      const offset = (pageNum - 1) * PAGE_SIZE;
      const cursor = pageNum > 1 && sortBy === 'newest' && nextCursorRef.current ? nextCursorRef.current : null;
      const res = await productService.getCatalogPage({
        limit: PAGE_SIZE,
        offset: cursor ? undefined : offset,
        cursor_created_at: cursor?.cursor_created_at,
        cursor_id: cursor?.cursor_id,
        q: searchTerm || undefined,
        category: categoryId && categoryId !== 'all' ? categoryId : undefined,
        sort: sortBy === 'newest' ? 'newest' : sortBy === 'price_asc' ? 'price_asc' : 'price_desc',
      });
      let data = res.products;
      if (availability === 'in_stock') data = data.filter((p) => (p.stock ?? 0) > 0);
      if (availability === 'out_of_stock') data = data.filter((p) => (p.stock ?? 0) <= 0);
      if (minPrice || maxPrice) {
        const min = minPrice ? parseFloat(minPrice) : undefined;
        const max = maxPrice ? parseFloat(maxPrice) : undefined;
        if (min != null && !Number.isNaN(min)) data = data.filter((p) => (p.price ?? p.price_ils ?? 0) >= min);
        if (max != null && !Number.isNaN(max)) data = data.filter((p) => (p.price ?? p.price_ils ?? 0) <= max);
      }
      setFilteredProducts(append ? (prev) => [...prev, ...data] : data);
      setHasMore(!!(res.next_cursor_created_at && res.next_cursor_id));
      setNextCursor(res.next_cursor_created_at && res.next_cursor_id ? { cursor_created_at: res.next_cursor_created_at, cursor_id: res.next_cursor_id } : null);
    } catch (e) {
      console.error('Error fetching catalog', e);
      if (!append) setFilteredProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, minPrice, maxPrice, sortBy, categoryId, availability]);

  // Execute fetch when filters or page change (page 1 when filters change)
  useEffect(() => {
    fetchAndFilterProducts(page, page > 1);
  }, [page, fetchAndFilterProducts]);

  useEffect(() => {
    getOffers().then((res) => {
      if (res.success && res.offers) setOffers(res.offers);
    });
  }, []);

  /** منتجات جديدة — من الصفحة الحالية (server-side list) */
  const newProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 8);
  }, [filteredProducts]);

  /** منتجات عليها خصم — تظهر في قسم العروض مع عروض الإدمن */
  const discountProducts = useMemo(() => {
    return filteredProducts.filter((p) => {
      const base = p.price ?? p.price_ils ?? 0;
      const final = (p as any).final_price != null ? (p as any).final_price : base;
      return final < base && base > 0;
    }).slice(0, 8);
  }, [filteredProducts]);

  /** المنتجات الشائعة — من الصفحة الحالية (أفضل تقييم أو الأحدث) */
  const popularProducts = useMemo(() => {
    return [...filteredProducts]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 8);
  }, [filteredProducts]);

  /** قائمة التجار من الصفحة الحالية (لفلتر العلامة/التاجر) */
  const merchantsList = useMemo(() => {
    const ids = [...new Set(filteredProducts.map((p) => p.merchant_id || p.merchantId).filter(Boolean))] as string[];
    return ids.map((id) => ({ id, name: marketStore.getMerchantNameByUserId(id) || id.slice(0, 8) }));
  }, [filteredProducts]);

  /** نطاق الأسعار من الصفحة الحالية (للعرض على السلايدر) */
  const priceRange = useMemo(() => {
    const prices = filteredProducts.map((p) => Number(p.price ?? p.price_ils ?? 0)).filter((n) => n > 0);
    if (prices.length === 0) return { min: 0, max: 500 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [filteredProducts]);

  const totalFiltered = filteredProducts.length;
  // Server-side page: show accumulated pages (no client slice)
  const paginatedProducts = filteredProducts;

  const resetFilters = () => {
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setSortBy('newest');
    setCategoryId('all');
    setConditionId('all');
    setMerchantId('all');
    setAvailability('all');
    setPage(1);
  };

  const removeFilter = (key: string) => {
    switch (key) {
      case 'category':
        setCategoryId('all');
        break;
      case 'condition':
        setConditionId('all');
        break;
      case 'rating':
        setMinRating(0);
        break;
      case 'price':
        setMinPrice('');
        setMaxPrice('');
        break;
      case 'search':
        setSearchTerm('');
        break;
      case 'merchant':
        setMerchantId('all');
        break;
      case 'availability':
        setAvailability('all');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7fa] font-sans text-palma-text" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {/* Navbar — يظهر فقط عند استخدام الكتالوج كصفحة مستقلة (ضيف)، وليس داخل Layout */}
      {!embeddedInLayout && (
        <nav
          className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-palma-border shadow-soft font-heading touch-target-min"
        style={{
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
        }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 sm:h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6">
            <button
              onClick={onBack}
              onMouseEnter={() => prefetchComponent('PublicWebsite')}
              onFocus={() => prefetchComponent('PublicWebsite')}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-3 hover:bg-palma-primaryLight/50 rounded-xl transition-all text-palma-muted hover:text-palma-primary group"
            >
              <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform rtl:group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={onBack}
              className="hidden sm:flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity text-palma-muted hover:text-palma-navy"
            >
              <Logo size="small" />
              <span className="text-xs font-bold uppercase tracking-wide">
                {lang === 'ar' ? 'الرئيسية' : lang === 'he' ? 'בית' : 'Home'}
              </span>
            </button>
            <div onClick={onBack} className="sm:hidden cursor-pointer hover:opacity-90 transition-opacity">
              <Logo size="small" />
            </div>
          </div>
          <button
            onClick={onLoginClick}
            className="btn-primary min-h-[44px] px-4 sm:px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            {t.auth.login}
          </button>
        </div>
      </nav>
      )}

      {/* 1. Hero — تسوق من بالما */}
      <section className="relative py-8 sm:py-12 px-4 border-b border-palma-border/50 bg-gradient-to-br from-palma-primary/10 via-palma-primaryLight/25 to-amber-50/40 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, var(--palma-primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }} aria-hidden />
        <div className="max-w-[1600px] mx-auto text-center relative">
          <p className="text-5xl sm:text-6xl mb-4 drop-shadow-sm" aria-hidden>🛒</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-palma-navy tracking-tight mb-3">
            {lang === 'ar' ? 'تسوق من بالما' : lang === 'he' ? 'קנה מפלמה' : 'Shop from Palma'}
          </h1>
          <p className="text-base sm:text-lg text-palma-muted font-medium max-w-xl mx-auto mb-8">
            {lang === 'ar'
              ? 'اكتشف منتجات من تجار موثوقين — تصفّح، قارن، واطلب بسهولة'
              : lang === 'he'
                ? 'גלה מוצרים ממרכולים מהימנים'
                : 'Discover products from trusted merchants — browse, compare, order with ease'}
          </p>
          {/* شريط ثقة سريع */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-bold text-palma-navy/80">
            <span className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              {lang === 'ar' ? 'تجار موثوقون' : 'Trusted merchants'}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              {lang === 'ar' ? 'دفع آمن' : 'Secure payment'}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              {lang === 'ar' ? 'توصيل لجميع المناطق' : 'Delivery nationwide'}
            </span>
          </div>
        </div>
      </section>

      <main className="pt-8 pb-20 px-4 sm:px-8 max-w-[1600px] mx-auto flex flex-col gap-8 bg-gradient-to-b from-white to-slate-50/50 min-h-[60vh]">
        {/* 2. شريط التصنيفات الأفقي */}
        <section className="w-full rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 p-4 shadow-sm" aria-label={lang === 'ar' ? 'التصنيفات' : 'Categories'}>
          <h2 className="text-sm font-black text-palma-navy uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
            <span aria-hidden>📦</span>
            {lang === 'ar' ? 'تصفّح حسب التصنيف' : lang === 'he' ? 'עיון לפי קטגוריה' : 'Browse by category'}
          </h2>
          <div className="overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex gap-3 min-w-max">
              <button
                type="button"
                onClick={() => setCategoryId('all')}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl border-2 font-bold text-sm transition-all whitespace-nowrap ${categoryId === 'all' ? 'bg-palma-primary border-palma-primary text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-palma-primary/50 hover:bg-palma-primaryLight/20'}`}
              >
                <span>📂</span>
                {t.common.allCategories}
              </button>
              {categories.slice(0, 16).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryId(categoryId === cat ? 'all' : cat)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl border-2 font-bold text-sm transition-all whitespace-nowrap ${categoryId === cat ? 'bg-palma-primary border-palma-primary text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-palma-primary/50 hover:bg-palma-primaryLight/20'}`}
                >
                  <span>{CATEGORY_EMOJI[cat] || '📦'}</span>
                  {t.categories[cat as keyof typeof t.categories] || cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* قسم تسويق الوسيط — يظهر في صفحة المنتجات/الكتالوج فقط */}
        <MediatorMarketingSection
          lang={lang}
          items={mediatorMarketingMock as MediatorMarketingItem[]}
          onProductClick={onProductClick}
          onViewMore={() => {
            if (typeof window !== 'undefined') window.location.hash = '#/mediator';
          }}
        />

        <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar — Filter Options (قابل للطي/الإظهار) */}
        <aside className={`hidden lg:block w-80 shrink-0 sticky h-fit animate-slide-up ${embeddedInLayout ? 'top-20' : 'top-28'}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-base font-bold text-palma-navy">
                {lang === 'ar' ? 'خيارات الفلترة' : lang === 'he' ? 'אפשרויות סינון' : 'Filter Options'}
              </h3>
              <div className="flex items-center gap-2">
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-palma-primary hover:underline"
              >
                {t.common.resetFilters}
              </button>
                <button
                  type="button"
                  onClick={() => setIsFiltersCollapsed((c) => !c)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                  title={lang === 'ar' ? (isFiltersCollapsed ? 'إظهار الفلاتر' : 'إخفاء الفلاتر') : isFiltersCollapsed ? 'Show filters' : 'Hide filters'}
                >
                  {isFiltersCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isFiltersCollapsed && (
            <div className="p-6">
            {/* Category */}
            <div className="pb-5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
                {t.common.category}
              </p>
              <ul className="space-y-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setCategoryId('all')}
                    className={`block w-full text-left rtl:text-right text-sm font-medium py-1.5 px-2 rounded-lg transition ${categoryId === 'all' ? 'text-palma-primary bg-palma-primaryLight/30' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {t.common.allCategories}
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => setCategoryId(categoryId === cat ? 'all' : cat)}
                      className={`block w-full text-left rtl:text-right text-sm font-medium py-1.5 px-2 rounded-lg transition ${categoryId === cat ? 'text-palma-primary bg-palma-primaryLight/30' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {(CATEGORY_EMOJI[cat] || '') + ' ' + (t.categories[cat as keyof typeof t.categories] || cat)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price — نطاق السعر + حقول */}
            <div className="py-5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
                {t.common.priceRange}
              </p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="number"
                  placeholder={t.common.minPrice}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-palma-primary"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                  type="number"
                  placeholder={t.common.maxPrice}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-palma-primary"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                ₪{minPrice || '0'} – ₪{maxPrice || priceRange.max}
              </p>
            </div>

            {/* Review — تقييم بالنجوم */}
            <div className="py-5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
                {lang === 'ar' ? 'التقييم' : 'Review'}
              </p>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-xl border transition ${minRating === stars ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-100 hover:bg-slate-50 text-slate-600'}`}
                  >
                    <div className="flex gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= stars ? 'opacity-100' : 'opacity-30'}>★</span>
                      ))}
                    </div>
                    <span className="text-xs font-medium">
                      {stars} {lang === 'ar' ? 'نجمة' : 'Star'}
                      {stars > 1 && (lang === 'ar' ? ' وأعلى' : '+')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand / Merchant */}
            {merchantsList.length > 0 && (
              <div className="py-5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
                  {lang === 'ar' ? 'التاجر / العلامة' : 'Brand'}
                </p>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  <li>
                    <button
                      type="button"
                      onClick={() => setMerchantId('all')}
                      className={`block w-full text-left rtl:text-right text-sm font-medium py-1.5 px-2 rounded-lg transition ${merchantId === 'all' ? 'text-palma-primary bg-palma-primaryLight/30' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {lang === 'ar' ? 'الكل' : 'All'}
                    </button>
                  </li>
                  {merchantsList.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setMerchantId(merchantId === m.id ? 'all' : m.id)}
                        className={`block w-full text-left rtl:text-right text-sm font-medium py-1.5 px-2 rounded-lg truncate transition ${merchantId === m.id ? 'text-palma-primary bg-palma-primaryLight/30' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {m.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Product Type (Condition) */}
            <div className="py-5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
                {lang === 'ar' ? 'نوع المنتج' : 'Product Type'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setConditionId('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${conditionId === 'all' ? 'bg-palma-navy text-white border-palma-navy' : 'bg-white text-slate-600 border-slate-200 hover:border-palma-primary'}`}
                >
                  {lang === 'ar' ? 'الكل' : 'All'}
                </button>
                {CONDITION_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setConditionId(conditionId === c ? 'all' : c)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${conditionId === c ? 'bg-palma-navy text-white border-palma-navy' : 'bg-white text-slate-600 border-slate-200 hover:border-palma-primary'}`}
                  >
                    <ProductConditionBadge condition={c} lang={lang} />
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="pt-5">
              <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
                {lang === 'ar' ? 'التوفر' : 'Availability'}
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availability === 'in_stock'}
                    onChange={() => setAvailability(availability === 'in_stock' ? 'all' : 'in_stock')}
                    className="rounded border-slate-300 text-palma-primary focus:ring-palma-primary"
                  />
                  <span className="text-sm font-medium text-slate-600">{lang === 'ar' ? 'متوفر' : 'In Stock'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availability === 'out_of_stock'}
                    onChange={() => setAvailability(availability === 'out_of_stock' ? 'all' : 'out_of_stock')}
                    className="rounded border-slate-300 text-palma-primary focus:ring-palma-primary"
                  />
                  <span className="text-sm font-medium text-slate-600">{lang === 'ar' ? 'غير متوفر' : 'Out of Stock'}</span>
                </label>
              </div>
            </div>
            </div>
            )}
          </div>
        </aside>

        {/* Catalog Content */}
        <div className="flex-1 space-y-8 min-w-0 animate-fade-in">
          {/* Top Bar (Search + Sort) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md shadow-slate-200/50 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 rtl:right-6 rtl:left-auto ltr:left-6 ltr:right-auto`}
              />
              <input
                type="text"
                placeholder={t.common.search}
                className={`w-full py-4 rounded-2xl border border-transparent bg-slate-50 focus:bg-white focus:ring-2 focus:ring-palma-primary outline-none text-sm font-bold text-palma-navy transition-all rtl:pr-14 rtl:pl-6 ltr:pl-14 ltr:pr-6`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 md:w-56 bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-xs sm:text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-palma-primary cursor-pointer text-palma-navy appearance-none min-h-[44px]"
              >
                <option value="newest">{t.common.newest}</option>
                <option value="most_sold">{t.common.mostSold}</option>
                <option value="popularity">{t.common.mostPopular}</option>
                <option value="rating_desc">{t.common.topRated}</option>
                <option value="price_asc">{t.common.priceLowHigh}</option>
                <option value="price_desc">{t.common.priceHighLow}</option>
              </select>

              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 min-h-[44px] px-4 sm:px-5 py-3 sm:py-4 bg-palma-primary rounded-2xl text-white shadow-md font-bold text-[11px] uppercase tracking-widest hover:bg-palma-primaryHover transition-colors"
              >
                <Filter className="w-5 h-5 shrink-0" />
                <span>{t.common.specificProducts}</span>
              </button>
            </div>
          </div>

          {/* شريط الفلاتر النشطة — تاجات صفراء مع "مسح الكل" */}
          {(categoryId !== 'all' || conditionId !== 'all' || minRating > 0 || minPrice || maxPrice || searchTerm || merchantId !== 'all' || availability !== 'all') && (
            <div className="flex flex-wrap items-center gap-2 px-2 py-3 bg-amber-50/60 rounded-xl border border-amber-100">
              <span className="text-xs font-bold text-slate-600 mr-2">
                {lang === 'ar' ? 'الفلاتر النشطة:' : 'Active filters:'}
              </span>
              {categoryId !== 'all' && (
                <button
                  onClick={() => removeFilter('category')}
                  className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-500 transition"
                >
                  {(t.categories[categoryId as keyof typeof t.categories] || categoryId)} ×
                </button>
              )}
              {(minPrice || maxPrice) && (
                <button
                  onClick={() => removeFilter('price')}
                  className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-500 transition"
                >
                  {lang === 'ar' ? 'السعر:' : 'Price:'} ₪{minPrice || '0'} – ₪{maxPrice || '∞'} ×
                </button>
              )}
              {minRating > 0 && (
                <button
                  onClick={() => removeFilter('rating')}
                  className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-500 transition"
                >
                  {minRating} {lang === 'ar' ? 'نجمة' : 'Star'} ×
                </button>
              )}
              {merchantId !== 'all' && (
                <button
                  onClick={() => removeFilter('merchant')}
                  className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-500 transition"
                >
                  {(merchantsList.find((m) => m.id === merchantId)?.name) || merchantId} ×
                </button>
              )}
              {conditionId !== 'all' && (
                <button
                  onClick={() => removeFilter('condition')}
                  className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-500 transition"
                >
                  <ProductConditionBadge condition={conditionId} lang={lang} /> ×
                </button>
              )}
              {availability !== 'all' && (
                <button
                  onClick={() => removeFilter('availability')}
                  className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-500 transition"
                >
                  {availability === 'in_stock' ? (lang === 'ar' ? 'متوفر' : 'In Stock') : lang === 'ar' ? 'غير متوفر' : 'Out of Stock'} ×
                </button>
              )}
              {searchTerm && (
                <button
                  onClick={() => removeFilter('search')}
                  className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-500 transition"
                >
                  "{searchTerm}" ×
                </button>
              )}
              <button
                onClick={resetFilters}
                className="ml-auto text-xs font-bold text-amber-700 hover:underline"
              >
                {lang === 'ar' ? 'مسح الكل' : 'Clear all'}
              </button>
            </div>
          )}

          {/* 5. كل المنتجات */}
          <div className="rounded-2xl bg-white/90 border border-slate-100 p-4 sm:p-5 shadow-sm">
          <h3 className="text-base font-black uppercase tracking-widest text-palma-navy px-2 mb-4 flex items-center gap-2">
            <span aria-hidden>📋</span>
            {lang === 'ar' ? 'كل المنتجات' : lang === 'he' ? 'כל המוצרים' : 'All products'}
          </h3>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-2">
            <p className="text-sm font-medium text-slate-600">
              {lang === 'ar'
                ? `${totalFiltered} نتيجة${hasMore ? ' — المزيد متوفر' : ''}`
                : `${totalFiltered} result${totalFiltered !== 1 ? 's' : ''}${hasMore ? ' — more available' : ''}`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'ترتيب:' : 'Sort by:'}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-palma-navy bg-white focus:ring-2 focus:ring-palma-primary outline-none"
              >
                <option value="newest">{t.common.newest}</option>
                <option value="most_sold">{t.common.mostSold}</option>
                <option value="popularity">{t.common.mostPopular}</option>
                <option value="rating_desc">{t.common.topRated}</option>
                <option value="price_asc">{t.common.priceLowHigh}</option>
                <option value="price_desc">{t.common.priceHighLow}</option>
              </select>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-palma-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-palma-primary">{lang === 'ar' ? 'جاري التحديث...' : 'Updating...'}</span>
              </div>
            )}
          </div>

          <div className="relative min-h-[400px]" ref={catalogProductsRef}>
            {isLoading && filteredProducts.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl z-10">
                <div className="w-10 h-10 border-4 border-palma-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-gradient-to-b from-slate-50 to-white p-12 sm:p-16 rounded-3xl text-center border border-slate-200 shadow-inner">
                <span className="text-7xl block mb-6 opacity-90">🛍️</span>
                <h3 className="text-xl sm:text-2xl font-black text-palma-navy mb-2">{t.common.noProducts}</h3>
                <p className="text-slate-500 font-medium text-sm mb-8 max-w-sm mx-auto">
                  {t.common.tryAdjusting}
                </p>
                <button onClick={resetFilters} className="btn-primary px-8 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition">
                  {t.common.clearFilters}
                </button>
              </div>
            ) : (
              <>
                {/* 3. 🏷️ تخفيضات وعروض — عروض الإدمن + منتجات عليها خصم */}
                <section className="mb-8" aria-label={lang === 'ar' ? 'تخفيضات وعروض' : 'Discounts & Offers'}>
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <span aria-hidden>🏷️</span>
                    {lang === 'ar' ? 'تخفيضات وعروض' : lang === 'he' ? 'הנחות ומבצעים' : 'Discounts & Offers'}
                  </h3>
                  {offers.length === 0 && discountProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 p-8 text-center min-h-[120px] flex flex-col items-center justify-center">
                      <p className="text-slate-500 font-medium">
                        {lang === 'ar' ? 'لا عروض حالياً' : lang === 'he' ? 'אין מבצעים כרגע' : 'No offers at the moment'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-2">
                      <div className="flex gap-4 min-w-0">
                        {offers.map((o) => (
                          <OfferCard
                            key={o.id}
                            offer={o}
                            lang={lang}
                            onShopNow={() => {
                              if (o.type === 'product' && o.product_id) onProductClick(o.product_id);
                              else catalogProductsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                          />
                        ))}
                        {discountProducts.map((p) => (
                          <ProductCard
                              key={p.id}
                            product={p}
                            lang={lang}
                            variant="compact"
                            onProductClick={onProductClick}
                              onMouseEnter={() => { prefetchComponent('PublicProductDetails'); prefetchProductData(p.id); }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* 3b. ⭐ المنتجات الشائعة — أفقي */}
                {popularProducts.length > 0 && (
                  <section className="mb-8 space-y-3" aria-label={lang === 'ar' ? 'المنتجات الشائعة' : 'Popular products'}>
                    <h3 className="text-sm font-black uppercase tracking-widest text-palma-navy px-1 flex items-center gap-2">
                      <span aria-hidden>⭐</span>
                      {lang === 'ar' ? 'المنتجات الشائعة' : lang === 'he' ? 'מוצרים פופולריים' : 'Popular products'}
                    </h3>
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-2">
                      <div className="flex gap-4 min-w-0">
                        {popularProducts.map((p) => (
                          <ProductCard
                              key={p.id}
                            product={p}
                            lang={lang}
                            variant="compact"
                            onProductClick={onProductClick}
                              onMouseEnter={() => { prefetchComponent('PublicProductDetails'); prefetchProductData(p.id); }}
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* 4. 🆕 منتجات جديدة — آخر المنتجات المضافة */}
                {newProducts.length > 0 && (
                  <section className="mb-8 space-y-3" aria-label={lang === 'ar' ? 'منتجات جديدة' : lang === 'he' ? 'מוצרים חדשים' : 'New arrivals'}>
                    <h3 className="text-sm font-black uppercase tracking-widest text-palma-navy px-1 flex items-center gap-2">
                      <span aria-hidden>🆕</span>
                      {lang === 'ar' ? 'منتجات جديدة' : lang === 'he' ? 'מוצרים חדשים' : 'New arrivals'}
                    </h3>
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                      <div className="flex gap-4 min-w-0 pb-2">
                        {newProducts.map((p) => (
                          <ProductCard
                              key={p.id}
                            product={p}
                            lang={lang}
                            variant="compact"
                            onProductClick={onProductClick}
                            onMouseEnter={() => { prefetchComponent('PublicProductDetails'); prefetchProductData(p.id); }}
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-8">
                  {paginatedProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      lang={lang}
                      variant="grid"
                      className="max-w-[180px] w-full mx-auto sm:max-w-none"
                      onProductClick={onProductClick}
                      onMouseEnter={() => {
                        prefetchComponent('PublicProductDetails');
                        prefetchProductData(p.id);
                      }}
                    />
                  ))}
                </div>

              {/* Load more — server-side cursor/offset */}
              {hasMore && (
                <div className="flex justify-center pt-8 pb-4">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={isLoading}
                    className="px-8 py-3 rounded-2xl border-2 border-palma-primary text-palma-primary font-bold hover:bg-palma-primary hover:text-white disabled:opacity-50 transition"
                  >
                    {isLoading ? (lang === 'ar' ? 'جاري التحميل...' : 'Loading...') : lang === 'ar' ? 'عرض المزيد' : 'Load more'}
                  </button>
                </div>
              )}
              {totalFiltered > PAGE_SIZE && !hasMore && page > 1 && (
                <div className="flex justify-center gap-2 pt-4 pb-4">
                        <button
                          type="button"
                    onClick={() => { setPage(1); setNextCursor(null); }}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {lang === 'ar' ? 'العودة للصفحة الأولى' : 'Back to first page'}
                  </button>
                </div>
              )}
              </>
            )}
          </div>
          </div>

          {/* Recently Viewed Strip (based on local history) */}
          {(() => {
            const recentlyViewed = marketStore.getRecentlyViewedProducts();
            if (!recentlyViewed || recentlyViewed.length === 0) return null;
            return (
              <section className="mt-4 space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-palma-navy flex items-center gap-2">
                    <span aria-hidden>👀</span>
                    {lang === 'ar'
                      ? 'شو شفت مؤخراً'
                      : lang === 'he'
                        ? 'נצפה לאחרונה'
                        : 'Recently Viewed'}
                  </h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                  <div className="flex gap-4 min-w-0 px-2 pb-2">
                    {recentlyViewed.slice(0, 12).map((p) => {
                      const basePrice = p.price ?? p.price_ils ?? 0;
                      const finalPrice = (p as any).final_price != null ? (p as any).final_price : basePrice;
                      const hasDiscount = finalPrice < basePrice;
                      const discountPercent =
                        basePrice > 0 && hasDiscount ? Math.round((1 - finalPrice / basePrice) * 100) : 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onProductClick(p.id)}
                          className="min-w-[180px] max-w-[220px] bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex-shrink-0 text-left overflow-hidden"
                        >
                          <div className="aspect-[4/3] overflow-hidden bg-slate-50 relative">
                            <img
                              src={secureImageSrc(
                                p.images?.[0] || p.imageUrl || p.image_url,
                                RECENT_IMG_FALLBACK
                              )}
                              loading="lazy"
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                              alt={p.name}
                              onError={setImageToPlaceholder}
                            />
                            {hasDiscount && (
                              <span className="absolute top-2 left-2 bg-red-600 text-white px-2 py-0.5 rounded-sm text-[10px] font-black">
                                {discountPercent > 0 ? `%${discountPercent}-` : (lang === 'ar' ? 'تخفيضات!' : 'Sale!')}
                              </span>
                            )}
                          </div>
                          <div className="p-3 space-y-1">
                            <p className="text-[11px] font-bold text-palma-navy line-clamp-2">{p.name}</p>
                            <p className="text-[11px] font-semibold text-palma-primary">
                              {hasDiscount ? (
                                <>
                                  <span className="text-red-600 font-bold">₪{finalPrice}</span>
                                  <span className="line-through text-[10px] text-slate-400 mr-1">₪{basePrice}</span>
                                </>
                              ) : (
                                <>₪{basePrice}</>
                              )}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
            })()}
        </div>
        </div>
      </main>

      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md lg:hidden animate-fade-in">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-6 sm:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-8 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-palma-navy">🔍 {t.common.filters}</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-palma-navy hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>
            <div className="space-y-8">
              <p className="text-[10px] text-slate-400 font-medium">
                💡 {(t.common as Record<string, string>).clickAgainToClearFilter ?? 'اضغط مرة ثانية لإلغاء الفلتر'}
              </p>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  📂 {t.common.category}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoryId('all')}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] ${categoryId === 'all' ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}
                  >
                    {t.common.allCategories}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryId(categoryId === cat ? 'all' : cat)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] ${categoryId === cat ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}
                    >
                      {(CATEGORY_EMOJI[cat] || '') + ' ' + (t.categories[cat as keyof typeof t.categories] || cat)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  🏷️ {lang === 'ar' ? 'حالة المنتج' : 'Condition'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setConditionId('all')}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] ${conditionId === 'all' ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}
                  >
                    {lang === 'ar' ? 'الكل' : 'All'}
                  </button>
                  {CONDITION_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setConditionId(conditionId === c ? 'all' : c)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] ${conditionId === c ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}
                    >
                      <ProductConditionBadge condition={c} lang={lang} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  💰 {t.common.priceRange}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder={t.common.minPrice}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder={t.common.maxPrice}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  ⭐ {lang === 'ar' ? 'التقييم' : 'Review'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase ${minRating === stars ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-500'}`}
                    >
                      {stars}★+
                    </button>
                  ))}
                </div>
              </div>
              {merchantsList.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    {lang === 'ar' ? 'التاجر / العلامة' : 'Brand'}
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    <button
                      onClick={() => setMerchantId('all')}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] ${merchantId === 'all' ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}
                    >
                      {lang === 'ar' ? 'الكل' : 'All'}
                    </button>
                    {merchantsList.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMerchantId(merchantId === m.id ? 'all' : m.id)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] truncate max-w-[140px] ${merchantId === m.id ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  {lang === 'ar' ? 'التوفر' : 'Availability'}
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availability === 'in_stock'}
                      onChange={() => setAvailability(availability === 'in_stock' ? 'all' : 'in_stock')}
                      className="rounded border-slate-300 text-palma-primary"
                    />
                    <span className="text-sm font-medium">{lang === 'ar' ? 'متوفر' : 'In Stock'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availability === 'out_of_stock'}
                      onChange={() => setAvailability(availability === 'out_of_stock' ? 'all' : 'out_of_stock')}
                      className="rounded border-slate-300 text-palma-primary"
                    />
                    <span className="text-sm font-medium">{lang === 'ar' ? 'غير متوفر' : 'Out of Stock'}</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                onClick={resetFilters}
                className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[11px] tracking-widest"
              >
                {t.common.resetFilters}
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="btn-primary flex-[2] py-5 text-[11px] uppercase tracking-widest"
              >
                {lang === 'ar' ? 'عرض النتائج' : 'Show Results'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicCatalog;
