import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, Role, MerchantProfile, Product, PRODUCT_CATEGORIES, CATEGORY_EMOJI } from '../types';
import { marketStore } from '../store';
import { productService } from '../services/productService';
import { Language, translations } from '../translations';
import { getInternalCities, getInternalVillages } from '../services/flashlineService';
import { useToast } from '../components/ToastProvider';
import { userService } from '../services/userService';
import { User as UserIcon, Package, MapPin, CreditCard, KeyRound, ChevronLeft } from 'lucide-react';
import { secureImageSrc, setImageToPlaceholder } from '../utils/secureUrl';

interface ProfileViewProps {
  lang: Language;
  user: User;
  onRefresh: () => void;
  onViewProduct: (id: string) => void;
  /** للانتقال إلى تبويب طلباتي من داخل صفحة الحساب (تصميم My Account) */
  onNavigateToOrders?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ lang, user, onRefresh, onViewProduct, onNavigateToOrders }) => {
  const t = translations[lang];
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const handleConfirmEmail = async () => {
    setIsVerifyingEmail(true);
    try {
      const res = await userService.confirmEmailManually(user.id);
      if (res.success) {
        showToast(lang === 'ar' ? 'تم تأكيد البريد الإلكتروني بنجاح' : 'Email confirmed successfully', 'success');
        onRefresh();
      } else {
        showToast(res.error || 'Failed to confirm email', 'error');
      }
    } catch (e) {
      showToast('Error confirming email', 'error');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const productImgInputRef = useRef<HTMLInputElement>(null);

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isProductUploading, setIsProductUploading] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price_ils: '',
    stock: '',
    category: '',
    image_url: '',
    is_bestseller: false,
  });
  const [productFormError, setProductFormError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMerchant, setSelectedMerchant] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  // Products State
  const [myProducts, setMyProducts] = useState<Product[]>([]);

  const merchantProfile = user.role === Role.MERCHANT ? marketStore.getMerchantProfileByUserId(user.id) : null;

  // Hierarchical Location Data
  const cities = useMemo(() => getInternalCities(), []);
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(merchantProfile?.city_id);
  const availableVillages = useMemo(
    () => (selectedCityId ? getInternalVillages(selectedCityId) : []),
    [selectedCityId]
  );

  // Fetch products on mount or update
  useEffect(() => {
    const fetchProducts = async () => {
      if (user.role === Role.MERCHANT) {
        const prods = await productService.getByMerchantId(user.id);
        setMyProducts(prods);
      }
    };
    fetchProducts();
  }, [user.id, user.role, marketStore.getProducts().length]); // Depend on store length for optimistic updates

  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    phone2: user.phone2 || '',
    city: user.city || '',
    bio: user.bio || '',
    profile_image: user.profile_image || '',
    business_name: merchantProfile?.business_name || '',
    business_description: merchantProfile?.business_description || '',
    business_address: merchantProfile?.business_address || '',
    village_id: merchantProfile?.village_id,
    city_id: merchantProfile?.city_id,
    region_id: merchantProfile?.region_id,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = parseInt(e.target.value);
    const city = cities.find((c) => c.id === cityId);
    if (city) {
      setSelectedCityId(cityId);
      setFormData({
        ...formData,
        city_id: city.id,
        region_id: city.regionId,
        city: lang === 'en' ? city.nameEn : city.nameAr,
        village_id: undefined,
      });
    }
  };

  const handleVillageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = parseInt(e.target.value);
    setFormData({ ...formData, village_id: vId });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const { url, error } = await marketStore.uploadImage(file, 'profiles');
    if (error) {
      showToast(error, 'info');
    } else if (url) {
      setFormData((prev) => ({ ...prev, profile_image: url }));
    }
    setIsUploading(false);
  };

  const handleSave = () => {
    marketStore.updateUserProfile(user.id, {
      name: formData.name,
      phone: formData.phone,
      phone2: formData.phone2,
      city: formData.city,
      bio: formData.bio,
      profile_image: formData.profile_image,
    });

    if (user.role === Role.MERCHANT && merchantProfile) {
      marketStore.updateMerchantProfile(user.id, {
        business_name: formData.business_name,
        business_description: formData.business_description,
        business_address: formData.business_address,
        logo_url: formData.profile_image || merchantProfile.logo_url,
        city_id: formData.city_id,
        village_id: formData.village_id,
        region_id: formData.region_id,
      });
    }

    showToast(t.common.success, 'success');
    setIsEditing(false);
    onRefresh();
  };

  const handleProductImgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProductUploading(true);
    const { url, error } = await marketStore.uploadImage(file, 'products');
    if (error) {
      setProductFormError(error);
    } else if (url) {
      setProductForm((prev) => ({ ...prev, image_url: url }));
    }
    setIsProductUploading(false);
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError('');

    if (
      !productForm.name ||
      !productForm.description ||
      !productForm.price_ils ||
      !productForm.stock ||
      !productForm.category ||
      !productForm.image_url
    ) {
      setProductFormError(t.common.validationError);
      return;
    }

    const priceNum = parseFloat(productForm.price_ils);
    const stockNum = parseInt(productForm.stock);

    const res = await marketStore.addProduct(user.id, {
      name: productForm.name,
      description: productForm.description,
      price_ils: priceNum,
      stock: stockNum,
      category: productForm.category,
      image_url: productForm.image_url,
      is_bestseller: productForm.is_bestseller,
    });

    if (res.success) {
      showToast(t.common.productAdded, 'success');
      setIsAddingProduct(false);
      setProductForm({
        name: '',
        description: '',
        price_ils: '',
        stock: '',
        category: '',
        image_url: '',
        is_bestseller: false,
      });
      // Refresh local list
      if (res.data) setMyProducts((prev) => [res.data!, ...prev]);
      onRefresh();
    } else {
      setProductFormError(res.error || 'Failed to add product');
    }
  };

  const filteredProducts = useMemo<Product[]>(() => {
    // If merchant, filter myProducts. If customer looking at their profile (unlikely scenario here but robust), filter store.
    let base =
      user.role === Role.MERCHANT ? myProducts : (marketStore.getFilteredProducts({ searchTerm }) as Product[]);

    // Apply local filter if needed
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      base = base.filter((p) => p.name.toLowerCase().includes(term));
    }
    return base;
  }, [user.id, user.role, searchTerm, myProducts]);

  const groupedProducts = useMemo<Record<string, Product[]>>(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach((p: Product) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const userImg = secureImageSrc(
    formData.profile_image,
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1F5D42&color=fff&size=200`
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 overflow-x-hidden">
      {isAddingProduct && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
          onClick={() => setIsAddingProduct(false)}
        >
          <div
            className="bg-white rounded-3xl lg:rounded-[3rem] p-6 sm:p-10 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-10 animate-in zoom-in-95 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddingProduct(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl flex items-center justify-center transition-all"
            >
              ✕
            </button>
            <div className="text-center md:text-left rtl:md:text-right pt-4 sm:pt-0">
              <h3 className="font-heading text-2xl sm:text-3xl font-black text-palma-navy tracking-tight">
                {t.common.addProduct}
              </h3>
            </div>
            <form onSubmit={handleAddProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              <div className="space-y-6">
                {productFormError && (
                  <p className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-black uppercase text-center">
                    {productFormError}
                  </p>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 px-1">
                    {t.common.productName} *
                  </label>
                  <input
                    required
                    className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 font-bold outline-none"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. Premium Wireless Speaker"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 px-1">
                    {t.common.category || 'Category'} *
                  </label>
                  <select
                    required
                    className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 font-bold outline-none appearance-none cursor-pointer"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="" disabled>
                      {t.common.category}...
                    </option>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {(CATEGORY_EMOJI[cat] || '') + ' ' + (t.categories[cat as keyof typeof t.categories] || cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 px-1">
                    {t.common.description} *
                  </label>
                  <textarea
                    required
                    className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 font-medium h-32 outline-none resize-none"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    required
                    type="number"
                    className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 font-black outline-none"
                    value={productForm.price_ils}
                    onChange={(e) => setProductForm({ ...productForm, price_ils: e.target.value })}
                    placeholder="Price"
                  />
                  <input
                    required
                    type="number"
                    className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 font-black outline-none"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="Stock"
                  />
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 px-1">
                    {lang === 'en' ? 'Product Media' : 'صور المنتج'} *
                  </label>
                  <div
                    onClick={() => !isProductUploading && productImgInputRef.current?.click()}
                    className={`aspect-square rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-all ${isProductUploading ? 'opacity-50' : 'hover:border-palma-primary'}`}
                  >
                    {productForm.image_url ? (
                      <img
                        src={secureImageSrc(productForm.image_url)}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={setImageToPlaceholder}
                      />
                    ) : (
                      <div className="text-center p-8">
                        <span className="text-4xl block mb-2">{isProductUploading ? '⌛' : '📸'}</span>
                        <p className="text-xs font-black uppercase text-slate-300 tracking-widest">
                          {isProductUploading ? 'Cloud Sync...' : 'Product Image'}
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={productImgInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleProductImgChange}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isProductUploading}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-palma-primary transition-all active:scale-95 disabled:opacity-50"
                >
                  Launch Product Live →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Verification Section – لجميع الأدوار بما فيها الأدمن */}
      {!user.emailVerified && (
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-2xl">⚠️</div>
            <div>
              <h3 className="text-lg font-black text-amber-900">
                {lang === 'ar' ? 'تأكيد البريد الإلكتروني' : 'Confirm Your Email'}
              </h3>
              <p className="text-sm font-medium text-amber-700/80">
                {lang === 'ar'
                  ? 'يرجى تأكيد بريدك الإلكتروني لتفعيل حسابك بالكامل.'
                  : 'Please confirm your email address to fully activate your account.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleConfirmEmail}
            disabled={isVerifyingEmail}
            className="bg-amber-500 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isVerifyingEmail
              ? lang === 'ar'
                ? 'جاري التأكيد...'
                : 'Confirming...'
              : lang === 'ar'
                ? 'تأكيد الآن'
                : 'Confirm Now'}
          </button>
        </div>
      )}

      {user.emailVerified && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-xl">✅</div>
          <div>
            <h3 className="text-sm font-black text-emerald-900">
              {lang === 'ar' ? 'البريد الإلكتروني مؤكد' : 'Email Confirmed'}
            </h3>
            <p className="text-xs font-medium text-emerald-700/80">{user.email}</p>
          </div>
        </div>
      )}

      {/* Breadcrumb — طراز Plant Shop / Grocery */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
        <button type="button" onClick={() => onViewProduct?.('')} className="hover:text-palma-primary transition">
          {lang === 'ar' ? 'الرئيسية' : 'Home'}
        </button>
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" aria-hidden />
        <span className="font-bold text-slate-800">
          {lang === 'ar' ? 'حسابي' : lang === 'he' ? 'החשבון שלי' : 'My Account'}
        </span>
      </nav>

      {/* My Account: sidebar + main (طراز Grocery / Plant Shop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left sidebar — خيارات الحساب */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <h2 className="px-6 py-4 border-b border-slate-100 font-heading text-lg font-black text-slate-800">
              {lang === 'ar' ? 'حسابي' : 'My Account'}
            </h2>
            <nav className="p-2 space-y-0.5">
              <div className="bg-amber-100/80 text-amber-900 rounded-xl px-4 py-3 flex items-center gap-3">
                <UserIcon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold">
                  {lang === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
                </span>
              </div>
              {onNavigateToOrders && (
                <button
                  type="button"
                  onClick={onNavigateToOrders}
                  className="w-full text-right rtl:text-left px-4 py-3 rounded-xl flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  <Package className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-bold">{t.nav?.orders ?? (lang === 'ar' ? 'طلباتي' : 'My Orders')}</span>
                </button>
              )}
              <div className="px-4 py-3 rounded-xl flex items-center gap-3 text-slate-400 cursor-default">
                <MapPin className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{lang === 'ar' ? 'إدارة العناوين' : 'Manage Address'}</span>
              </div>
              <div className="px-4 py-3 rounded-xl flex items-center gap-3 text-slate-400 cursor-default">
                <CreditCard className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</span>
              </div>
              <div className="px-4 py-3 rounded-xl flex items-center gap-3 text-slate-400 cursor-default">
                <KeyRound className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{lang === 'ar' ? 'إدارة كلمة المرور' : 'Password Manager'}</span>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main — المعلومات الشخصية + صورة البروفايل */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <h3 className="text-xl font-black text-slate-800 mb-6">
              {lang === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-8">
              <div className="relative group shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 shadow-inner">
                  <img
                    src={userImg}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    alt={user.name}
                    onError={setImageToPlaceholder}
                  />
                </div>
                {isEditing && (
                  <button
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 transition border-2 border-white"
                  >
                    {isUploading ? (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="text-lg leading-none">✎</span>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                    />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">
                      {lang === 'ar' ? 'الاسم الأول *' : 'First Name *'}
                    </label>
                    <input
                      name="name"
                      disabled={!isEditing}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 disabled:bg-white disabled:border-transparent focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={lang === 'ar' ? 'الاسم' : 'Name'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">
                      {lang === 'ar' ? 'البريد الإلكتروني *' : 'Email *'}
                    </label>
                    <input
                      type="email"
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 font-medium"
                      value={user.email}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">{t.auth.phone}</label>
                  <input
                    name="phone"
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 disabled:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+0123-456-789"
                  />
                </div>
                <div className="flex flex-wrap gap-3 pt-4">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-3 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 transition"
                    >
                      {lang === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition"
                      >
                        {lang === 'ar' ? 'حفظ التغييرات' : 'Update Changes'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition"
                      >
                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </>
                  )}
                  {user.role === Role.MERCHANT && (
                    <button
                      onClick={() => setIsAddingProduct(true)}
                      className="px-6 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition"
                    >
                      ➕ {t.common.addProduct}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Feature highlights — طراز Grocery / Plant Shop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">📦</div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {lang === 'ar' ? 'الشحن' : 'Shipping'}
                </p>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'يتوفر شحن لكل المناطق في فلسطين' : 'Shipping available to all areas in Palestine'}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">💳</div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {lang === 'ar' ? 'دفع مرن' : 'Flexible Payment'}
                </p>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'خيارات دفع آمنة متعددة' : 'Multiple secure payment options'}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">🎧</div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {lang === 'ar' ? 'دعم 24/7' : '24x7 Support'}
                </p>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'ندعمك أونلاين كل الأيام' : 'We support online all days'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Profile Details Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t.common.editProfile}</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-400 px-1">{t.auth.phone}</label>
                <input
                  name="phone"
                  disabled={!isEditing}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-palma-primary outline-none"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-400 px-1">
                  {lang === 'en' ? 'Bio' : 'النبذة التعريفية'}
                </label>
                <textarea
                  name="bio"
                  disabled={!isEditing}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium h-24 focus:ring-2 focus:ring-palma-primary outline-none resize-none"
                  value={formData.bio}
                  onChange={handleInputChange}
                />
              </div>

              {user.role === Role.MERCHANT && (
                <>
                  <div className="pt-4 border-t border-slate-50 space-y-4">
                    <p className="text-xs font-black uppercase text-palma-primary tracking-widest">
                      Business Information
                    </p>
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400 px-1">
                        {t.auth.businessName}
                      </label>
                      <input
                        name="business_name"
                        disabled={!isEditing}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-palma-primary outline-none"
                        value={formData.business_name}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase text-slate-400 px-1">
                        {lang === 'ar' ? 'مقر المتجر الرئيسي' : 'Store Origin HQ'} *
                      </label>
                      <select
                        disabled={!isEditing}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none appearance-none"
                        onChange={handleCityChange}
                        value={selectedCityId || ''}
                      >
                        <option value="">{lang === 'ar' ? 'اختر المدينة...' : 'Select City...'}</option>
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {lang === 'ar' ? c.nameAr : c.nameEn}
                          </option>
                        ))}
                      </select>
                      <select
                        disabled={!isEditing || !selectedCityId}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none disabled:opacity-50 appearance-none"
                        onChange={handleVillageChange}
                        value={formData.village_id || ''}
                      >
                        <option value="">{lang === 'ar' ? 'اختر المنطقة...' : 'Select Area...'}</option>
                        {availableVillages.map((v) => (
                          <option key={v.id} value={v.id}>
                            {lang === 'ar' ? v.nameAr : v.nameEn}
                          </option>
                        ))}
                      </select>
                      <input
                        name="business_address"
                        placeholder="Store full street address"
                        disabled={!isEditing}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-palma-primary outline-none"
                        value={formData.business_address}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <main className="lg:col-span-2 space-y-10">
          {Object.keys(groupedProducts).length === 0 ? (
            <div className="bg-white p-16 rounded-3xl border text-center">No products found</div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedProducts).map(([cat, prods]) => (
                <div key={cat} className="space-y-6">
                  <div className="flex items-center gap-4 px-2">
                    <h2 className="text-xl font-black text-slate-900 uppercase">{cat}</h2>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {(prods as Product[]).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onViewProduct(p.id)}
                        className="bg-white rounded-[2rem] p-4 border border-slate-100 hover:shadow-xl transition-all group cursor-pointer flex flex-col h-full"
                      >
                        <div className="aspect-square rounded-[1.5rem] bg-slate-50 overflow-hidden mb-4 relative">
                          <img
                            src={secureImageSrc(p.images?.[0] || p.imageUrl || p.image_url)}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            alt={p.name}
                            onError={setImageToPlaceholder}
                          />
                          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-black shadow-sm">
                            ₪{p.price || p.price_ils}
                          </div>
                        </div>
                        <div className="px-2 pb-2">
                          <h4 className="font-bold text-slate-900 text-sm truncate mb-1">{p.name}</h4>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {t.categories[p.category as keyof typeof t.categories] || p.category}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProfileView;
