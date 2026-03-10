/**
 * Customer shop tab: categories, filters, and product grid.
 * Lazy-loaded when the shop tab is active.
 */

import React from 'react';
import { Product } from '../../types';
import type { Language } from '../../translations';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { ShopProductCard, CategoryPill } from '../../components/CustomerShared';
import { prefetchComponent, prefetchProductData } from '../../prefetch';
import { CATEGORY_EMOJI } from '../../types';

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
const MAIN_GROUP_SUBCATEGORIES: Record<string, string[]> = {
  food: [
    'juices',
    'soft_drinks',
    'hot_drinks',
    'water',
    'dairy_drinks',
    'fruits',
    'vegetables',
    'dairy',
    'bakery',
    'meat_poultry',
    'canned_food',
    'snacks',
    'sweets',
    'spices',
    'grains',
    'ready_meals',
    'oils_sauces',
    'frozen_food',
    'food',
  ],
  fashion: [
    'men_clothing',
    'women_clothing',
    'kids_clothing',
    'shoes',
    'bags_accessories',
    'traditional_wear',
    'fashion',
  ],
  electronics: [
    'phones',
    'computers',
    'electronics_accessories',
    'home_appliances',
    'cameras',
    'gaming',
    'electronics',
  ],
  home: ['furniture', 'kitchen', 'home_decor', 'garden', 'tools', 'home', 'furnishings_textiles'],
  kids: ['baby', 'toys'],
  automotive: ['automotive'],
  personalCare: ['skincare', 'makeup', 'hair_care', 'perfume', 'beauty'],
  services: ['services', 'real_estate', 'handmade', 'pets', 'books', 'sports', 'other'],
};
const MOST_POPULAR_CATEGORY_IDS = ['fruits', 'vegetables', 'dairy', 'phones', 'men_clothing', 'snacks'];
const INITIAL_VISIBLE_GROUPS = 4;

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
}) => {
  const common = t.common as Record<string, string>;
  const getGroupLabel = (groupId: string) =>
    common[`group${groupId.charAt(0).toUpperCase() + groupId.slice(1)}`] || groupId;
  const searchLower = categorySearch.trim().toLowerCase();
  const filteredGroupIds = searchLower
    ? MAIN_GROUP_IDS.filter((gid) => {
        const label = getGroupLabel(gid);
        const subLabels = (MAIN_GROUP_SUBCATEGORIES[gid] || []).map((cid) => (t.categories[cid] || cid) as string);
        return (
          label.toLowerCase().includes(searchLower) || subLabels.some((s) => s.toLowerCase().includes(searchLower))
        );
      })
    : [...MAIN_GROUP_IDS];
  const visibleGroupIds = showAllGroups ? filteredGroupIds : filteredGroupIds.slice(0, INITIAL_VISIBLE_GROUPS);
  const hasMore = filteredGroupIds.length > INITIAL_VISIBLE_GROUPS && !showAllGroups;

  return (
    <div className="space-y-8">
      <div className="text-center sm:text-right rtl:sm:text-left">
        <h2 className="font-heading text-2xl sm:text-3xl font-black text-palma-navy tracking-tight">
          {lang === 'ar' ? 'التسوق' : lang === 'he' ? 'קניות' : 'Shopping'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {lang === 'ar'
            ? 'اختر تصنيفاً أو تصفّح كل المنتجات'
            : lang === 'he'
              ? 'בחר קטגוריה או עיין בהכל'
              : 'Choose a category or browse all products'}
        </p>
      </div>

      <div className="relative">
        <Search
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 left-4 rtl:left-auto rtl:right-4"
          aria-hidden
        />
        <input
          type="text"
          placeholder={common.searchCategoryPlaceholder ?? 'ابحث عن تصنيف...'}
          className="w-full pl-12 rtl:pl-4 pr-4 rtl:pr-12 py-3.5 rounded-2xl border-2 border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
        />
      </div>

      <div className="dashboard-card dashboard-card-body flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder={t.common.search}
            className="dashboard-input-search w-full"
            value={shopSearch}
            onChange={(e) => setShopSearch(e.target.value)}
          />
        </div>
        <select
          className="sm:w-48 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition cursor-pointer"
          value={shopConditionFilter}
          onChange={(e) => setShopConditionFilter(e.target.value)}
        >
          <option value="all">{lang === 'ar' ? 'كل الحالات' : lang === 'he' ? 'כל המצבים' : 'All conditions'}</option>
          <option value="new">{lang === 'ar' ? 'جديد' : lang === 'he' ? 'חדש' : 'New'}</option>
          <option value="used_like_new">{lang === 'ar' ? 'مستعمل – كالجديد' : 'Used – Like New'}</option>
          <option value="used_good">{lang === 'ar' ? 'مستعمل – حالة جيدة' : 'Used – Good'}</option>
          <option value="refurbished">{lang === 'ar' ? 'مجدّد' : 'Refurbished'}</option>
        </select>
      </div>

      <div>
        <h3 className="text-base font-black text-palma-navy uppercase tracking-widest mb-4">
          {common.mostOrdered ?? 'الأكثر طلباً'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {MOST_POPULAR_CATEGORY_IDS.map((catId) => {
            const label = (t.categories[catId] || catId) as string;
            const emoji = CATEGORY_EMOJI[catId] || '📦';
            const isActive = shopCategoryId === catId;
            return (
              <button
                key={catId}
                type="button"
                onClick={() => onCategorySelect(catId)}
                className={`flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 min-h-[88px] sm:min-h-[100px] ${
                  isActive
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-white border-emerald-100 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <span className="text-2xl sm:text-3xl" aria-hidden>
                  {emoji}
                </span>
                <span className="text-xs font-bold text-center line-clamp-2">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-2">
        {common.clickAgainToClearFilter ?? 'اضغط على التصنيف مرة ثانية لإلغاء الفلتر'}
      </p>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <CategoryPill
          category="all"
          active={shopCategoryId === 'all'}
          label={t.common.allCategories}
          onSelect={onCategorySelect}
        />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleGroupIds.map((groupId) => {
            const groupLabel = getGroupLabel(groupId);
            const icon = MAIN_GROUP_ICONS[groupId] || '📦';
            const subIds = MAIN_GROUP_SUBCATEGORIES[groupId] || [];
            const isExpanded = expandedGroupId === groupId;
            return (
              <div
                key={groupId}
                className="bg-white rounded-2xl border-2 border-emerald-100 overflow-hidden shadow-soft hover:shadow-md transition-shadow"
              >
                <button
                  type="button"
                  onClick={() => setExpandedGroupId(expandedGroupId === groupId ? null : groupId)}
                  className="w-full flex items-center gap-4 p-5 text-right rtl:text-left"
                >
                  <span className="text-3xl flex-shrink-0" aria-hidden>
                    {icon}
                  </span>
                  <span className="flex-1 font-black text-palma-navy text-sm uppercase tracking-wide">
                    {groupLabel}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-emerald-50">
                    <div className="flex flex-wrap gap-2">
                      {subIds.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            onCategorySelect(cat);
                            setExpandedGroupId(null);
                          }}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                            shopCategoryId === cat
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {(CATEGORY_EMOJI[cat] || '') + ' ' + ((t.categories[cat] || cat) as string)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAllGroups(true)}
            className="w-full py-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition"
          >
            {common.showMore ?? 'عرض المزيد'}
          </button>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
          {lang === 'ar'
            ? `عرض ${filteredShopProducts.length} منتج`
            : lang === 'he'
              ? `מציג ${filteredShopProducts.length} מוצרים`
              : `Showing ${filteredShopProducts.length} products`}
        </p>
        {filteredShopProducts.length === 0 ? (
          <div className="dashboard-empty py-16 rounded-2xl">
            <span className="text-4xl block mb-4 grayscale opacity-60">🛍️</span>
            <p className="text-slate-500 font-semibold text-sm">
              {lang === 'ar'
                ? 'لا توجد منتجات تطابق البحث أو التصنيف.'
                : lang === 'he'
                  ? 'אין מוצרים תואמים.'
                  : 'No products match your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredShopProducts.map((p) => (
              <div
                key={p.id}
                onMouseEnter={() => {
                  prefetchComponent('PublicProductDetails');
                  prefetchProductData(p.id);
                }}
                onFocus={() => {
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
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
