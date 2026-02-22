
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { Auth } from './components/Auth';
import PublicWebsite from './components/PublicWebsite';
import PublicCatalog from './components/PublicCatalog';
import { CustomerView } from './views/CustomerView';
import { CheckoutPage } from './views/CheckoutPage';
import { CheckoutReturnPage } from './views/CheckoutReturnPage';
import { MerchantView } from './views/MerchantView';
import { BrokerView } from './views/BrokerView';
import { AdminView } from './views/AdminView';
import ProfileView from './views/ProfileView';
import PublicBrokerPage from './views/PublicBrokerPage';
import PublicProfileView from './views/PublicProfileView'; // Updated View
import PublicProductDetails from './views/PublicProductDetails';
import { NotificationsView } from './views/NotificationsView';
import { MerchantTermsView } from './views/MerchantTermsView';
import { PendingReview } from './components/PendingReview';
import VerifyEmail from './components/VerifyEmail';
import { User, Product, CartItem } from './types';
import { marketStore } from './store';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { productService } from './services/productService';
import { Language } from './translations';
import { ToastProvider, useToast } from './components/ToastProvider';
import { useCart } from './hooks/useCart';
import * as cartApi from './services/cartApi';

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
  const [lang, setLang] = useState<Language>('ar');
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
        // Legacy Broker link support
        setPublicBrokerId(brokerRef);
        setPublicState('BROKER_PAGE');
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
      const meResult = await authService.getMe();
      const u = meResult.success && meResult.data?.user ? meResult.data.user : null;
      if (u) {
        authService.setCurrentUser(u);
        setUser(u);
        setDefaultView(u);
        localStorage.setItem('palma_current_user', JSON.stringify(u));
      } else {
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

  const toggleLang = () => setLang(prev => prev === 'ar' ? 'en' : 'ar');

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
    if (u.role === 'MERCHANT') setCurrentView('dashboard');
    else if (u.role === 'ADMIN') setCurrentView('dashboard');
    else if (u.role === 'BROKER') setCurrentView('dashboard');
    else setCurrentView('home');
  };

  const handleLogin = (loggedInUser: User) => {
    authService.setCurrentUser(loggedInUser);
    setUser(loggedInUser);
    localStorage.setItem('palma_current_user', JSON.stringify(loggedInUser));
    setDefaultView(loggedInUser);
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
  };

  /** Add to cart: uses backend when user is set, else local state + localStorage (multi-user safe) */
  const addToCart = async (product: Product, quantity: number = 1) => {
    const productId = product?.id ?? (product as unknown as { product_id?: string })?.product_id ?? '';
    if (user) {
      if (!productId) {
        showToast(lang === 'ar' ? 'منتج غير صالح' : 'Invalid product', 'error');
        return;
      }
      const ok = await apiCart.addItem(productId, quantity);
      if (ok) showToast(lang === 'ar' ? 'تمت الإضافة للسلة' : 'Added to cart', 'success');
      else if (apiCart.error) showToast(apiCart.error, 'error');
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
    setAuthView(view);
    setPublicState('AUTH');
  };

  const handleViewProduct = (productId: string) => {
    setSelectedProductId(productId);
    if (user) {
        setCurrentView('product_details');
    } else {
        setPublicState('PRODUCT_DETAILS');
    }
  };

  const handleViewProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (user) {
        setCurrentView('public_profile');
    } else {
        setPublicState('PUBLIC_PROFILE');
    }
  };

  if (checkoutReturnOrderId && checkoutReturnPayment) {
    return (
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
    );
  }

  if (user && showApiCheckout) {
    return (
      <CheckoutPage
        lang={lang}
        cart={checkoutCart.length > 0 ? checkoutCart : cart}
        clearCart={clearCart}
        onBack={() => { setShowApiCheckout(false); setCheckoutCart([]); }}
      />
    );
  }

  if (!user) {
    if (publicState === 'PRODUCT_DETAILS' && selectedProductId) {
      return (
        <PublicProductDetails 
          lang={lang}
          user={null}
          productId={selectedProductId}
          onBack={() => setPublicState('CATALOG')}
          onLoginClick={() => openAuth('LOGIN')}
          addToCart={addToCart}
        />
      );
    }

    if (publicState === 'PUBLIC_PROFILE' && selectedProfileId) {
      return (
        <PublicProfileView 
          lang={lang}
          currentUser={null}
          profileId={selectedProfileId}
          onBack={() => setPublicState('LANDING')}
          onProductClick={handleViewProduct}
          onLoginClick={() => openAuth('LOGIN')}
          toggleLang={toggleLang}
        />
      );
    }

    if (publicState === 'BROKER_PAGE' && publicBrokerId) {
      return (
        <PublicBrokerPage 
          lang={lang}
          brokerId={publicBrokerId}
          onBack={() => setPublicState('LANDING')}
          onProductClick={handleViewProduct}
          onLoginClick={() => openAuth('LOGIN')}
          toggleLang={toggleLang}
        />
      );
    }

    if (showMerchantTermsPage) {
      return (
        <MerchantTermsView
          lang={lang}
          onBack={() => setShowMerchantTermsPage(false)}
        />
      );
    }

    if (publicState === 'LANDING') {
      return (
        <PublicWebsite 
          lang={lang}
          toggleLang={toggleLang}
          onLoginClick={() => openAuth('LOGIN')}
          onJoinMerchant={() => openAuth('REGISTER_MERCHANT')}
          onJoinBroker={() => openAuth('REGISTER_BROKER')}
          onExploreProducts={() => setPublicState('CATALOG')}
          onViewProduct={handleViewProduct}
          onOpenTerms={() => setShowMerchantTermsPage(true)}
        />
      );
    }
    
    if (publicState === 'CATALOG') {
      return (
        <PublicCatalog 
          onBack={() => setPublicState('LANDING')}
          onLoginClick={() => openAuth('LOGIN')}
          onProductClick={handleViewProduct} 
        />
      );
    }
    
    return (
      <Auth
        onLogin={handleLogin}
        initialView={authView}
        onOpenTerms={() => setShowMerchantTermsPage(true)}
      />
    );
  }

  // 4. Email Verification Check – user/admin/broker/merchant must verify before accessing app
  if (!user.emailVerified) {
    return (
      <VerifyEmail
        user={user}
        onLogout={handleLogout}
        lang={lang}
        onVerified={(verifiedUser) => {
          authService.setCurrentUser(verifiedUser);
          setUser(verifiedUser);
          localStorage.setItem('palma_current_user', JSON.stringify(verifiedUser));
          setDefaultView(verifiedUser);
          showToast(lang === 'ar' ? 'تم التحقق بنجاح!' : 'Verified successfully!', 'success');
        }}
      />
    );
  }

  const roleUpper = (user.role || '').toUpperCase();
  if ((user.status === 'PENDING' || user.status === 'REJECTED') && roleUpper !== 'ADMIN' && roleUpper !== 'MERCHANT') {
    return <PendingReview user={user} onLogout={handleLogout} lang={lang} />;
  }

  return (
    <Layout 
      user={user} 
      lang={lang}
      toggleLang={toggleLang}
      onLogout={handleLogout} 
      activeTab={currentView} 
      onTabChange={(tab) => {
        setCurrentView(tab);
        if (tab !== 'product_details') setSelectedProductId(null);
        if (tab !== 'public_profile') setSelectedProfileId(null);
      }}
      cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
    >
      {currentView === 'profile' ? (
        <ProfileView 
          lang={lang}
          user={user}
          onRefresh={refreshUser}
          onViewProduct={(id) => {
              setSelectedProductId(id);
              setCurrentView('product_details');
          }}
        />
      ) : currentView === 'product_details' && selectedProductId ? (
          <PublicProductDetails 
            lang={lang}
            user={user}
            productId={selectedProductId}
            onBack={() => setCurrentView('home')}
            onLoginClick={() => {}} 
            onRefresh={refreshUser}
            onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
            addToCart={addToCart}
          />
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
            toggleLang={toggleLang}
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
              <CustomerView 
                user={user} 
                view={currentView === 'orders_customer' ? 'orders' : currentView} 
                cart={cart}
                addToCart={addToCart}
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
            </div>
          )}

          {user.role === 'MERCHANT' && (
            <MerchantView 
              user={user} 
              view={currentView} 
              onViewProduct={(id) => { setSelectedProductId(id); setCurrentView('product_details'); }}
              onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
            />
          )}
          
          {user.role === 'ADMIN' && (
              <AdminView 
                view={currentView} 
                onViewProduct={(id) => { setSelectedProductId(id); setCurrentView('product_details'); }}
                onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView('public_profile'); }}
              />
          )}

          {user.role === 'BROKER' && (
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
