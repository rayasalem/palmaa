
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import Layout from './components/Layout';
import { Auth } from './components/Auth';
import { CheckoutPage } from './views/CheckoutPage';
import { CheckoutReturnPage } from './views/CheckoutReturnPage';
import { BrokerView } from './views/BrokerView';
import PublicBrokerPage from './views/PublicBrokerPage';
import PublicProfileView from './views/PublicProfileView';
import { NotificationsView } from './views/NotificationsView';
import { MerchantTermsView } from './views/MerchantTermsView';
import { PendingReview } from './components/PendingReview';
import VerifyEmail from './components/VerifyEmail';
import { PageLoader } from './components/PageLoader';
import { SupportChat } from './components/SupportChat';

/*
 * Code splitting (React.lazy + Suspense): heavy views are loaded on demand so the initial bundle is smaller.
 * Split: PublicWebsite, PublicCatalog, CustomerView, MerchantView, AdminView, ProfileView, PublicProductDetails.
 * Routing paths, guards, and role-based rendering are unchanged; business logic is untouched.
 */
const PublicWebsite = lazy(() => import('./components/PublicWebsite'));
const PublicCatalog = lazy(() => import('./components/PublicCatalog'));
const CustomerView = lazy(() => import('./views/CustomerView').then((m) => ({ default: m.CustomerView })));
const MerchantView = lazy(() => import('./views/MerchantView').then((m) => ({ default: m.MerchantView })));
const AdminView = lazy(() => import('./views/AdminView').then((m) => ({ default: m.AdminView })));
const ProfileView = lazy(() => import('./views/ProfileView'));
const PublicProductDetails = lazy(() => import('./views/PublicProductDetails'));
import { User, Product, CartItem } from './types';
import { marketStore } from './store';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { productService } from './services/productService';
import { Language, getAuthErrorMessage } from './translations';
import { ToastProvider, useToast } from './components/ToastProvider';
import { useCart } from './hooks/useCart';
import * as cartApi from './services/cartApi';
import { SESSION_EXPIRED_EVENT } from './api/client';
import { prefetchAfterLogin } from './prefetch';
import { ROUTES } from './routes';

/** Restore user profile from storage for UI (not JWT; auth uses httpOnly cookie or Bearer). */
const loadUser = (): User | null => {
  const stored = localStorage.getItem('palma_current_user');
  return stored ? JSON.parse(stored) : null;
};

