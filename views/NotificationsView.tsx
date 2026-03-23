import React, { useState, useEffect } from 'react';
import { Language, translations } from '../translations';
import { Bell, Package, Heart, MessageCircle, Check, UserPlus } from 'lucide-react';
import { getNotifications, markNotificationRead, type ApiNotification } from '../services/interactionApi';

interface NotificationsViewProps {
  lang: Language;
  onViewProduct?: (id: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ lang, onViewProduct }) => {
  const t = translations[lang];
  const [list, setList] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNotifications(filter === 'unread');
      setList(res.notifications || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleMarkRead = async (n: ApiNotification) => {
    if (n.is_read) return;
    try {
      await markNotificationRead(n.id);
      setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    } catch {}
  };

  const typeLabel = (type: string) => {
    if (type === 'new_product') return lang === 'en' ? 'New product' : 'منتج جديد';
    if (type === 'like') return lang === 'en' ? 'Like' : 'إعجاب';
    if (type === 'comment') return lang === 'en' ? 'Comment' : 'تعليق';
    if (type === 'follow') return lang === 'en' ? 'New follower' : 'متابع جديد';
    if (type === 'order_paid') return lang === 'en' ? 'Order paid' : 'تم دفع الطلب';
    if (type === 'loyalty_level_up') return lang === 'en' ? 'Loyalty level' : 'مستوى الولاء';
    if (type === 'referral_reward') return lang === 'en' ? 'Referral reward' : 'مكافأة إحالة';
    if (type === 'welcome') return lang === 'en' ? 'Welcome' : 'ترحيب';
    return type;
  };

  const typeIcon = (type: string) => {
    if (type === 'new_product') return <Package className="w-4 h-4" />;
    if (type === 'like') return <Heart className="w-4 h-4" />;
    if (type === 'comment') return <MessageCircle className="w-4 h-4" />;
    if (type === 'follow') return <UserPlus className="w-4 h-4" />;
    if (type === 'order_paid') return <Package className="w-4 h-4" />;
    if (type === 'loyalty_level_up') return <Bell className="w-4 h-4" />;
    if (type === 'referral_reward') return <Bell className="w-4 h-4" />;
    if (type === 'welcome') return <Bell className="w-4 h-4" />;
    return <Bell className="w-4 h-4" />;
  };

  const unreadCount = list.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-black text-palma-navy flex items-center gap-2">
          <Bell className="w-6 h-6" />
          {lang === 'en' ? 'Notifications' : 'الإشعارات'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filter === 'all' ? 'bg-palma-primary text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {lang === 'en' ? 'All' : 'الكل'}
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${filter === 'unread' ? 'bg-palma-primary text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {lang === 'en' ? 'Unread' : 'غير مقروء'}
            {unreadCount > 0 && <span className="bg-white/30 rounded-full px-1.5 text-xs">{unreadCount}</span>}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-palma-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {lang === 'en' ? 'No notifications yet.' : 'لا توجد إشعارات بعد.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((n) => (
            <li
              key={n.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                n.is_read ? 'border-slate-100' : 'border-palma-primary/30 ring-1 ring-palma-primary/10'
              }`}
            >
              <div className="p-4 flex gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.is_read ? 'bg-slate-100 text-slate-500' : 'bg-palma-primary/10 text-palma-primary'
                  }`}
                >
                  {typeIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{typeLabel(n.type)}</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {n.type === 'new_product' &&
                      (lang === 'en'
                        ? 'A merchant you follow posted a new product.'
                        : 'تاجر تتابعه أضاف منتجاً جديداً.')}
                    {n.type === 'like' && (lang === 'en' ? 'Someone liked a product.' : 'أعجب أحدهم بمنتج.')}
                    {n.type === 'comment' && (lang === 'en' ? 'New comment on a product.' : 'تعليق جديد على منتج.')}
                    {n.type === 'follow' &&
                      (n.message || (lang === 'en' ? 'A customer started following you.' : 'زبون بدأ بمتابعتك.'))}
                    {n.type === 'order_paid' &&
                      (n.message ||
                        (lang === 'en'
                          ? 'Your payment was received and your order is being prepared.'
                          : 'تم استلام دفعتك وجاري تجهيز طلبك.'))}
                    {n.type === 'loyalty_level_up' &&
                      (n.message ||
                        (lang === 'en'
                          ? 'Your loyalty level has been updated.'
                          : 'تم ترقية مستوى ولائك في النظام.'))}
                    {n.type === 'referral_reward' &&
                      (n.message ||
                        (lang === 'en'
                          ? 'You received extra points for a successful referral.'
                          : 'حصلت على نقاط إضافية مقابل إحالة ناجحة.'))}
                    {n.type === 'welcome' &&
                      (n.message ||
                        (lang === 'en' ? 'Welcome to Palma.' : 'مرحباً بك في بالما.'))}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'ar-EG')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-palma-primary/10 text-slate-500 hover:text-palma-primary transition-colors"
                      title={lang === 'en' ? 'Mark as read' : 'تحديد كمقروء'}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {n.type === 'new_product' && onViewProduct && (
                    <button
                      onClick={() => {
                        handleMarkRead(n);
                        onViewProduct(n.reference_id);
                      }}
                      className="text-xs font-bold text-palma-primary hover:underline"
                    >
                      {lang === 'en' ? 'View' : 'عرض'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
