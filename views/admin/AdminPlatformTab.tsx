/**
 * Admin Platform tab: settings and commission earnings. Lazy-loaded.
 */

import React from 'react';
import { Banknote, Shield } from 'lucide-react';
import { useAdminView } from './AdminViewContext';

export default function AdminPlatformTab() {
  const {
    lang,
    t,
    platformLoading,
    platformEarnings,
    settingsForm,
    setSettingsForm,
    settingsSaving,
    handleSaveSettings,
  } = useAdminView();

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-palma-primary animate-pulse"></span>
        {lang === 'ar' ? 'إعدادات المنصة وأرباح العمولة' : 'Platform settings & commission earnings'}
      </h3>
      {platformLoading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{t.common.loading}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {lang === 'ar' ? 'إجمالي العمولة (15%)' : 'Total commission (15%)'}
                </span>
              </div>
              <p className="text-2xl font-black text-palma-navy">
                ₪{platformEarnings?.total_commission?.toFixed(2) ?? '0.00'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {lang === 'ar' ? 'غرامة عدم الفاتورة (16%)' : 'Tax penalty (16%)'}
                </span>
              </div>
              <p className="text-2xl font-black text-palma-navy">
                ₪{platformEarnings?.total_tax_penalty?.toFixed(2) ?? '0.00'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-palma-primary/20 shadow-soft bg-palma-primary/5">
              <div className="flex items-center gap-3 text-palma-primary mb-2">
                <Shield className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {lang === 'ar' ? 'أرباح المنصة' : 'Platform earnings'}
                </span>
              </div>
              <p className="text-2xl font-black text-palma-primary">
                ₪{platformEarnings?.platform_earnings?.toFixed(2) ?? '0.00'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {platformEarnings?.transactions_count ?? 0} {lang === 'ar' ? 'عملية تسوية' : 'settlements'}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
            <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {lang === 'ar' ? 'نسب الخصم (قابلة للتعديل)' : 'Commission & tax penalty rates'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  {lang === 'ar' ? 'نسبة العمولة %' : 'Commission %'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={settingsForm.commission_rate}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, commission_rate: Number(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-palma-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  {lang === 'ar' ? 'نسبة غرامة عدم الفاتورة %' : 'Tax penalty %'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={settingsForm.tax_penalty_rate}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, tax_penalty_rate: Number(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-palma-primary"
                />
              </div>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="mt-6 px-8 py-3 bg-palma-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-palma-navy/90 transition disabled:opacity-50"
            >
              {settingsSaving
                ? lang === 'ar'
                  ? 'جاري الحفظ...'
                  : 'Saving...'
                : lang === 'ar'
                  ? 'حفظ الإعدادات'
                  : 'Save settings'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
