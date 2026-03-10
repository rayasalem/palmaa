/**
 * Admin Products tab. Lazy-loaded.
 */

import React from 'react';
import { Search, Package, Trash2 } from 'lucide-react';
import { useAdminView } from './AdminViewContext';
import { AdminProductRow } from './AdminProductRow';

export default function AdminProductsTab() {
  const ctx = useAdminView();
  const {
    lang,
    t,
    productsLoading,
    productSearch,
    setProductSearch,
    filteredProducts,
    loadProducts,
    actionLoading,
    onViewProduct,
    onViewProfile,
    handleProductToggleActive,
    requestProductDelete,
    productToDelete,
    setProductToDelete,
    productDeleteLoading,
    handleProductDelete,
  } = ctx;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {productToDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => !productDeleteLoading && setProductToDelete(null)}
        >
          <div
            className="bg-white rounded-[2.5rem] max-w-md w-full p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-palma-navy">
                  {lang === 'ar' ? 'حذف المنتج' : 'Delete product'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {lang === 'ar' ? 'هل تريد حذف هذا المنتج؟' : 'Are you sure you want to delete this product?'}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-palma-navy border border-slate-100">
              «{productToDelete.name}»
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !productDeleteLoading && setProductToDelete(null)}
                disabled={productDeleteLoading}
                className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-black text-sm uppercase"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => productToDelete && handleProductDelete(productToDelete.id, productToDelete.name)}
                disabled={productDeleteLoading}
                className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-black text-sm uppercase"
              >
                {productDeleteLoading
                  ? lang === 'ar'
                    ? 'جاري الحذف...'
                    : 'Deleting...'
                  : lang === 'ar'
                    ? 'حذف'
                    : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex flex-col lg:flex-row justify-between items-center gap-6">
        <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-palma-primary animate-pulse"></span>
          {lang === 'ar' ? 'كل المنتجات' : 'All Products'} ({filteredProducts.length})
        </h3>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-palma-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث عن منتج...' : 'Search products...'}
            className="w-full pl-9 rtl:pr-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-palma-primary"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>
        <button
          onClick={loadProducts}
          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase"
        >
          {lang === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>
      {productsLoading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{t.common.loading}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{t.common.noData}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left rtl:text-right">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {t.common.productName}
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {lang === 'ar' ? 'التاجر' : 'Merchant'}
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {t.common.category}
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {t.common.price}
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {t.common.status}
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {t.common.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold">
                {filteredProducts.map((p) => (
                  <AdminProductRow
                    key={p.id}
                    product={p}
                    isProcessing={actionLoading === p.id}
                    t={t}
                    lang={lang}
                    onViewProduct={onViewProduct}
                    onViewProfile={onViewProfile}
                    onToggleActive={handleProductToggleActive}
                    onDelete={requestProductDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