// Component to handle verification logic inside ToastProvider context
const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('home');
  /** Guest cart (localStorage) when not logged in */
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  /** Backend cart for logged-in user (multi-user persistence) */
  const apiCart = useCart(user?.id ?? null);
  /** Unified cart: backend when user is set, else local */
  const cart = user ? apiCart.cart : localCart;
  const [authView, setAuthView] = useState<'LOGIN' | 'ROLE_SELECT' | 'REGISTER_MERCHANT' | 'REGISTER_BROKER' | 'REGISTER_CUSTOMER'>('LOGIN');
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'ar';
    const saved = localStorage.getItem('palma_lang') as Language | null;
    return saved === 'ar' || saved === 'en' || saved === 'he' ? saved : 'ar';
  });
  const setLang = useCallback((next: Language) => {
    setLangState(next);
    if (typeof window !== 'undefined') localStorage.setItem('palma_lang', next);
  }, []);
  const { showToast } = useToast();
  
  // Public State: 'LANDING' | 'CATALOG' | 'AUTH' | 'BROKER_PAGE' | 'PRODUCT_DETAILS' | 'PUBLIC_PROFILE'
  const [publicState, setPublicState] = useState<'LANDING' | 'CATALOG' | 'AUTH' | 'BROKER_PAGE' | 'PRODUCT_DETAILS' | 'PUBLIC_PROFILE'>('LANDING');
  const [publicBrokerId, setPublicBrokerId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [checkoutReturnOrderId, setCheckoutReturnOrderId] = useState<string | null>(null);
  const [checkoutReturnPayment, setCheckoutReturnPayment] = useState<string | null>(null);
  const [showApiCheckout, setShowApiCheckout] = useState(false);
  const [checkoutCart, setCheckoutCart] = useState<CartItem[]>([]);
  const [showMerchantTermsPage, setShowMerchantTermsPage] = useState(false);
  const [pendingAuthAfterTerms, setPendingAuthAfterTerms] = useState<'REGISTER_MERCHANT' | null>(null);
  const [addingToCartProductId, setAddingToCartProductId] = useState<string | null>(null);
  const isApplyingHashRef = useRef(false);

  /** Update browser URL hash so the path changes when navigating (e.g. palma.ps/#/catalog, #/admin) */
  const updateHash = useCallback((path: string) => {
    if (isApplyingHashRef.current) return;
    const value = path ? `#/${path}` : '#/';
    if (window.location.hash !== value) {
      // استخدم hash فعلي حتى المتصفح يسجّل خطوة في الـ history
      // وبالتالي زر الرجوع يرجّع للمسار السابق داخل الموقع، ليس للموقع السابق بالكامل.
      window.location.hash = value;
    }
  }, []);

  /** Read hash and apply to state — مسارات محددة في routes.ts */
  const applyHashToState = useCallback(() => {
    const raw = window.location.hash.replace(/^#\/?/, '').trim() || '';
    const parts = raw.split('/').filter(Boolean);
    const top = parts[0] || '';
    isApplyingHashRef.current = true;
    setShowMerchantTermsPage(false);
    setPendingAuthAfterTerms(null);
    if (top === ROUTES.CATALOG) {
      setPublicState('CATALOG');
      setCurrentView(ROUTES.HOME_APP);
    } else if (top === ROUTES.LOGIN) {
      setPublicState('AUTH');
      setAuthView('LOGIN');
    } else if (top === ROUTES.JOIN) {
      setPublicState('AUTH');
      setAuthView('ROLE_SELECT');
    } else if (top === ROUTES.REGISTER_MERCHANT) {
      setPendingAuthAfterTerms('REGISTER_MERCHANT');
      setShowMerchantTermsPage(true);
    } else if (top === ROUTES.REGISTER_BROKER) {
      setPublicState('AUTH');
      setAuthView('REGISTER_BROKER');
    } else if (top === ROUTES.REGISTER) {
      setPublicState('AUTH');
      setAuthView('REGISTER_CUSTOMER');
    } else if (top === ROUTES.TERMS) {
      setShowMerchantTermsPage(true);
    } else if (top === 'product' && parts[1]) {
      setSelectedProductId(parts[1]);
      setPublicState('PRODUCT_DETAILS');
      setCurrentView('product_details');
    } else if (top === 'profile' && parts[1]) {
      setSelectedProfileId(parts[1]);
      setPublicState('PUBLIC_PROFILE');
      setCurrentView('public_profile');
    } else if (top === 'broker' && parts[1]) {
      setPublicBrokerId(parts[1]);
      setPublicState('BROKER_PAGE');
    } else if ([ROUTES.ADMIN, ROUTES.DASHBOARD, ROUTES.SUBSCRIPTION, ROUTES.PROMOTE, ROUTES.EARNINGS, ROUTES.STATS, ROUTES.HOME_APP, ROUTES.CART, ROUTES.SHOP, ROUTES.PRODUCTS, ROUTES.NOTIFICATIONS, ROUTES.PROFILE, ROUTES.ORDERS].includes(top)) {
      setCurrentView(top === ROUTES.ORDERS ? 'orders_customer' : top);
      if (top !== 'product_details') setSelectedProductId(null);
      if (top !== 'public_profile') setSelectedProfileId(null);
    } else {
      setPublicState('LANDING');
      setCurrentView(ROUTES.HOME_APP);
      setSelectedProductId(null);
      setSelectedProfileId(null);
    }
    setTimeout(() => { isApplyingHashRef.current = false; }, 0);
  }, []);

  useEffect(() => {
    applyHashToState();
    const onHashChange = () => applyHashToState();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [applyHashToState]);

  // Sync language with document for components that rely on DOM direction
  useEffect(() => {
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const initApp = async () => {
      // 1. Check for URL Params (Verification, Referral, etc.)
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      const brokerRef = params.get('broker');
      const productRef = params.get('product');
      const profileRef = params.get('profile');
      
      if (ref) {
        marketStore.setReferral(ref);
      }

      if (brokerRef) {
        setPublicBrokerId(brokerRef);
        setPublicState('BROKER_PAGE');
        updateHash(ROUTES.broker(brokerRef));
      }

      if (profileRef) {
          handleViewProfile(profileRef);
      }

      if (productRef) {
        handleViewProduct(productRef);
      }
      const orderIdParam = params.get('orderId');
      const paymentParam = params.get('payment');
      if (orderIdParam && paymentParam) {
        setCheckoutReturnOrderId(orderIdParam);
        setCheckoutReturnPayment(paymentParam);
      }

      // 2. Restore session from backend (JWT cookie) or fallback to localStorage
      let meResult;
      try {
        meResult = await authService.getMe();
      } catch (_) {
        meResult = { success: false as const, error: 'Request failed' };
      }
      const u = meResult && meResult.success && meResult.data?.user ? meResult.data.user : null;
      const is401 = meResult && !meResult.success && (meResult as { statusCode?: number }).statusCode === 401;
      if (u) {
        authService.setCurrentUser(u);
        setUser(u);
        setDefaultView(u);
        localStorage.setItem('palma_current_user', JSON.stringify(u));
        prefetchAfterLogin(u);
      } else {
        if (is401) localStorage.removeItem('palma_current_user');
        const savedUser = loadUser();
        if (savedUser) {
          authService.setCurrentUser(savedUser);
          setUser(savedUser);
          setDefaultView(savedUser);
        }
      }
      
      // 3. Load products (for CustomerView shop; productService populates db.products)
      try {
        await productService.getAll();
      } catch (_e) { /* ignore */ }

      // 4. Load guest cart (only when not logged in; logged-in cart comes from useCart/API)
      const savedCart = localStorage.getItem('palma_cart');
      if (savedCart) setLocalCart(JSON.parse(savedCart));
    };

    initApp();
  }, []);

  // أي طلب يرجع 401 يمسح التوكن ويطلق هذا الحدث — نمسح المستخدم محلياً لتفادي "مسجل دخول" بدون جلسة
  useEffect(() => {
    const onSessionExpired = () => {
      authService.setCurrentUser(null);
      setUser(null);
      localStorage.removeItem('palma_current_user');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);


  // Merge guest cart into backend when user logs in (multi-user: no cart loss)
  const mergedGuestCartRef = useRef(false);
  useEffect(() => {
    if (!user || localCart.length === 0 || mergedGuestCartRef.current) return;
    mergedGuestCartRef.current = true;
    (async () => {
      for (const item of localCart) {
        await cartApi.addCartItem(item.id, item.quantity);
      }
      setLocalCart([]);
      localStorage.removeItem('palma_cart');
      apiCart.refetch();
    })();
  }, [user, localCart.length]);

  const refreshUser = () => {
    if (!user) return;
    const u = marketStore.getUserById(user.id);
    if (u) {
      setUser({...u});
      localStorage.setItem('palma_current_user', JSON.stringify(u));
    }
  };

  const setDefaultView = (u: User) => {
    const tab = u.role === 'MERCHANT' || u.role === 'ADMIN' || u.role === 'BROKER' ? 'dashboard' : 'home';
    setCurrentView(tab);
    updateHash(tab);
  };

  const handleLogin = (loggedInUser: User) => {
    authService.setCurrentUser(loggedInUser);
    setUser(loggedInUser);
    localStorage.setItem('palma_current_user', JSON.stringify(loggedInUser));
    setDefaultView(loggedInUser);
    // Prefetch API data by role so Orders/Merchant/Admin tabs load faster (no state/route change)
    prefetchAfterLogin(loggedInUser);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setLocalCart([]);
    mergedGuestCartRef.current = false;
    localStorage.removeItem('palma_current_user');
    localStorage.removeItem('palma_cart');
    setCurrentView('home');
    setPublicState('LANDING');
    setAuthView('LOGIN');
    updateHash(ROUTES.HOME);
  };

  /** Add to cart: uses backend when user is set, else local state + localStorage (multi-user safe) */
  const addToCart = async (product: Product, quantity: number = 1) => {
    const productId = product?.id ?? (product as unknown as { product_id?: string })?.product_id ?? '';
    if (user) {
      if (!productId) {
        showToast(lang === 'ar' ? 'منتج غير صالح' : 'Invalid product', 'error');
        return;
      }
      setAddingToCartProductId(productId);
      try {
        const ok = await apiCart.addItem(productId, quantity);
        if (ok) showToast(lang === 'ar' ? 'تمت الإضافة للسلة' : 'Added to cart', 'success');
        else if (apiCart.error) showToast(getAuthErrorMessage(apiCart.error, lang) || apiCart.error, 'error');
      } finally {
        setAddingToCartProductId(null);
      }
    } else {
      setLocalCart(prev => {
        const existing = prev.find(p => p.id === product.id);
        const price = product.price ?? product.price_ils ?? 0;
        const newCart = existing
          ? prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + quantity } : p)
          : [...prev, { ...product, quantity, price } as CartItem];
        localStorage.setItem('palma_cart', JSON.stringify(newCart));
        return newCart;
      });
      showToast(lang === 'ar' ? 'تمت الإضافة للسلة' : 'Added to cart', 'success');
    }
  };

  /** Remove from cart: backend when user, else local */
  const removeFromCart = async (id: string) => {
    if (user) {
      await apiCart.removeItem(id);
    } else {
      setLocalCart(prev => {
        const newCart = prev.filter(p => p.id !== id);
        localStorage.setItem('palma_cart', JSON.stringify(newCart));
        return newCart;
      });
    }
  };

  /** Update quantity: backend when user, else local */
  const updateQuantity = async (id: string, delta: number) => {
    if (user) {
      const item = cart.find(p => p.id === id);
      if (item) await apiCart.updateQuantity(id, item.quantity + delta);
    } else {
      setLocalCart(prev => {
        const newCart = prev.map(p => {
          if (p.id === id) return { ...p, quantity: Math.max(0, p.quantity + delta) };
          return p;
        }).filter(p => p.quantity > 0);
        localStorage.setItem('palma_cart', JSON.stringify(newCart));
        return newCart;
      });
    }
  };

  /** Clear cart: backend when user, else local */
  const clearCart = async () => {
    if (user) {
      await apiCart.clearCart();
    } else {
      setLocalCart([]);
      localStorage.removeItem('palma_cart');
    }
  };

  const openAuth = (view: typeof authView) => {
    // تسجيل التاجر يمر أولاً على صفحة الشروط والأحكام
    if (view === 'REGISTER_MERCHANT') {
      setPendingAuthAfterTerms('REGISTER_MERCHANT');
      setShowMerchantTermsPage(true);
      updateHash(ROUTES.TERMS);
      return;
    }
    setAuthView(view);
    setPublicState('AUTH');
    const path =
      view === 'ROLE_SELECT'
        ? ROUTES.JOIN
        : view === 'REGISTER_BROKER'
        ? ROUTES.REGISTER_BROKER
        : view === 'REGISTER_CUSTOMER'
        ? ROUTES.REGISTER
        : ROUTES.LOGIN;
    updateHash(path);
  };

  const handleViewProduct = (productId: string) => {
    setSelectedProductId(productId);
    updateHash(ROUTES.product(productId));
    if (user) {
        setCurrentView('product_details');
    } else {
        setPublicState('PRODUCT_DETAILS');
    }
  };

  const handleViewProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    updateHash(ROUTES.profile(profileId));
    if (user) {
        setCurrentView('public_profile');
    } else {
        setPublicState('PUBLIC_PROFILE');
    }
  };

  if (checkoutReturnOrderId && checkoutReturnPayment) {
    return (
      <>
        <CheckoutReturnPage
          lang={lang}
          orderId={checkoutReturnOrderId}
          paymentParam={checkoutReturnPayment}
          clearCart={clearCart}
          onBack={() => {
            setCheckoutReturnOrderId(null);
            setCheckoutReturnPayment(null);
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', window.location.pathname || '/');
              window.dispatchEvent(new CustomEvent('palma-refresh-orders'));
            }
          }}
        />
        <SupportChat lang={lang} user={user} />
      </>
    );
  }

  if (user && showApiCheckout) {
    return (
      <>
        <CheckoutPage
          lang={lang}
          cart={checkoutCart.length > 0 ? checkoutCart : cart}
          clearCart={clearCart}
          onBack={() => { setShowApiCheckout(false); setCheckoutCart([]); }}
          onPaymentSuccess={(orderId) => {
            setCheckoutReturnOrderId(orderId);
            setCheckoutReturnPayment('success');
            setShowApiCheckout(false);
            setCheckoutCart([]);
          }}
        />
        <SupportChat lang={lang} user={user} />
      </>
    );
  }

  if (!user) {
    if (publicState === 'PRODUCT_DETAILS' && selectedProductId) {
      return (
        <>
          <Suspense fallback={<PageLoader />}>
            <PublicProductDetails 
              lang={lang}
              user={null}
              productId={selectedProductId}
              onBack={() => { setPublicState('CATALOG'); updateHash(ROUTES.CATALOG); }}
              onLoginClick={() => openAuth('LOGIN')}
              addToCart={addToCart}
            />
          </Suspense>
          <SupportChat lang={lang} user={user} />
        </>
      );
    }

    if (publicState === 'PUBLIC_PROFILE' && selectedProfileId) {
      return (
        <>
          <PublicProfileView 
            lang={lang}
            currentUser={null}
            profileId={selectedProfileId}
            onBack={() => { setPublicState('LANDING'); updateHash(ROUTES.HOME); }}
            onProductClick={handleViewProduct}
            onLoginClick={() => openAuth('LOGIN')}
            setLang={setLang}
          />
          <SupportChat lang={lang} user={user} />
        </>
      );
    }

    if (publicState === 'BROKER_PAGE' && publicBrokerId) {
      return (
        <>
          <PublicBrokerPage 
            lang={lang}
            brokerId={publicBrokerId}
            onBack={() => { setPublicState('LANDING'); updateHash(ROUTES.HOME); }}
            onProductClick={handleViewProduct}
            onLoginClick={() => openAuth('LOGIN')}
            setLang={setLang}
          />
          <SupportChat lang={lang} user={user} />
        </>
      );
    }

    if (showMerchantTermsPage) {
      return (
        <>
          <MerchantTermsView
            lang={lang}
            onBack={() => {
              setShowMerchantTermsPage(false);
              setPendingAuthAfterTerms(null);
              updateHash(ROUTES.HOME);
            }}
            onAccept={
              pendingAuthAfterTerms === 'REGISTER_MERCHANT'
                ? () => {
                    setShowMerchantTermsPage(false);
                    setPendingAuthAfterTerms(null);
                    setAuthView('REGISTER_MERCHANT');
                    setPublicState('AUTH');
                    updateHash(ROUTES.REGISTER_MERCHANT);
                  }
                : undefined
            }
          />
          <SupportChat lang={lang} user={user} />
        </>
      );
    }

    if (publicState === 'LANDING') {
      return (
        <>
          <Suspense fallback={<PageLoader />}>
            <PublicWebsite 
              lang={lang}
              setLang={setLang}
              onLoginClick={() => openAuth('LOGIN')}
              onJoinRegister={() => openAuth('ROLE_SELECT')}
              onJoinMerchant={() => openAuth('REGISTER_MERCHANT')}
              onJoinBroker={() => openAuth('REGISTER_BROKER')}
              onJoinCustomer={() => openAuth('REGISTER_CUSTOMER')}
              onExploreProducts={() => { setPublicState('CATALOG'); updateHash(ROUTES.CATALOG); }}
              onViewProduct={handleViewProduct}
              onOpenTerms={() => {
                setPendingAuthAfterTerms(null);
                setShowMerchantTermsPage(true);
                updateHash(ROUTES.TERMS);
              }}
            />
          </Suspense>
          <SupportChat lang={lang} user={user} />
        </>
      );
    }
    
    if (publicState === 'CATALOG') {
      return (
        <>
          <Suspense fallback={<PageLoader />}>
            <PublicCatalog 
              onBack={() => { setPublicState('LANDING'); updateHash(ROUTES.HOME); }}
              onLoginClick={() => openAuth('LOGIN')}
              onProductClick={handleViewProduct} 
            />
          </Suspense>
          <SupportChat lang={lang} user={user} />
        </>
      );
    }
    
    return (
      <>
        <Auth
          onLogin={handleLogin}
          initialView={authView}
          onOpenTerms={() => {
            setPendingAuthAfterTerms('REGISTER_MERCHANT');
            setShowMerchantTermsPage(true);
            updateHash(ROUTES.TERMS);
          }}
        />
        <SupportChat lang={lang} user={user} />
      </>
    );
  }

  // أدمن: لا يدخل إلا بعد تأكيد الإيميل؛ إن سجّل دخول وهو غير مؤكد نعرض له شاشة التأكيد
  const roleUpper = (user.role || '').toUpperCase();
  if (roleUpper === 'ADMIN' && !user.emailVerified) {
    return (
      <>
        <VerifyEmail
          user={user}
          onVerified={(verifiedUser) => {
            authService.setCurrentUser(verifiedUser);
            setUser(verifiedUser);
            localStorage.setItem('palma_current_user', JSON.stringify(verifiedUser));
          }}
          onLogout={handleLogout}
          lang={lang}
        />
        <SupportChat lang={lang} user={user} />
      </>
    );
  }

  // فقط الحسابات المرفوضة تبقى محجوبة؛ التسجيل الجديد يدخل مباشرة لصفحته
  if (user.status === 'REJECTED' && roleUpper !== 'ADMIN') {
    return (
      <>
        <PendingReview user={user} onLogout={handleLogout} lang={lang} />
        <SupportChat lang={lang} user={user} />
      </>
    );
  }

  return (
    <>
    <Layout 
      user={user} 
      lang={lang}
      setLang={setLang}
      onLogout={handleLogout} 
      activeTab={currentView} 
      onTabChange={(tab) => {
        setCurrentView(tab);
        if (tab !== 'product_details') setSelectedProductId(null);
        if (tab !== 'public_profile') setSelectedProfileId(null);
        const path = tab === 'orders_customer' ? 'orders' : tab;
        updateHash(path);
      }}
      cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
    >
      {currentView === 'profile' ? (
        <Suspense fallback={<PageLoader />}>
          <ProfileView 
            lang={lang}
            user={user}
            onRefresh={refreshUser}
            onViewProduct={(id) => {
                setSelectedProductId(id);
                setCurrentView('product_details');
            }}
          />
        </Suspense>
      ) : currentView === 'product_details' && selectedProductId ? (
          <Suspense fallback={<PageLoader />}>
            <PublicProductDetails 
              lang={lang}
              user={user}
              productId={selectedProductId}
              onBack={() => setCurrentView('home')}
              onLoginClick={() => {}} 
              onRefresh={refreshUser}
              onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
              addToCart={addToCart}
              addingToCartProductId={addingToCartProductId}
            />
          </Suspense>
      ) : currentView === 'public_profile' && selectedProfileId ? (
          <PublicProfileView 
            lang={lang}
            currentUser={user}
            profileId={selectedProfileId}
            onBack={() => setCurrentView('home')}
            onProductClick={(id) => {
                setSelectedProductId(id);
                setCurrentView('product_details');
            }}
            onLoginClick={() => {}}
            setLang={setLang}
          />
      ) : currentView === 'notifications' ? (
          <NotificationsView
            lang={lang}
            onViewProduct={(id) => {
              setSelectedProductId(id);
              setCurrentView('product_details');
            }}
          />
      ) : (
        <>
          {(user.role === 'CUSTOMER') && (
            <div className={'block'}>
              <Suspense fallback={<PageLoader />}>
                <CustomerView 
                  user={user} 
                  view={currentView === 'orders_customer' ? 'orders' : currentView} 
                  cart={cart}
                  addToCart={addToCart}
                  addingToCartProductId={addingToCartProductId}
                  removeFromCart={removeFromCart}
                  updateQuantity={updateQuantity}
                  clearCart={clearCart}
                  lang={lang}
                  onRefresh={refreshUser}
                  onViewProduct={(id) => {
                      setSelectedProductId(id);
                      setCurrentView('product_details');
                  }}
                  onViewProfile={(id) => {
                      setSelectedProfileId(id);
                      setCurrentView('public_profile');
                  }}
                  onTabChange={(tab) => {
                      if (tab === 'home' || tab === 'shop') setCurrentView('home');
                      else if (tab === 'cart') setCurrentView('cart');
                      else if (tab === 'orders') setCurrentView('orders_customer');
                      else setCurrentView(tab);
                  }}
                  onProceedToApiCheckout={(items) => { setCheckoutCart(items); setShowApiCheckout(true); }}
                />
              </Suspense>
            </div>
          )}

          {user.role === 'MERCHANT' && (currentView === 'shop' || currentView === 'cart') && (
            <div className="block">
              <Suspense fallback={<PageLoader />}>
                <CustomerView
                  user={user}
                  view={currentView}
                  cart={cart}
                  addToCart={addToCart}
                  addingToCartProductId={addingToCartProductId}
                  removeFromCart={removeFromCart}
                  updateQuantity={updateQuantity}
                  clearCart={clearCart}
                  lang={lang}
                  onRefresh={refreshUser}
                  onViewProduct={(id) => { setSelectedProductId(id); setCurrentView('product_details'); }}
                  onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
                  onTabChange={(tab) => { if (tab === 'shop' || tab === 'cart') setCurrentView(tab); updateHash(tab); }}
                  onProceedToApiCheckout={(items) => { setCheckoutCart(items); setShowApiCheckout(true); }}
                  shopOnlySection
                />
              </Suspense>
            </div>
          )}

          {user.role === 'MERCHANT' && currentView !== 'shop' && currentView !== 'cart' && (
            <Suspense fallback={<PageLoader />}>
              <MerchantView 
                user={user} 
                view={currentView} 
                onViewProduct={(id) => { setSelectedProductId(id); setCurrentView('product_details'); }}
                onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
              />
            </Suspense>
          )}
          
          {user.role === 'ADMIN' && (currentView === 'shop' || currentView === 'cart') && (
            <div className="block">
              <Suspense fallback={<PageLoader />}>
                <CustomerView
                  user={user}
                  view={currentView}
                  cart={cart}
                  addToCart={addToCart}
                  removeFromCart={removeFromCart}
                  updateQuantity={updateQuantity}
                  clearCart={clearCart}
                  lang={lang}
                  onRefresh={refreshUser}
                  onViewProduct={(id) => { setSelectedProductId(id); setCurrentView('product_details'); }}
                  onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
                  onTabChange={(tab) => { if (tab === 'shop' || tab === 'cart') setCurrentView(tab); updateHash(tab); }}
                  onProceedToApiCheckout={(items) => { setCheckoutCart(items); setShowApiCheckout(true); }}
                  shopOnlySection
                />
              </Suspense>
            </div>
          )}

          {user.role === 'ADMIN' && currentView !== 'shop' && currentView !== 'cart' && (
              <Suspense fallback={<PageLoader />}>
                <AdminView 
                  view={currentView} 
                  onViewProduct={(id) => { setSelectedProductId(id); setCurrentView('product_details'); }}
                  onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
                />
              </Suspense>
          )}

          {user.role === 'BROKER' && (currentView === 'shop' || currentView === 'cart') && (
            <div className="block">
              <Suspense fallback={<PageLoader />}>
                <CustomerView
                  user={user}
                  view={currentView}
                  cart={cart}
                  addToCart={addToCart}
                  removeFromCart={removeFromCart}
                  updateQuantity={updateQuantity}
                  clearCart={clearCart}
                  lang={lang}
                  onRefresh={refreshUser}
                  onViewProduct={(id) => { setSelectedProductId(id); setCurrentView('product_details'); }}
                  onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
                  onTabChange={(tab) => { if (tab === 'shop' || tab === 'cart') setCurrentView(tab); updateHash(tab); }}
                  onProceedToApiCheckout={(items) => { setCheckoutCart(items); setShowApiCheckout(true); }}
                  shopOnlySection
                />
              </Suspense>
            </div>
          )}

          {user.role === 'BROKER' && currentView !== 'shop' && currentView !== 'cart' && (
            <BrokerView 
              user={user} 
              lang={lang}
              activeTab={currentView}
              onTabChange={setCurrentView}
              onRefresh={refreshUser}
              onViewProduct={(id) => { setSelectedProductId(id); setCurrentView('product_details'); }}
              onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
            />
          )}
        </>
      )}
    </Layout>
    <SupportChat lang={lang} user={user} />
    </>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
