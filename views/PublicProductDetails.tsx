import React, { useState, useMemo, useEffect } from 'react';
import { marketStore } from '../store';
import { productService } from '../services/productService';
import { User, Role, Product, Comment } from '../types';
import Logo from '../components/Logo';
import { Language, translations } from '../translations';
import {
  ArrowRight,
  Star,
  ShoppingBag,
  Truck,
  Heart,
  MessageCircle,
  Send,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Headphones,
  Share2,
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import {
  getProductLikesCount,
  getProductIsLiked,
  likeProduct,
  unlikeProduct,
  getProductComments,
  addProductComment,
} from '../services/interactionApi';

interface PublicProductDetailsProps {
  lang: Language;
  user: User | null;
  productId: string | null;
  onBack: () => void;
  onLoginClick: () => void;
  onRefresh?: () => void;
  onViewProfile?: (profileId: string) => void;
  onViewProduct?: (id: string) => void;
  addToCart?: (product: Product, quantity: number) => void;
  addingToCartProductId?: string | null;
  /** عند النقر على "اشتري الآن": الانتقال مباشرة لصفحة الدفع دون إضافة للسلة */
  onBuyNow?: (product: Product, quantity: number) => void;
}

const PublicProductDetails: React.FC<PublicProductDetailsProps> = ({
  lang,
  user,
  productId,
  onBack,
  onLoginClick,
  onRefresh,
  onViewProfile,
  onViewProduct,
  addToCart,
  addingToCartProductId,
  onBuyNow,
}) => {
  const t = translations[lang];
  const { showToast } = useToast();

  // Local State
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [socialCommentInput, setSocialCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'description' | 'additional' | 'review'>('description');

  // Product state (local)
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);

  // Social State
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Fetch Product Logic
  useEffect(() => {
    if (!productId) {
      setIsLoadingProduct(false);
      setProduct(undefined);
      return;
    }
    setIsLoadingProduct(true);
    const loadProduct = async () => {
      let p = marketStore.getProducts().find((p) => p.id === productId);
      if (!p) p = await productService.fetchById(productId);
      setProduct(p);
      setIsLoadingProduct(false);
    };
    loadProduct();
  }, [productId]);

  useEffect(() => {
    setActiveImgIndex(0);
    setQuantity(1);
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    getProductLikesCount(productId)
      .then((r) => setLikesCount(r.count ?? 0))
      .catch(() => setLikesCount(0));
    getProductComments(productId)
      .then((r) => {
        const list = (r.comments || []).map((c) => ({
          id: c.id,
          userId: c.user_id,
          productId,
          text: c.content,
          createdAt: new Date(c.created_at).getTime(),
          userName: undefined,
        }));
        setComments(list);
      })
      .catch(() => setComments([]));
    if (user) {
      getProductIsLiked(productId)
        .then((r) => setIsLiked(r.liked ?? false))
        .catch(() => setIsLiked(false));
    } else {
      setIsLiked(false);
    }
  }, [productId, user?.id]);

  // Track recently viewed (must be before any early return to keep hook order stable)
  useEffect(() => {
    if (!product?.id) return;
    try {
      marketStore.addRecentlyViewedProduct(product.id);
    } catch {
      // ignore storage errors
    }
  }, [product?.id]);

  const images = useMemo(() => {
    if (!product) return [];
    let imgs =
      product.images && product.images.length > 0
        ? product.images
        : [product.imageUrl || product.image_url].filter(Boolean);
    imgs = Array.from(new Set(imgs)).filter((url) => typeof url === 'string' && url.length > 0);
    return imgs.length > 0 ? imgs : ['https://placehold.co/600x600?text=No+Image'];
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product?.category) return [];
    const all = marketStore.getProducts().filter((p) => p.id !== product.id && p.isActive !== false);
    return all.filter((p) => p.category === product.category).slice(0, 8);
  }, [product?.id, product?.category]);

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-palma-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6">
        <div className="text-center space-y-6 animate-fade-in max-w-md">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100 text-3xl">
            🔍
          </div>
          <h2 className="font-heading text-xl font-black text-palma-navy">
            {lang === 'ar' ? 'المنتج غير موجود' : 'Product Not Found'}
          </h2>
          <p className="text-sm text-slate-500">
            {lang === 'ar'
              ? 'قد يكون المنتج محذوفاً أو غير متوفر.'
              : 'The product may have been removed or is unavailable.'}
          </p>
          <button
            onClick={onBack}
            className="bg-palma-navy text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-palma-primary transition-all shadow-lg"
          >
            {t.common.back}
          </button>
        </div>
      </div>
    );
  }

  const merchantProfile = marketStore.getMerchantProfileByUserId(product.merchant_id || product.merchantId || '');
  const merchantName = marketStore.getMerchantNameByUserId(product.merchant_id || product.merchantId || '');

  const reviews = marketStore.getReviewsForProduct(product.id);
  const rating = marketStore.getProductRating(product.id);

  const isCustomer = user?.role === Role.CUSTOMER;
  const alreadyReviewed = user ? reviews.some((r) => r.customer_id === user.id || r.userId === user.id) : false;

  const handleToggleLike = async () => {
    if (!user) return onLoginClick();
    // نسمح لكل المستخدمين المسجلين بالإعجاب، لكن نحافظ على منطق المصادقة كما هو
    setLikeLoading(true);
    try {
      if (isLiked) {
        await unlikeProduct(product.id);
        setIsLiked(false);
      } else {
        await likeProduct(product.id);
        setIsLiked(true);
      }
      const { count } = await getProductLikesCount(product.id);
      setLikesCount(count ?? 0);
    } catch (e: any) {
      showToast(e?.data?.error || e?.message || (lang === 'en' ? 'Request failed' : 'فشل الطلب'), 'error');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return onLoginClick();
    if (!socialCommentInput.trim()) return;
    setCommentLoading(true);
    try {
      const res = await addProductComment(product.id, socialCommentInput);
      if (res.success && res.comment) {
        const newComment: Comment = {
          id: res.comment.id,
          userId: res.comment.user_id,
          productId: product.id,
          text: res.comment.content,
          createdAt: new Date(res.comment.created_at).getTime(),
          userName: user.name,
        };
        setComments([newComment, ...comments]);
        setSocialCommentInput('');
        showToast(lang === 'en' ? 'Comment added' : 'تم إضافة التعليق', 'success');
      }
    } catch (e: any) {
      showToast(
        e?.data?.error || e?.message || (lang === 'en' ? 'Failed to add comment' : 'فشل إضافة التعليق'),
        'error'
      );
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return onLoginClick();
    if (!commentInput.trim())
      return showToast(lang === 'en' ? 'Please provide a comment.' : 'يرجى كتابة تعليق.', 'warning');

    setIsSubmitting(true);
    const result = marketStore.addReview(user.id, product.id, ratingInput, commentInput);

    if (result) {
      showToast(t.common.success, 'success');
      setCommentInput('');
      setRatingInput(5);
      if (onRefresh) onRefresh();
    } else {
      showToast(lang === 'en' ? 'Already reviewed.' : 'تم التقييم مسبقاً.', 'error');
    }
    setIsSubmitting(false);
  };

  const handleAddToCart = () => {
    if (!user) return onLoginClick();
    if (addToCart) addToCart(product, quantity);
    else showToast(lang === 'en' ? 'Add to cart is not available.' : 'إضافة للسلة غير متاحة.', 'warning');
  };

  const handleImageChange = (index: number) => {
    setIsImageLoading(true);
    setActiveImgIndex(index);
    setTimeout(() => setIsImageLoading(false), 300);
  };

  const showNav = !user;

  const basePrice = Number(product?.price ?? product?.price_ils ?? 0);
  const finalPrice =
    (product as any)?.final_price != null ? Number((product as any).final_price) : basePrice;
  const hasDiscount = finalPrice < basePrice;
  const discountPercent =
    (product as any)?.discount_percent != null
      ? Number((product as any).discount_percent)
      : basePrice > 0 && hasDiscount
        ? Math.round((1 - finalPrice / basePrice) * 100)
        : 0;

  const homeLabel = lang === 'ar' ? 'الرئيسية' : 'Home';
  const shopLabel = lang === 'ar' ? 'التسوق' : 'Shop';

  return (
    <div
      className={`min-h-screen bg-slate-50 font-sans text-palma-text transition-all duration-500`}
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      {showNav && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm h-16 sm:h-20 transition-all">
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-palma-muted group"
              >
                <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform rtl:group-hover:translate-x-1 rtl:rotate-180" />
              </button>
              <div onClick={onBack} className="cursor-pointer">
                <Logo size="small" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onLoginClick}
                className="bg-palma-navy text-white px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-palma-primary transition-all shadow-md"
              >
                {t.auth.login}
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 ${showNav ? 'pt-28' : 'pt-8'} animate-slide-up`}>
        {/* Breadcrumb — شريط رمادي مثل التصميم */}
        <div className="bg-slate-100 rounded-xl px-4 py-3 mb-6">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
            <button onClick={onBack} className="hover:text-palma-navy hover:underline">
              {homeLabel}
            </button>
            <span>/</span>
            <button onClick={onBack} className="hover:text-palma-navy hover:underline">
              {shopLabel}
            </button>
            <span>/</span>
            <span className="text-palma-navy">
              {t.categories[product.category as keyof typeof t.categories] || product.category}
            </span>
            <span>/</span>
            <span className="font-bold text-palma-navy truncate max-w-[180px]">
              {lang === 'ar' ? 'تفاصيل المنتج' : 'Product Details'}
            </span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* معرض الصور — صورة رئيسية + أسهم + مصغرات */}
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-card border border-slate-100 relative group">
              <img
                src={images[activeImgIndex]}
                className={`w-full h-full object-cover transition-all duration-500 ${isImageLoading ? 'opacity-80' : ''} group-hover:scale-105`}
                alt={product.name || product.title || 'Product'}
              />
              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-black">
                  %{discountPercent}-
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleImageChange(activeImgIndex === 0 ? images.length - 1 : activeImgIndex - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-amber-400 text-amber-900 shadow-lg flex items-center justify-center hover:bg-amber-300 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImageChange(activeImgIndex === images.length - 1 ? 0 : activeImgIndex + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-amber-400 text-amber-900 shadow-lg flex items-center justify-center hover:bg-amber-300 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggleLike(); }}
                disabled={likeLoading}
                className={`absolute top-4 right-4 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition ${isLiked ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 hover:text-rose-500'}`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => handleImageChange(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${activeImgIndex === i ? 'border-palma-primary ring-2 ring-palma-primary/30' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* معلومات المنتج — فئة، اسم، تقييم، سعر، وصف، كمية، أزرار */}
          <div className="lg:col-span-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t.categories[product.category as keyof typeof t.categories] || product.category}
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-palma-navy mb-3">
              {product.name || product.title || '-'}
            </h1>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1 text-amber-500">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating.average) ? 'fill-current' : 'text-slate-200'}`} />
                ))}
              </div>
              <span className="text-sm font-bold text-palma-navy">
                {rating.average.toFixed(1)} ({rating.count} {lang === 'ar' ? 'تقييم' : 'Reviews'})
              </span>
            </div>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-2xl sm:text-3xl font-black text-palma-primary">₪{finalPrice.toFixed(2)}</span>
              {hasDiscount && (
                <span className="text-lg font-bold text-slate-400 line-through">₪{basePrice.toFixed(2)}</span>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {product.description ||
                (lang === 'ar' ? 'منتج مميز بجودة عالية يناسب احتياجاتك.' : 'Premium quality product designed for your needs.')}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'الكمية' : 'Quantity'}</span>
              <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 text-palma-navy hover:bg-slate-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-bold text-palma-navy border-x border-slate-200">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 text-palma-navy hover:bg-slate-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!!(product && addingToCartProductId === product.id)}
                className="flex-1 min-w-[140px] py-4 rounded-xl bg-palma-primary text-white font-bold text-sm hover:bg-palma-navy transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {product && addingToCartProductId === product.id ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )}
                {product && addingToCartProductId === product.id ? (lang === 'ar' ? 'جاري الإضافة...' : 'Adding...') : t.product.addToCart}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (product && onBuyNow) {
                    onBuyNow(product, quantity);
                  } else {
                    handleAddToCart();
                  }
                }}
                disabled={!!(product && addingToCartProductId === product.id)}
                className="px-6 py-4 rounded-xl bg-amber-400 text-amber-900 font-bold text-sm hover:bg-amber-300 transition disabled:opacity-70"
              >
                {lang === 'ar' ? 'اشتري الآن' : 'Buy Now'}
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
              <span>SKU: {product.id?.slice(0, 12) || '—'}</span>
              {product.category && (
                <span>{lang === 'ar' ? 'التصنيف:' : 'Tags:'} {product.category}</span>
              )}
              <button type="button" className="p-2 rounded-lg hover:bg-slate-100" title={lang === 'ar' ? 'مشاركة' : 'Share'}>
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => { const mid = product.merchant_id || product.merchantId; if (mid && onViewProfile) onViewProfile(mid); }}
              className="w-full bg-slate-50 rounded-xl p-4 flex items-center gap-3 border border-slate-100 hover:border-palma-primary/20 text-left rtl:text-right"
            >
              <div className="w-12 h-12 rounded-xl bg-white overflow-hidden border border-slate-100 shrink-0">
                <img src={merchantProfile?.logo_url || `https://ui-avatars.com/api/?name=${merchantName}`} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{t.common.merchantName}</p>
                <p className="font-bold text-palma-navy truncate">{merchantName || (lang === 'ar' ? 'التاجر' : 'Merchant')}</p>
              </div>
            </button>
          </div>
        </div>

        {/* تبويبات: الوصف | معلومات إضافية | التقييمات */}
        <div className="mt-12 border-t border-slate-200 pt-8">
          <div className="flex gap-6 border-b border-slate-200 mb-6">
            {[
              { id: 'description' as const, ar: 'الوصف', en: 'Description' },
              { id: 'additional' as const, ar: 'معلومات إضافية', en: 'Additional Information' },
              { id: 'review' as const, ar: 'التقييمات', en: 'Review' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id)}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${detailTab === tab.id ? 'border-palma-primary text-palma-navy' : 'border-transparent text-slate-500 hover:text-palma-navy'}`}
              >
                {lang === 'ar' ? tab.ar : tab.en}
              </button>
            ))}
          </div>
          {detailTab === 'description' && (
            <p className="text-slate-600 leading-relaxed">
              {product.description ||
                (lang === 'ar' ? 'منتج عالي الجودة من بالما. مناسب للاستخدام اليومي مع ضمان الجودة.' : 'High quality product from Palma. Suitable for daily use with quality guarantee.')}
            </p>
          )}
          {detailTab === 'additional' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500 w-40">{lang === 'ar' ? 'نوع المنتج' : 'Product Type'}</td><td className="py-2 text-palma-navy">{product.category || '—'}</td></tr>
                  <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500">{lang === 'ar' ? 'الحالة' : 'Condition'}</td><td className="py-2 text-palma-navy">{product.condition || 'new'}</td></tr>
                  <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500">SKU</td><td className="py-2 text-palma-navy">{product.id || '—'}</td></tr>
                </tbody>
              </table>
            </div>
          )}
          {detailTab === 'review' && (
            <div className="space-y-8">
              {user && !alreadyReviewed && (
                <form onSubmit={handleSubmitReview} className="bg-slate-50 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">{t.product.addReview}</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map((star) => (
                        <button key={star} type="button" onClick={() => setRatingInput(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}>
                          <Star className={`w-5 h-5 ${star <= (hoverRating || ratingInput) ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder={lang === 'ar' ? 'اكتب تجربتك...' : 'Write your experience...'} className="w-full p-3 rounded-xl border border-slate-200 text-sm resize-none h-24" />
                  <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-palma-primary text-white text-sm font-bold">{isSubmitting ? '...' : t.common.save}</button>
                </form>
              )}
              <div>
                <h4 className="font-heading font-bold text-palma-navy mb-3">{t.common.reviews} ({reviews.length})</h4>
                <div className="space-y-3">
                  {reviews.length === 0 ? <p className="text-slate-400 text-sm">{t.common.noData}</p> : reviews.slice().reverse().map((rev) => (
                    <div key={rev.id} className="flex gap-3 p-4 bg-white rounded-xl border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-palma-primaryLight flex items-center justify-center font-bold text-palma-navy text-sm shrink-0">{rev.customer_name?.charAt(0)}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-palma-navy text-sm">{rev.customer_name}</span>
                          <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />)}</div>
                        </div>
                        <p className="text-sm text-slate-600">"{rev.comment}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-heading font-bold text-palma-navy mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> {lang === 'ar' ? 'التعليقات' : 'Comments'} ({comments.length})
                </h4>
                {user && (
                  <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                    <input
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                      placeholder={lang === 'ar' ? 'أضف تعليقاً...' : 'Add a comment...'}
                      value={socialCommentInput}
                      onChange={(e) => setSocialCommentInput(e.target.value)}
                    />
                    <button type="submit" className="px-4 py-2.5 rounded-xl bg-palma-navy text-white text-sm font-bold disabled:opacity-50" disabled={!socialCommentInput.trim() || commentLoading}>
                      <Send className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </form>
                )}
                <div className="space-y-3">
                  {comments.length === 0 ? <p className="text-slate-400 text-sm">{lang === 'ar' ? 'لا تعليقات بعد.' : 'No comments yet.'}</p> : comments.map((c) => (
                    <div key={c.id} className="p-4 bg-white rounded-xl border border-slate-100">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-palma-navy">{c.userName ?? (user && c.userId === user.id ? user.name : 'User')}</span>
                        <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-600">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* منتجات ذات صلة */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <p className="text-sm font-bold text-slate-500 mb-1">{lang === 'ar' ? 'منتجات ذات صلة' : 'Related Products'}</p>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-palma-navy mb-6">
              {lang === 'ar' ? 'اكتشف منتجات مشابهة' : 'Explore Related Products'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((p) => {
                const img = p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/300x300?text=No+Image';
                const bp = Number(p.price ?? p.price_ils ?? 0);
                const fp = (p as any).final_price != null ? Number((p as any).final_price) : bp;
                const disc = fp < bp;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onViewProduct?.(p.id)}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden text-left rtl:text-right hover:shadow-lg hover:border-palma-primary/20 transition-all group"
                  >
                    <div className="aspect-square relative">
                      <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                      {disc && <span className="absolute top-2 left-2 bg-palma-primary text-white px-2 py-0.5 rounded text-[10px] font-black">%{Math.round((1 - fp/bp) * 100)}-</span>}
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] text-slate-500 uppercase font-bold truncate">{p.category}</p>
                      <p className="font-bold text-palma-navy text-sm line-clamp-2">{p.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-black text-palma-primary text-sm">₪{fp.toFixed(2)}</span>
                        {disc && <span className="text-[10px] text-slate-400 line-through">₪{bp.toFixed(2)}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* شحن مجاني، دفع مرن، دعم */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50/80 border border-amber-100">
            <div className="w-12 h-12 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0"><Truck className="w-6 h-6 text-amber-800" /></div>
            <div>
              <p className="font-heading font-bold text-palma-navy">{lang === 'ar' ? 'شحن مجاني' : 'Free Shipping'}</p>
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'شحن مجاني للطلبات فوق حد معين' : 'Free shipping for order above threshold'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50/80 border border-amber-100">
            <div className="w-12 h-12 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0"><CreditCard className="w-6 h-6 text-amber-800" /></div>
            <div>
              <p className="font-heading font-bold text-palma-navy">{lang === 'ar' ? 'دفع مرن' : 'Flexible Payment'}</p>
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'خيارات دفع آمنة متعددة' : 'Multiple secure payment options'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-palma-primaryLight/50 border border-palma-primary/20">
            <div className="w-12 h-12 rounded-xl bg-palma-primary/20 flex items-center justify-center shrink-0"><Headphones className="w-6 h-6 text-palma-navy" /></div>
            <div>
              <p className="font-heading font-bold text-palma-navy">{lang === 'ar' ? 'دعم 24/7' : '24x7 Support'}</p>
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'ندعمك أونلاين كل الأيام' : 'We support online all days'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicProductDetails;
