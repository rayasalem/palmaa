
import React, { useState, useEffect, useCallback } from 'react';
import { marketStore } from '../store';
import { productService } from '../services/productService';
import { Product, PRODUCT_CATEGORIES, CATEGORY_EMOJI } from '../types';
import Logo from '../components/Logo';
import { ProductConditionBadge } from './ProductConditionBadge';
import { prefetchComponent, prefetchProductData } from '../prefetch';
import { Language, translations } from '../translations';
import { ArrowRight, ShoppingCart, Search, Filter } from 'lucide-react';

const CONDITION_OPTIONS = ['new', 'used_like_new', 'used_good', 'used_fair', 'refurbished', 'open_box', 'vintage'] as const;

interface PublicCatalogProps {
  onBack: () => void;
  onProductClick: (id: string) => void;
  onLoginClick: () => void;
}

const PublicCatalog: React.FC<PublicCatalogProps> = ({ onBack, onProductClick, onLoginClick }) => {
  const lang: Language = (typeof document !== 'undefined' && (document.documentElement.lang === 'en' || document.documentElement.lang === 'he')) ? document.documentElement.lang : 'ar';
  const t = translations[lang];

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('all');
  const [conditionId, setConditionId] = useState<string>('all');

  // List States
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Load auxiliary static data — عرض كل التصنيفات المفصّلة مع الإيموجي
  const categories = PRODUCT_CATEGORIES;

  // Sync with URL params on mount
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

  // Fetch and Filter
  const fetchAndFilterProducts = useCallback(async () => {
    setIsLoading(true);
    
    try {
        // Ensure we have the latest data from cloud/db
        await productService.getAll();
        
        // Filter locally (now that local cache is synced via productService.getAll())
        const data = marketStore.getFilteredProducts({
            searchTerm,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            minRating,
            sortBy,
            merchantId: 'all',
            categoryId,
            conditionId: conditionId !== 'all' ? conditionId : undefined,
        });
        
        setFilteredProducts(data);
    } catch (e) {
        console.error("Error fetching catalog", e);
    } finally {
        setIsLoading(false);
    }
  }, [searchTerm, minPrice, maxPrice, minRating, sortBy, categoryId, conditionId]);

  // Execute fetch on state change
  useEffect(() => {
    fetchAndFilterProducts();
  }, [fetchAndFilterProducts]);

  const resetFilters = () => {
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setSortBy('newest');
    setCategoryId('all');
    setConditionId('all');
  };

  const removeFilter = (key: string) => {
    switch (key) {
      case 'category': setCategoryId('all'); break;
      case 'condition': setConditionId('all'); break;
      case 'rating': setMinRating(0); break;
      case 'price': setMinPrice(''); setMaxPrice(''); break;
      case 'search': setSearchTerm(''); break;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7fa] font-sans text-palma-text" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-palma-border shadow-soft font-heading touch-target-min" style={{ paddingLeft: 'max(1.5rem, env(safe-area-inset-left))', paddingRight: 'max(1.5rem, env(safe-area-inset-right))' }}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 sm:h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6">
            <button onClick={onBack} onMouseEnter={() => prefetchComponent('PublicWebsite')} onFocus={() => prefetchComponent('PublicWebsite')} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-3 hover:bg-palma-primaryLight/50 rounded-xl transition-all text-palma-muted hover:text-palma-primary group">
               <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform rtl:group-hover:translate-x-1" />
            </button>
            <div onClick={onBack} className="cursor-pointer hover:opacity-90 transition-opacity"><Logo size="small" /></div>
          </div>
          <button onClick={onLoginClick} className="btn-primary min-h-[44px] px-4 sm:px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform">
             {t.auth.login}
          </button>
        </div>
      </nav>

      {/* Hero منصة التسوق — أي زائر يمكنه التصفح بدون تسجيل */}
      <section className="relative py-8 sm:py-12 px-4 border-b border-palma-border/50 bg-gradient-to-b from-white/80 to-transparent">
        <div className="max-w-[1600px] mx-auto text-center">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-palma-navy tracking-tight mb-2">
            {lang === 'ar' ? 'المنتجات المميزة' : lang === 'he' ? 'מוצרים מובחרים' : 'Featured Products'}
          </h1>
          <p className="text-sm sm:text-base text-palma-muted font-medium max-w-xl mx-auto mb-1">
            {lang === 'ar' ? 'اكتشف منتجات من تجار موثوقين — تصفّح، قارن، واطلب بسهولة' : lang === 'he' ? 'גלה מוצרים ממרכולים מהימנים' : 'Discover products from trusted merchants — browse, compare, and order with ease'}
          </p>
          <p className="text-xs text-palma-primary font-semibold">
            {lang === 'ar' ? 'تصفّح كزائر — لا تحتاج تسجيل للتصفّح' : lang === 'he' ? 'גלוש כאורח — אין צורך בהרשמה' : 'Browse as visitor — no sign-up required to browse'}
          </p>
        </div>
      </section>

      <main className="pt-8 pb-20 px-4 sm:px-8 max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-10">
        
        {/* Sidebar Filters - Desktop (من 1024px فما فوق يظهر الشريط على اليسار أو اليمين حسب RTL) */}
        <aside className="hidden lg:block w-80 shrink-0 space-y-8 sticky top-28 h-fit animate-slide-up">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-card space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-palma-navy">🔍 {t.common.filters}</h3>
              <button onClick={resetFilters} className="text-[10px] font-black uppercase text-palma-primary hover:underline tracking-widest">
                {t.common.resetFilters}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-medium pb-2 border-b border-slate-100">💡 {(t.common as Record<string, string>).clickAgainToClearFilter ?? 'اضغط على الخيار مرة ثانية لإلغاء الفلتر'}</p>
            <div className="space-y-4 border-b border-slate-100 pb-6">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">📂 {t.common.category}</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setCategoryId('all')}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${categoryId === 'all' ? 'bg-palma-navy text-white border-palma-navy shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-palma-primary'}`}
                >
                  {t.common.allCategories}
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setCategoryId(categoryId === cat ? 'all' : cat)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${categoryId === cat ? 'bg-palma-navy text-white border-palma-navy shadow-md ring-2 ring-palma-navy/30' : 'bg-white text-slate-500 border-slate-100 hover:border-palma-primary hover:bg-palma-primaryLight/30'}`}
                  >
                    {(CATEGORY_EMOJI[cat] || '') + ' ' + (t.categories[cat as keyof typeof t.categories] || cat)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-b border-slate-100 pb-6">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">🏷️ {lang === 'ar' ? 'حالة المنتج' : lang === 'he' ? 'מצב מוצר' : 'Condition'}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setConditionId('all')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${conditionId === 'all' ? 'bg-palma-navy text-white border-palma-navy shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-palma-primary'}`}>
                  {lang === 'ar' ? 'الكل' : 'All'}
                </button>
                {CONDITION_OPTIONS.map((c) => (
                  <button key={c} onClick={() => setConditionId(conditionId === c ? 'all' : c)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${conditionId === c ? 'bg-palma-navy text-white border-palma-navy shadow-md ring-2 ring-palma-navy/30' : 'bg-white text-slate-500 border-slate-100 hover:border-palma-primary hover:bg-palma-primaryLight/30'}`}>
                    <ProductConditionBadge condition={c} lang={lang} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-b border-slate-100 pb-6">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">💰 {t.common.priceRange}</p>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="number" 
                  placeholder={t.common.minPrice}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold outline-none focus:ring-2 focus:ring-palma-primary focus:bg-white transition-all"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input 
                  type="number" 
                  placeholder={t.common.maxPrice}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold outline-none focus:ring-2 focus:ring-palma-primary focus:bg-white transition-all"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">⭐ {t.common.minRating}</p>
              <div className="space-y-2">
                {[4, 3, 2].map(stars => (
                  <button 
                    key={stars}
                    onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${minRating === stars ? 'bg-palma-accent text-white border-palma-accent shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
                  >
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-xs ${s <= stars ? (minRating === stars ? 'text-white' : 'text-palma-accent') : (minRating === stars ? 'text-white/40' : 'text-slate-200')}`}>★</span>
                      ))}
                    </div>
                    <span className="text-[10px] font-black uppercase">{stars} {t.common.starsAndAbove}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Catalog Content */}
        <div className="flex-1 space-y-8 min-w-0 animate-fade-in">
          
          {/* Top Bar (Search + Sort) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-card flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 rtl:right-6 rtl:left-auto ltr:left-6 ltr:right-auto`} />
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

          <div className="flex flex-wrap items-center gap-3 px-2">
            {(categoryId !== 'all' || conditionId !== 'all' || minRating > 0 || (minPrice || maxPrice) || searchTerm) && (
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">{t.common.activeFilters}:</span>
            )}
            {conditionId !== 'all' && (
              <button onClick={() => removeFilter('condition')} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                <ProductConditionBadge condition={conditionId} lang={lang} /> ✕
              </button>
            )}
            {categoryId !== 'all' && (
              <button onClick={() => removeFilter('category')} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">
                {CATEGORY_EMOJI[categoryId] ? `${CATEGORY_EMOJI[categoryId]} ` : ''}{t.categories[categoryId as keyof typeof t.categories] || categoryId} ✕
              </button>
            )}
            {minRating > 0 && (
              <button onClick={() => removeFilter('rating')} className="flex items-center gap-2 bg-palma-accent/10 text-palma-accent px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-palma-accent/20 transition-all">
                {minRating}★+ ✕
              </button>
            )}
            {(minPrice || maxPrice) && (
              <button onClick={() => removeFilter('price')} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                {minPrice || '0'} - {maxPrice || '∞'} ₪ ✕
              </button>
            )}
            {searchTerm && (
              <button onClick={() => removeFilter('search')} className="flex items-center gap-2 bg-palma-navy text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all">
                "{searchTerm}" ✕
              </button>
            )}
          </div>

          <div className="flex justify-between items-center px-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              {t.common.showingResults.replace('{count}', filteredProducts.length.toString())}
            </p>
            {isLoading && (
               <div className="flex items-center gap-3">
                 <div className="w-3.5 h-3.5 border-2 border-palma-primary border-t-transparent rounded-full animate-spin"></div>
                 <span className="text-[9px] font-black text-palma-primary uppercase tracking-widest">Updating...</span>
               </div>
            )}
          </div>

          <div className="relative min-h-[400px]">
            {isLoading && filteredProducts.length === 0 ? (
               <div className="absolute inset-0 flex items-center justify-center rounded-3xl z-10">
                  <div className="w-10 h-10 border-4 border-palma-primary border-t-transparent rounded-full animate-spin"></div>
               </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white p-32 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                <span className="text-6xl block mb-6 grayscale opacity-50">🏜️</span>
                <h3 className="text-2xl font-black text-palma-navy mb-3">{t.common.noProducts}</h3>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-8">{t.common.tryAdjusting}</p>
                <button onClick={resetFilters} className="btn-primary px-10 py-4 text-[10px] uppercase tracking-widest">{t.common.clearFilters}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 pb-20">
                {filteredProducts.map(p => {
                  const mName = marketStore.getMerchantNameByUserId(p.merchant_id || '');
                  const { average, count } = marketStore.getProductRating(p.id);
                  const displayImage = p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
                  const shortDesc = p.shortDescription || (p.description || '').slice(0, 60) || mName;
                  const stock = p.stock ?? 0;
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => onProductClick(p.id)}
                      onMouseEnter={() => { prefetchComponent('PublicProductDetails'); prefetchProductData(p.id); }}
                      onFocus={() => { prefetchComponent('PublicProductDetails'); prefetchProductData(p.id); }}
                      className="bg-white rounded-2xl overflow-hidden border border-palma-border shadow-card hover:shadow-card-hover transition-all duration-300 group cursor-pointer flex flex-col h-full hover:-translate-y-1 card-hover-lift"
                    >
                      <div className="aspect-square overflow-hidden bg-slate-50 relative">
                        <img src={displayImage} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={p.name} />
                        <div className="absolute top-3 left-3 bg-palma-primary text-white px-3 py-1.5 rounded-lg text-sm font-black shadow-lg">
                          ₪{p.price ?? p.price_ils ?? 0}
                        </div>
                        {average >= 4.5 && count >= 1 && (
                          <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 px-2 py-0.5 rounded-lg text-[9px] font-black">⭐</div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-black text-palma-navy text-base mb-1 group-hover:text-palma-primary transition-colors line-clamp-2">{p.name}</h4>
                        <p className="text-xs text-slate-500 mb-2 line-clamp-1">{shortDesc}</p>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {stock > 0 && (
                            <span className="text-[10px] font-bold text-slate-600">
                              {lang === 'ar' ? `متوفر: ${stock}` : lang === 'he' ? `במלאי: ${stock}` : `Available: ${stock}`}
                            </span>
                          )}
                          <ProductConditionBadge condition={p.condition} lang={lang} className="shrink-0" />
                        </div>
                        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2 min-h-0">
                          <span className="text-xs sm:text-[10px] font-bold text-slate-400 truncate min-w-0" title={mName}>{mName}</span>
                          <span className="w-8 h-8 rounded-full bg-palma-navy text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow">
                            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md lg:hidden animate-fade-in">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-6 sm:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-8 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-palma-navy">🔍 {t.common.filters}</h3>
              <button onClick={() => setIsMobileFilterOpen(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-palma-navy hover:bg-slate-200 transition">✕</button>
            </div>
            <div className="space-y-8">
              <p className="text-[10px] text-slate-400 font-medium">💡 {(t.common as Record<string, string>).clickAgainToClearFilter ?? 'اضغط مرة ثانية لإلغاء الفلتر'}</p>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">📂 {t.common.category}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setCategoryId('all')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] ${categoryId === 'all' ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}>{t.common.allCategories}</button>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setCategoryId(categoryId === cat ? 'all' : cat)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] ${categoryId === cat ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}>{(CATEGORY_EMOJI[cat] || '') + ' ' + (t.categories[cat as keyof typeof t.categories] || cat)}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">🏷️ {lang === 'ar' ? 'حالة المنتج' : 'Condition'}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setConditionId('all')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] ${conditionId === 'all' ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}>{lang === 'ar' ? 'الكل' : 'All'}</button>
                  {CONDITION_OPTIONS.map(c => (
                    <button key={c} onClick={() => setConditionId(conditionId === c ? 'all' : c)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase min-h-[44px] ${conditionId === c ? 'bg-palma-navy text-white' : 'bg-slate-50 text-slate-500'}`}>
                      <ProductConditionBadge condition={c} lang={lang} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">💰 {t.common.priceRange}</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder={t.common.minPrice} className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                  <input type="number" placeholder={t.common.maxPrice} className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">⭐ {t.common.minRating}</p>
                <div className="flex flex-wrap gap-2">
                  {[4, 3, 2].map(stars => (
                    <button key={stars} onClick={() => setMinRating(minRating === stars ? 0 : stars)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase ${minRating === stars ? 'bg-palma-accent text-white' : 'bg-slate-50 text-slate-500'}`}>{stars}★+</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={resetFilters} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[11px] tracking-widest">{t.common.resetFilters}</button>
              <button onClick={() => setIsMobileFilterOpen(false)} className="btn-primary flex-[2] py-5 text-[11px] uppercase tracking-widest">{lang === 'ar' ? 'عرض النتائج' : 'Show Results'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicCatalog;
