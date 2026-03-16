/**
 * Customer shop tab — تصميم على طراز SíMi Shop:
 * شريط بحث، تصنيفات أفقية، منتجات شائعة، تخفيضات، آخر طلب، وأفضل المنتجات.
 */

import React, { useRef } from 'react';
import { Product } from '../../types';
import type { Language } from '../../translations';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Heart,
  Plus,
  ShoppingBag,
} from 'lucide-react';
import { ShopProductCard } from '../../components/CustomerShared';
import { prefetchComponent, prefetchProductData } from '../../prefetch';
import { CATEGORY_EMOJI } from '../../types';
import type { CartItem } from '../../types';
import { getOffers, type ShopOffer } from '../../services/offersApi';

const MAIN_GROUP_IDS = [
  'food',
  'fashion',
  'electronics',
  'home',
  'kids',
  'automotive',
  'personalCare',
  'services',
] as const;
const MAIN_GROUP_ICONS: Record<string, string> = {
  food: '🛒',
  fashion: '👗',
  electronics: '📱',
  home: '🏠',
  kids: '👶',
  automotive: '🚗',
  personalCare: '💄',
  services: '🔧',
};
const MOST_POPULAR_CATEGORY_IDS = ['fruits', 'vegetables', 'dairy', 'phones', 'men_clothing', 'snacks'];
/** عدد المنتجات المعروضة في قسم «كل المنتجات» قبل زر المزيد */
const ALL_PRODUCTS_PREVIEW_SIZE = 8;

export interface CustomerShopTabProps {
  lang: Language;
  t: Record<string, any> & { common: Record<string, string>; categories: Record<string, string> };
  filteredShopProducts: Product[];
  shopSearch: string;
  setShopSearch: (v: string) => void;
  shopCategoryId: string;
  shopConditionFilter: string;
  setShopConditionFilter: (v: string) => void;
  categorySearch: string;
  setCategorySearch: (v: string) => void;
  expandedGroupId: string | null;
  setExpandedGroupId: (v: string | null) => void;
  showAllGroups: boolean;
  setShowAllGroups: (v: boolean) => void;
  onCategorySelect: (category: string) => void;
  onAddToCart: (product: Product) => void;
  addingToCartProductId?: string | null;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (profileId: string) => void;
  /** عناصر آخر طلب (اختياري) لعرض قسم "آخر طلب" */
  lastOrderItems?: CartItem[];
  onUpdateLastOrderQuantity?: (productId: string, delta: number) => void;
  /** الانتقال لصفحة كل المنتجات مع الفلترة (الكتالوج) */
  onNavigateToCatalog?: () => void;
}

