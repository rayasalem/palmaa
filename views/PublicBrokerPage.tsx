import React, { useState } from 'react';
import { marketStore } from '../store';
import { SharedProduct, User, Role } from '../types';
import Logo from '../components/Logo';
import { Language, translations } from '../translations';
import { Globe, ChevronDown } from 'lucide-react';
import { secureImageSrc, setImageToPlaceholder } from '../utils/secureUrl';

const BROKER_PAGE_IMG_FALLBACK = 'https://placehold.co/400x400?text=No+Image';

const LANG_LABELS: Record<Language, string> = { ar: 'العربية', en: 'English', he: 'עברית' };

interface PublicBrokerPageProps {
  lang: Language;
  brokerId: string;
  onBack: () => void;
  onProductClick: (id: string) => void;
  onLoginClick: () => void;
  setLang: (l: Language) => void;
}

const PublicBrokerPage: React.FC<PublicBrokerPageProps> = ({
  lang,
  brokerId,
  onBack,
  onProductClick,
  onLoginClick,
  setLang,
}) => {
  const t = translations[lang];
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const broker = marketStore.getUserById(brokerId);
  const shared = marketStore.getSharedProducts(brokerId);

  if (!broker || broker.role !== Role.BROKER) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl text-center max-w-md w-full">
          <span className="text-4xl block mb-4">🔍</span>
          <h3 className="font-heading text-xl font-black text-palma-navy mb-2">Broker Not Found</h3>
          <p className="text-slate-500 text-sm mb-6">
            The link you followed may be broken or the broker is no longer active.
          </p>
          <button
            onClick={onBack}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const profileImg = secureImageSrc(
    broker.profile_image,
    `https://ui-avatars.com/api/?name=${encodeURIComponent(broker.name)}&background=1F5D42&color=fff&size=200`
  );
  const totalSales = shared.reduce((acc, s) => acc + s.sales, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button type="button" onClick={onBack} className="cursor-pointer p-0 hover:opacity-90">
            <Logo size="small" />
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-400 hover:text-slate-900"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{LANG_LABELS[lang]}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {langMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40"
                    aria-label="Close language menu"
                    onClick={() => setLangMenuOpen(false)}
                  />
                  <div className="absolute top-full mt-1 end-0 min-w-[120px] py-1 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                    {(['ar', 'en', 'he'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setLang(l);
                          setLangMenuOpen(false);
                        }}
                        className={`block w-full text-left rtl:text-right px-3 py-2 text-xs font-medium ${l === lang ? 'bg-palma-primaryLight text-palma-primary' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        {LANG_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={onLoginClick} className="btn-primary px-6 py-2.5 text-xs uppercase tracking-widest">
              {t.auth.login}
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-10 pb-32 px-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid lg:grid-cols-4 gap-12 items-start">
          {/* Broker Identity Sidebar */}
          <div className="lg:sticky lg:top-32 space-y-8">
            <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-palma-soft to-transparent"></div>
              <div className="w-32 h-32 rounded-[2rem] border-4 border-white shadow-lg overflow-hidden mx-auto relative z-10 bg-slate-100">
                <img
                  src={profileImg}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  alt={broker.name}
                  onError={setImageToPlaceholder}
                />
              </div>

              <div className="relative z-10">
                <span className="bg-palma-primary/10 text-palma-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-2">
                  Certified Partner
                </span>
                <h1 className="font-heading text-2xl font-black text-palma-navy leading-tight">{broker.name}</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Broker</p>
              </div>

              <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Endorsed</p>
                  <p className="text-xl font-black text-slate-900">{shared.length}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Trusted By</p>
                  <p className="text-xl font-black text-slate-900">{totalSales * 12 + 15}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 text-left rtl:text-right">
                <p className="text-xs font-black text-slate-300 uppercase mb-3 tracking-widest">About</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                  "
                  {broker.bio ||
                    'Passionate about sharing the best quality products from local merchants in our community.'}
                  "
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[3rem] p-10 text-white space-y-6 shadow-2xl relative overflow-hidden group cursor-pointer">
              <div className="relative z-10">
                <h3 className="text-xl font-black tracking-tight">Need Recommendations?</h3>
                <p className="text-white/60 text-xs leading-relaxed mt-2 font-medium">
                  Chat with this broker for personalized assistance on your shopping journey.
                </p>
                <button className="w-full py-4 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest mt-6 shadow-lg hover:scale-105 transition-transform active:scale-95">
                  Message Broker
                </button>
              </div>
              <div className="absolute -right-6 -bottom-6 text-8xl opacity-10 group-hover:scale-110 transition-transform duration-700">
                💬
              </div>
            </div>
          </div>

          {/* Broker Endorsements */}
          <div className="lg:col-span-3 space-y-10">
            <div className="flex justify-between items-end px-4">
              <div>
                <h2 className="font-heading text-4xl font-black text-palma-navy tracking-tight uppercase">
                  {lang === 'en' ? 'My Top Picks' : 'مختاراتي المفضلة'}
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Hand-picked quality products
                </p>
              </div>
            </div>

            {shared.length === 0 ? (
              <div className="bg-white rounded-[4rem] p-32 text-center border-2 border-dashed border-slate-200">
                <span className="text-6xl mb-6 block opacity-50">🛍️</span>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
                  This broker hasn't endorsed any products yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {shared.map((s) => {
                  const p = marketStore.getProducts().find((prod) => prod.id === s.product_id);
                  if (!p) return null;
                  const mName = marketStore.getMerchantNameByUserId(p.merchant_id || '');
                  const displayImage = secureImageSrc(
                    p.images?.[0] || p.imageUrl || p.image_url,
                    BROKER_PAGE_IMG_FALLBACK
                  );
                  return (
                    <div
                      key={s.id}
                      onClick={() => onProductClick(p.id)}
                      className={`bg-white rounded-[3rem] p-6 md:p-10 border ${s.is_featured ? 'border-palma-primary shadow-xl' : 'border-slate-100 shadow-soft'} hover:shadow-2xl transition-all duration-500 group cursor-pointer flex flex-col md:flex-row gap-10 relative overflow-hidden`}
                    >
                      {s.is_featured && (
                        <div className="absolute top-0 right-12 bg-palma-primary text-white px-4 py-2 rounded-b-xl text-[8px] font-black uppercase tracking-widest shadow-lg z-20">
                          Broker's Choice
                        </div>
                      )}

                      <div className="w-full md:w-72 aspect-square rounded-[2.5rem] overflow-hidden bg-slate-50 shrink-0 relative group-hover:shadow-lg transition-all">
                        <img
                          src={displayImage}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          alt={p.name}
                          onError={setImageToPlaceholder}
                        />
                        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur py-3 px-4 rounded-2xl flex justify-between items-center shadow-lg">
                          <span className="text-xs font-black uppercase text-slate-400">Price</span>
                          <span className="text-base font-black text-palma-primary">₪{p.price || p.price_ils}</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-between py-2">
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                                {p.category}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {mName}
                              </span>
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight group-hover:text-palma-primary transition-colors leading-tight">
                              {p.name}
                            </h3>
                          </div>

                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative">
                            <div className="flex items-start gap-4">
                              <div className="text-3xl">❝</div>
                              <div>
                                {s.marketing_title && (
                                  <h5 className="font-black text-slate-900 text-sm mb-1 uppercase tracking-wide">
                                    {s.marketing_title}
                                  </h5>
                                )}
                                <p className="text-slate-600 text-xs font-medium leading-relaxed italic">
                                  {s.marketing_description ||
                                    'I highly recommend this product for its quality and value.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-6 md:mt-0">
                          <button
                            onClick={() => onProductClick(p.id)}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-palma-primary transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 group-hover:gap-3"
                          >
                            {t.common.details} <span className="transition-all">→</span>
                          </button>
                          <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[100px]">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Popularity</p>
                            <div className="flex justify-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <span key={i} className="text-xs text-palma-gold">
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
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
    </div>
  );
};

export default PublicBrokerPage;
