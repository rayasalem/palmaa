/**
 * Merchant dashboard tab: stats and subscription info.
 * Lazy-loaded when the dashboard tab is active.
 */

import React from 'react';
import { Product, Order } from '../../types';
import type { MerchantDashboardResponse } from '../../services/merchantDashboardService';
import type { Language } from '../../translations';
import { Package, Truck, DollarSign, Receipt, CreditCard } from 'lucide-react';

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: string;
}) => (
  <div className="dashboard-stat-card flex flex-col justify-between min-h-[140px] group">
    <div className="absolute -right-4 -top-4 p-3 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity">
      <Icon className="w-20 h-20 text-palma-navy" />
    </div>
    <div className="flex justify-between items-start z-10">
      <div className={`p-2.5 rounded-xl ${color} text-white shadow-sm`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-emerald-100">
          ↗ {trend}
        </span>
      )}
    </div>
    <div className="z-10">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</h3>
      <p className="text-2xl font-black text-palma-navy tracking-tight">{value}</p>
    </div>
  </div>
);

export interface MerchantDashboardTabProps {
  lang: Language;
  t: Record<string, any> & { common: Record<string, string> };
  dashboardData: MerchantDashboardResponse | null;
  orders: Order[];
  products: Product[];
}

export const MerchantDashboardTab: React.FC<MerchantDashboardTabProps> = ({
  lang,
  t,
  dashboardData,
  orders,
  products,
}) => (
  <div className="space-y-6">
    {dashboardData && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={lang === 'ar' ? 'إجمالي المبيعات' : lang === 'he' ? 'סה"כ מכירות' : 'Total sales'}
          value={`₪${(dashboardData.stats.total_sales || 0).toLocaleString()}`}
          icon={DollarSign}
          color="bg-palma-primary"
        />
        <StatCard
          title={t.common.commission}
          value={`₪${(dashboardData.stats.total_commission || 0).toLocaleString()}`}
          icon={Receipt}
          color="bg-blue-600"
        />
        <StatCard
          title={lang === 'ar' ? 'خصم ضريبي' : lang === 'he' ? 'קנס מס' : 'Tax penalty'}
          value={`₪${(dashboardData.stats.total_tax_penalty || 0).toLocaleString()}`}
          icon={Receipt}
          color="bg-amber-600"
        />
        <StatCard
          title={lang === 'ar' ? 'صافي الأرباح' : lang === 'he' ? 'רווח נקי' : 'Net profit'}
          value={`₪${(dashboardData.stats.net_profit || 0).toLocaleString()}`}
          icon={CreditCard}
          color="bg-emerald-600"
        />
      </div>
    )}
    {dashboardData?.subscription && (
      <div className="dashboard-card dashboard-card-body hover:shadow-sm transition-shadow">
        <h3 className="text-sm font-black text-palma-navy uppercase tracking-wider mb-2">
          {lang === 'ar' ? 'اشتراك التاجر' : lang === 'he' ? 'מנוי סוחר' : 'Merchant subscription'}
        </h3>
        <p className="text-sm text-slate-600">
          {lang === 'ar'
            ? 'اشتراكك في المنصة مجاني دائماً، ولا توجد أي رسوم اشتراك شهرية للتاجر.'
            : lang === 'he'
              ? 'המנוי שלך בפלטפורמה חינמי לחלוטין – ללא דמי מנוי חודשיים לסוחר.'
              : 'Your merchant account on the platform is always free – no monthly subscription fees.'}
        </p>
      </div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title={t.common.totalRevenue}
        value={`${orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0).toLocaleString()} ₪`}
        icon={DollarSign}
        color="bg-palma-primary"
        trend="12%"
      />
      <StatCard
        title={t.common.pendingOrders}
        value={orders.filter((o) => o.status === 'PENDING').length}
        icon={Truck}
        color="bg-blue-600"
      />
      <StatCard title={t.common.totalInventory} value={products.length} icon={Package} color="bg-purple-600" />
    </div>
  </div>
);