export const CustomerShopTab: React.FC<CustomerShopTabProps> = ({
  lang,
  t,
  filteredShopProducts,
  shopSearch,
  setShopSearch,
  shopCategoryId,
  shopConditionFilter,
  setShopConditionFilter,
  categorySearch,
  setCategorySearch,
  expandedGroupId,
  setExpandedGroupId,
  showAllGroups,
  setShowAllGroups,
  onCategorySelect,
  onAddToCart,
  addingToCartProductId,
  onViewProduct,
  onViewProfile,
  lastOrderItems = [],
  onUpdateLastOrderQuantity,
  onNavigateToCatalog,
}) => {
  const common = t.common as Record<string, string>;
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const popularScrollRef = useRef<HTMLDivElement>(null);
  const topItemsScrollRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [offers, setOffers] = React.useState<ShopOffer[]>([]);
  React.useEffect(() => {
    getOffers().then((res) => {
      if (res.success && res.offers) setOffers(res.offers);
    });
  }, []);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (!ref.current) return;
    const step = ref.current.clientWidth * 0.8;
    ref.current.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  const popularProducts = React.useMemo(
    () =>
      filteredShopProducts
        .slice()
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 12),
    [filteredShopProducts]
  );

  const topItems = React.useMemo(
    () => filteredShopProducts.filter((p) => p.is_bestseller).slice(0, 8),
    [filteredShopProducts]
  );

  /** منتجات عليها خصم — تظهر في قسم العروض مع عروض الإدمن */
  const discountProducts = React.useMemo(
    () =>
      filteredShopProducts.filter((p) => {
        const base = p.price ?? p.price_ils ?? 0;
        const final = (p as any).final_price != null ? (p as any).final_price : base;
        return final < base && base > 0;
      }).slice(0, 8),
    [filteredShopProducts]
  );

  const [quickViewProduct, setQuickViewProduct] = React.useState<Product | null>(null);

  return (
    <div
      className="rounded-2xl"
      style={{
        background: 'linear-gradient(180deg, rgba(236, 253, 245, 0.5) 0%, rgba(255,255,255,0.9) 30%)',
      }}
    >
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-5">
        {/* ——— شريط البحث (مضغوط) ——— */}
        <div className="relative max-w-xl">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 left-3 rtl:left-auto rtl:right-3"
            aria-hidden
          />
          <input
            type="text"
            placeholder={
              lang === 'ar'
                ? 'ابحث عن منتجاتك...'
                : lang === 'he'
                  ? 'חפש מוצרים...'
                  : 'Search your grocery products etc....'
            }
            className="w-full pl-10 rtl:pl-4 pr-4 rtl:pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none shadow-sm transition"
            value={shopSearch || categorySearch}
            onChange={(e) => {
              setShopSearch(e.target.value);
              setCategorySearch(e.target.value);
            }}
          />
        </div>

        {/* ——— التصنيفات + فلترة (حجم مضغوط) ——— */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-black text-slate-800">
              {lang === 'ar' ? 'التصنيفات' : lang === 'he' ? 'קטגוריות' : 'Categories'}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition"
              >
                <Filter className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'فلتر' : 'Filter'}
              </button>
              <div className="flex rounded-full bg-white border border-slate-200 overflow-hidden shadow-sm">
                <button type="button" onClick={() => scroll(categoriesScrollRef, lang === 'en' ? 'left' : 'right')} className="p-1.5 text-slate-600 hover:bg-slate-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => scroll(categoriesScrollRef, lang === 'en' ? 'right' : 'left')} className="p-1.5 text-slate-600 hover:bg-slate-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          {filterOpen && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white rounded-lg border border-slate-100">
              <select
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 outline-none focus:border-emerald-500"
                value={shopConditionFilter}
                onChange={(e) => setShopConditionFilter(e.target.value)}
              >
                <option value="all">{lang === 'ar' ? 'كل الحالات' : 'All conditions'}</option>
                <option value="new">{lang === 'ar' ? 'جديد' : 'New'}</option>
                <option value="used_like_new">{lang === 'ar' ? 'مستعمل – كالجديد' : 'Used – Like New'}</option>
                <option value="used_good">{lang === 'ar' ? 'مستعمل – جيد' : 'Used – Good'}</option>
                <option value="refurbished">{lang === 'ar' ? 'مجدّد' : 'Refurbished'}</option>
              </select>
            </div>
          )}
          <div
            ref={categoriesScrollRef}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {MOST_POPULAR_CATEGORY_IDS.map((catId) => {
              const label = (t.categories[catId] || catId) as string;
              const emoji = CATEGORY_EMOJI[catId] || '📦';
              const isActive = shopCategoryId === catId;
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => onCategorySelect(shopCategoryId === catId ? 'all' : catId)}
                  className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 min-w-[80px] shrink-0 transition-all ${
                    isActive
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                      : 'bg-white border-slate-100 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-[10px] font-bold text-center line-clamp-2">{label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onCategorySelect('all')}
              className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 min-w-[80px] shrink-0 transition-all ${
                shopCategoryId === 'all'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                  : 'bg-white border-slate-100 text-slate-700 hover:border-emerald-200'
              }`}
            >
              <span className="text-xl">📦</span>
              <span className="text-[10px] font-bold text-center">{t.common.allCategories}</span>
            </button>
          </div>
        </section>

        {/* ——— المنتجات الشائعة (أفقي + عرض المزيد) ——— */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-800">
              {lang === 'ar' ? 'المنتجات الشائعة' : lang === 'he' ? 'מוצרים פופולריים' : 'Popular Products'}
            </h3>
            <button
              type="button"
              onClick={() => (onNavigateToCatalog ? onNavigateToCatalog() : onCategorySelect('all'))}
              className="text-sm font-bold text-emerald-600 hover:underline"
            >
              {lang === 'ar' ? 'عرض المزيد' : 'View More'}
            </button>
          </div>
          <div className="relative">
            <div
              ref={popularScrollRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {popularProducts.map((p) => {
                const img = p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
                const basePrice = p.price ?? p.price_ils ?? 0;
                const finalPrice = (p as any).final_price != null ? (p as any).final_price : basePrice;
                const hasDiscount = finalPrice < basePrice;
                return (
                  <div
                    key={p.id}
                    className="flex-shrink-0 w-[200px] sm:w-[220px] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all"
                    onMouseEnter={() => {
                      prefetchComponent('PublicProductDetails');
                      prefetchProductData(p.id);
                    }}
                  >
                    <div
                      className="relative aspect-square cursor-pointer"
                      onClick={() => onViewProduct?.(p.id)}
                    >
                      <img
                        src={img}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-slate-500 hover:text-red-500 shadow"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                      {hasDiscount && (
                        <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">
                          %{Math.round((1 - finalPrice / basePrice) * 100)}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h4
                        className="font-bold text-slate-800 text-sm line-clamp-2 cursor-pointer hover:text-emerald-600"
                        onClick={() => onViewProduct?.(p.id)}
                      >
                        {p.name}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {p.shortDescription || (p.description || '').slice(0, 40) || 'Lorem ipsum dolor sit amet,'}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-black text-emerald-600">
                          ₪{finalPrice}
                          {basePrice > finalPrice && (
                            <span className="text-xs font-normal text-slate-400 line-through mr-1">₪{basePrice}</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddToCart(p)}
                          disabled={addingToCartProductId === p.id}
                          className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 shadow-md disabled:opacity-70"
                        >
                          {addingToCartProductId === p.id ? (
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Plus className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ——— تخفيضات (عروض من الإدمن) + آخر طلب ——— */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <h3 className="text-lg font-black text-slate-800 mb-4">
              {lang === 'ar' ? 'تخفيضات' : lang === 'he' ? 'הנחות' : 'Discount Shop'}
            </h3>
            {offers.length === 0 && discountProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 p-8 text-center min-h-[140px] flex flex-col items-center justify-center">
                <p className="text-slate-500 font-medium">
                  {lang === 'ar' ? 'لا عروض حالياً' : lang === 'he' ? 'אין מבצעים כרגע' : 'No offers at the moment'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {offers.map((o) => {
                  const goToCatalog = () => {
                    onNavigateToCatalog?.();
                    if (typeof window !== 'undefined' && window.location.hash !== '#/catalog') {
                      window.location.hash = '#/catalog';
                    }
                  };
                  const handleOfferClick = () => {
                    if (o.type === 'product' && o.product_id) {
                      onViewProduct?.(o.product_id);
                    } else {
                      goToCatalog();
                    }
                  };
                  const isCartDiscount = (o.scope === 'all' || o.scope === 'category') && (o.discount_label ?? 0) > 0;
                  return (
                    <div
                      key={o.id}
                      className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={handleOfferClick}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOfferClick(); }}
                    >
                      <div className="w-full p-4 flex flex-col justify-between min-h-[140px] text-left">
                        {o.image_url ? (
                          <div className="aspect-square -m-4 mb-2 rounded-t-2xl overflow-hidden bg-slate-100">
                            <img src={o.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                        <p className="text-xs text-slate-600 line-clamp-2">{o.subtitle || o.title}</p>
                        <span className="text-2xl font-black text-emerald-600 mt-1">%{o.discount_label || 0}</span>
                        {isCartDiscount && (
                          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                            {lang === 'ar' ? 'خصم على السلة' : 'Cart discount'}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOfferClick(); }}
                        className="w-full py-2 bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                      >
                        {lang === 'ar' ? 'تسوق الآن' : 'Shop Now'}
                      </button>
                    </div>
                  );
                })}
                {discountProducts.map((p) => {
                  const basePrice = p.price ?? p.price_ils ?? 0;
                  const finalPrice = (p as any).final_price != null ? (p as any).final_price : basePrice;
                  const pct = Math.round((1 - finalPrice / basePrice) * 100);
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <button
                        type="button"
                        className="w-full p-4 flex flex-col justify-between min-h-[140px] text-left"
                        onClick={() => onViewProduct?.(p.id)}
                      >
                        <div className="aspect-square -m-4 mb-2 rounded-t-2xl overflow-hidden bg-slate-100 relative">
                          <img
                            src={p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/200x200?text=No+Image'}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-black">
                            %{pct}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2">{p.name}</p>
                        <span className="text-lg font-black text-emerald-600">
                          ₪{finalPrice.toFixed(2)}
                          <span className="text-xs text-slate-400 line-through mr-1">₪{basePrice.toFixed(2)}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewProduct?.(p.id)}
                        className="w-full py-2 bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                      >
                        {lang === 'ar' ? 'تسوق الآن' : 'Shop Now'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* آخر طلب */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-lg font-black text-slate-800 mb-4">
              {lang === 'ar' ? 'آخر طلب' : lang === 'he' ? 'ההזמנה האחרונה' : 'Last Order'}
            </h3>
            {lastOrderItems.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                {lang === 'ar' ? 'لا توجد طلبات سابقة' : 'No recent orders'}
              </p>
            ) : (
              <ul className="space-y-3">
                {lastOrderItems.slice(0, 5).map((item) => {
                  const img =
                    item.images?.[0] || item.imageUrl || item.image_url || 'https://placehold.co/80x80?text=No+Image';
                  return (
                    <li key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {lang === 'ar' ? `الكمية ${item.quantity}` : `Qty ${item.quantity}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {onUpdateLastOrderQuantity && (
                          <div className="flex items-center bg-slate-100 rounded-lg">
                            <button
                              type="button"
                              onClick={() => onUpdateLastOrderQuantity(item.id, -1)}
                              className="p-1.5 text-slate-600"
                            >
                              −
                            </button>
                            <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateLastOrderQuantity(item.id, 1)}
                              className="p-1.5 text-slate-600"
                            >
                              +
                            </button>
                          </div>
                        )}
                        <span className="text-sm font-black text-emerald-600">
                          ₪{(item.price ?? item.price_ils ?? 0) * item.quantity}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddToCart(item)}
                        disabled={addingToCartProductId === item.id}
                        className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ——— أفضل المنتجات (أفقي + أسهم) ——— */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-800">
              {lang === 'ar' ? 'أفضل المنتجات' : lang === 'he' ? 'מוצרים מובילים' : 'Top Items'}
            </h3>
            <div className="flex rounded-full bg-white border border-slate-200 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => scroll(topItemsScrollRef, lang === 'en' ? 'left' : 'right')}
                className="p-2 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => scroll(topItemsScrollRef, lang === 'en' ? 'right' : 'left')}
                className="p-2 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div
            ref={topItemsScrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {(topItems.length ? topItems : filteredShopProducts.slice(0, 6)).map((p) => (
              <div
                key={p.id}
                className="flex-shrink-0 w-[160px] sm:w-[180px] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group cursor-pointer"
                onClick={() => onViewProduct?.(p.id)}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400'}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold text-slate-800 line-clamp-2">{p.name}</p>
                  <p className="text-sm font-black text-emerald-600 mt-0.5">
                    ₪{p.price ?? p.price_ils ?? 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ——— كل المنتجات: عرض جزء منها + زر المزيد ينتقل لصفحة الكتالوج ——— */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h3 className="text-lg font-black text-slate-800">
              {lang === 'ar' ? 'كل المنتجات' : lang === 'he' ? 'כל המוצרים' : 'All Products'}
            </h3>
            {onNavigateToCatalog && filteredShopProducts.length > 0 && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-palma-primary text-white font-bold text-sm shadow-md hover:bg-palma-primaryHover transition"
              >
                <ShoppingBag className="w-4 h-4" />
                {lang === 'ar' ? 'عرض المزيد — كل المنتجات' : lang === 'he' ? 'עוד — כל המוצרים' : 'Show more — all products'}
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {filteredShopProducts.length === 0
              ? (lang === 'ar' ? 'لا توجد منتجات تطابق البحث أو التصنيف.' : lang === 'he' ? 'אין מוצרים תואמים.' : 'No products match your filters.')
              : lang === 'ar'
                ? `عرض جزء من المنتجات (${Math.min(ALL_PRODUCTS_PREVIEW_SIZE, filteredShopProducts.length)} ${filteredShopProducts.length > ALL_PRODUCTS_PREVIEW_SIZE ? `من ${filteredShopProducts.length}` : ''})`
                : lang === 'he'
                  ? `מציג חלק מהמוצרים (${Math.min(ALL_PRODUCTS_PREVIEW_SIZE, filteredShopProducts.length)}${filteredShopProducts.length > ALL_PRODUCTS_PREVIEW_SIZE ? ` מתוך ${filteredShopProducts.length}` : ''})`
                  : `Showing part of products (${Math.min(ALL_PRODUCTS_PREVIEW_SIZE, filteredShopProducts.length)}${filteredShopProducts.length > ALL_PRODUCTS_PREVIEW_SIZE ? ` of ${filteredShopProducts.length}` : ''})`}
          </p>
          {filteredShopProducts.length === 0 ? (
            <div className="py-16 rounded-2xl bg-white border border-slate-100 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                {lang === 'ar' ? 'لا توجد منتجات تطابق البحث أو التصنيف.' : 'No products match your filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredShopProducts.slice(0, ALL_PRODUCTS_PREVIEW_SIZE).map((p) => (
                  <div
                    key={p.id}
                    onMouseEnter={() => {
                      prefetchComponent('PublicProductDetails');
                      prefetchProductData(p.id);
                    }}
                  >
                    <ShopProductCard
                      product={p}
                      lang={lang}
                      t={t}
                      onViewProduct={onViewProduct}
                      onViewProfile={onViewProfile}
                      onAddToCart={onAddToCart}
                      isAddingToCart={addingToCartProductId === p.id}
                      onQuickView={setQuickViewProduct}
                    />
                  </div>
                ))}
              </div>
              {onNavigateToCatalog && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={onNavigateToCatalog}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-palma-primary text-white font-bold text-sm shadow-md hover:bg-palma-primaryHover transition"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {lang === 'ar' ? 'المزيد — عرض كل المنتجات' : lang === 'he' ? 'עוד — כל המוצרים' : 'More — view all products'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-palma-navy">
                {lang === 'ar' ? 'عرض سريع' : 'Quick View'}
              </h3>
              <button
                type="button"
                onClick={() => setQuickViewProduct(null)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50">
                <img
                  src={
                    quickViewProduct.images?.[0] ||
                    quickViewProduct.imageUrl ||
                    quickViewProduct.image_url ||
                    'https://placehold.co/400x400?text=No+Image'
                  }
                  alt={quickViewProduct.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-palma-navy text-base line-clamp-2">{quickViewProduct.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-3">
                  {quickViewProduct.description || quickViewProduct.shortDescription}
                </p>
                <p className="text-sm font-black text-palma-primary">
                  ₪{quickViewProduct.price ?? quickViewProduct.price_ils ?? 0}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(quickViewProduct);
                    setQuickViewProduct(null);
                  }}
                  className="w-full mt-2 btn-primary py-3 text-[11px] uppercase tracking-widest"
                >
                  {lang === 'ar' ? 'إضافة للسلة' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
