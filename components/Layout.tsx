
import React from 'react';
import { User, Role } from '../types';
import Logo from './Logo';
import { Language, translations } from '../translations';
import { ShoppingCart, Menu, X, Globe, LogOut, LayoutDashboard, Package, ShoppingBag, Banknote, User as UserIcon, TrendingUp, BarChart, Users, Wallet, Home, History, Bell } from 'lucide-react';

interface LayoutProps {
  lang: Language;
  toggleLang: () => void;
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  cartCount?: number;
}

const Layout: React.FC<LayoutProps> = ({ lang, toggleLang, user, onLogout, children, activeTab, onTabChange, cartCount = 0 }) => {
  const t = translations[lang];
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isProfessional = [Role.MERCHANT, Role.BROKER, Role.ADMIN].includes(user.role as Role);

  const getRoleLabel = (role: Role | string) => {
    const r = role as keyof typeof t.roles;
    return t.roles[r] || role;
  };

  const getIcon = (iconName: string, size = 20) => {
    const icons: Record<string, React.ReactNode> = {
      LayoutDashboard: <LayoutDashboard size={size} />,
      Package: <Package size={size} />,
      ShoppingBag: <ShoppingBag size={size} />,
      Banknote: <Banknote size={size} />,
      User: <UserIcon size={size} />,
      Globe: <Globe size={size} />,
      BarChart: <BarChart size={size} />,
      Users: <Users size={size} />,
      Wallet: <Wallet size={size} />,
      Home: <Home size={size} />,
      History: <History size={size} />,
      ShoppingCart: <ShoppingCart size={size} />,
      TrendingUp: <TrendingUp size={size} />,
      Bell: <Bell size={size} />
    };
    return icons[iconName] || <LayoutDashboard size={size} />;
  };

  const userMenuItems = user.role === Role.MERCHANT ? [
    { id: 'dashboard', label: t.common.dashboard, icon: 'LayoutDashboard' },
    { id: 'products', label: t.common.products, icon: 'Package' },
    { id: 'orders', label: t.common.orders, icon: 'ShoppingBag' },
    { id: 'earnings', label: t.common.earnings, icon: 'Banknote' },
    { id: 'shop', label: t.nav.shop, icon: 'ShoppingCart' },
    { id: 'profile', label: t.common.profile, icon: 'User' },
  ] : user.role === Role.BROKER ? [
    { id: 'promote', label: t.nav.market, icon: 'Globe' },
    { id: 'earnings', label: t.common.earnings, icon: 'Banknote' },
    { id: 'stats', label: t.common.stats, icon: 'BarChart' },
    { id: 'shop', label: t.nav.shop, icon: 'ShoppingCart' },
    { id: 'profile', label: t.common.profile, icon: 'User' },
  ] : user.role === Role.ADMIN ? [
    { id: 'users', label: t.common.users, icon: 'Users' },
    { id: 'products', label: t.common.products, icon: 'Package' },
    { id: 'orders', label: t.common.orders, icon: 'ShoppingBag' },
    { id: 'withdrawals', label: t.common.withdrawals, icon: 'Wallet' },
  ] : [ 
    { id: 'home', label: t.nav.home, icon: 'Home' },
    { id: 'notifications', label: t.nav.notifications, icon: 'Bell' },
    { id: 'orders_customer', label: t.nav.orders, icon: 'History' },
    { id: 'cart', label: t.nav.cart, icon: 'ShoppingCart' },
  ];

  const profileImg = user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=1F5D42&color=fff&size=80`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80 font-sans text-palma-text" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <header className="bg-white/95 backdrop-blur-md border-b border-palma-border sticky top-0 z-40 shadow-soft transition-all duration-300">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-8 h-16 sm:h-20 flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="lg:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2.5 text-palma-navy hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-palma-primary/20">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
            <div className="cursor-pointer flex items-center hover:opacity-90 transition-opacity" onClick={() => onTabChange('home')}>
               <Logo size="medium" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {(user.role === Role.CUSTOMER || user.role === Role.MERCHANT || user.role === Role.BROKER || user.role === Role.ADMIN) && (
              <button 
                onClick={() => onTabChange(user.role === Role.CUSTOMER || user.role === Role.ADMIN ? 'cart' : 'shop')}
                className="relative p-2.5 text-palma-muted hover:text-palma-primary hover:bg-palma-primaryLight rounded-xl transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-palma-primary/20"
                title={t.nav.cart}
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-105 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-palma-primary text-[10px] font-bold text-white shadow-soft ring-2 ring-white">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
            <button 
              onClick={toggleLang}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl border border-palma-border text-xs font-semibold text-palma-navy hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-palma-primary/20"
            >
              <Globe className="w-4 h-4" />
              {lang === 'ar' ? 'EN' : lang === 'en' ? 'עברית' : 'العربية'}
            </button>
            <div className="h-6 w-px bg-palma-border hidden sm:block" />
            <div className="flex items-center gap-2 sm:gap-3 pl-2">
              <button 
                onClick={() => onTabChange('profile')}
                className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-50 transition-all duration-200 group border border-transparent hover:border-palma-border focus:outline-none focus:ring-2 focus:ring-palma-primary/20"
              >
                <img src={profileImg} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border border-palma-border object-cover shadow-soft" alt="Profile" />
                <div className="hidden sm:flex flex-col text-right rtl:text-left pr-2 rtl:pl-2">
                  <span className="text-sm font-bold text-palma-navy leading-tight">{user.name}</span>
                  <span className="text-[10px] font-medium text-palma-muted uppercase tracking-wide">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </button>
              <button
                onClick={onLogout}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                title={t.common.logout}
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1800px] mx-auto w-full">
        {/* Desktop Sidebar */}
        {isProfessional && (
          <aside className={`hidden lg:block w-72 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto py-8 pr-6 rtl:pr-0 rtl:pl-6`}>
            <div className="bg-white rounded-2xl shadow-card border border-palma-border h-full flex flex-col p-4">
              <div className="px-3 py-3 mb-1">
                <h3 className="text-xs font-bold text-palma-muted uppercase tracking-widest">{t.common.dashboard}</h3>
              </div>
              <nav className="space-y-0.5 flex-1">
                {userMenuItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
                      activeTab === item.id 
                        ? 'bg-palma-primaryLight text-palma-primary shadow-soft' 
                        : 'text-palma-muted hover:bg-slate-50 hover:text-palma-navy'
                    }`}
                  >
                    {activeTab === item.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-palma-primary rounded-r-full rtl:left-auto rtl:right-0 rtl:rounded-r-none rtl:rounded-l-full" />
                    )}
                    <span className={`transition-colors duration-200 ${activeTab === item.id ? 'text-palma-primary' : 'text-slate-400 group-hover:text-palma-navy'}`}>
                      {getIcon(item.icon, 20)}
                    </span>
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="mt-auto p-4 bg-slate-50/80 rounded-xl border border-palma-border">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2.5 rounded-xl shadow-soft border border-palma-border">
                    <TrendingUp size={16} className="text-palma-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-palma-navy">Palma Business</p>
                    <p className="text-[10px] text-palma-muted font-medium">Pro Plan Active</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute top-0 right-0 bottom-0 w-80 bg-white shadow-card-hover flex flex-col border-l border-palma-border" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.3s ease-out' }}>
               <div className="p-6 border-b border-palma-border flex justify-between items-center bg-white rounded-tl-2xl">
                 <Logo size="small" />
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-palma-muted" /></button>
               </div>
               <div className="p-4 overflow-y-auto flex-1 bg-white">
                 <nav className="space-y-1">
                  {userMenuItems.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => { onTabChange(item.id); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        activeTab === item.id ? 'bg-palma-primaryLight text-palma-primary' : 'text-palma-muted hover:bg-slate-50'
                      }`}
                    >
                      {getIcon(item.icon)}
                      {item.label}
                    </button>
                  ))}
                </nav>
               </div>
               <div className="p-6 border-t border-palma-border bg-slate-50/80">
                  <button onClick={onLogout} className="flex items-center gap-3 text-sm font-semibold text-red-600 w-full justify-center py-3 bg-white border border-palma-border rounded-xl hover:bg-red-50 hover:border-red-100 transition-all duration-200 shadow-soft">
                    <LogOut size={18} />
                    {t.common.logout}
                  </button>
               </div>
            </div>
          </div>
        )}

        <main className={`flex-1 min-w-0 p-4 sm:p-6 lg:p-8`}>
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {!isProfessional && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-palma-border pb-safe z-50 shadow-soft">
          <div className="flex justify-around items-center h-20 pb-2">
            {userMenuItems.map(item => (
              <button 
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 group ${
                  activeTab === item.id ? 'text-palma-primary' : 'text-slate-400'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all duration-200 ${activeTab === item.id ? 'bg-palma-primaryLight -translate-y-0.5' : 'group-hover:bg-slate-50'}`}>
                   {getIcon(item.icon, 22)}
                </div>
                <span className={`text-[10px] font-semibold ${activeTab === item.id ? 'text-palma-navy' : ''}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
