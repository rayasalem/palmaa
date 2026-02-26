
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User, Role } from '../types';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { translations, getAuthErrorMessage } from '../translations';
import Logo from './Logo';
import { getInternalCities, getInternalVillages } from '../services/flashlineService';
import { useToast } from './ToastProvider';
import { Mail, CheckCircle, RefreshCcw, FileText } from 'lucide-react';
import { MERCHANT_TERMS_TITLE_AR, MERCHANT_TERMS_FULL_TEXT_AR, MERCHANT_TERMS_FULL_TEXT_EN } from '../content/merchantTerms';

interface RegisterMerchantProps {
  onRegister: (user: User) => void;
  onBackToLogin: () => void;
  onOpenTerms?: () => void;
}

const RegisterMerchant: React.FC<RegisterMerchantProps> = ({
  onRegister,
  onBackToLogin,
  onOpenTerms,
}) => {
  const lang: 'ar' | 'en' | 'he' = (typeof document !== 'undefined' && (document.documentElement.lang === 'ar' || document.documentElement.lang === 'en' || document.documentElement.lang === 'he')) ? document.documentElement.lang : 'ar';
  const { showToast } = useToast();
  const [step, setStep] = useState<'FORM' | 'TERMS'>('FORM');
  const t = translations[lang];

  // UI State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  // UI-only subscription plan selection (does not change backend logic yet)
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'paid'>('free');
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    password: '',
    phone: '',
    logo_url: '',
  });

  // Location State
  const cities = useMemo(() => getInternalCities(), []);
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(undefined);
  const [selectedVillageId, setSelectedVillageId] = useState<number | undefined>(undefined);
  const [selectedRegionId, setSelectedRegionId] = useState<number | undefined>(undefined);

  const availableVillages = useMemo(
    () => (selectedCityId ? getInternalVillages(selectedCityId) : []),
    [selectedCityId],
  );

  const [error, setError] = useState('');

  // لم نعد نستخدم خطوة التحقق بالبريد حالياً

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = parseInt(e.target.value);
    const city = cities.find(c => c.id === cityId);
    if (city) {
      setSelectedCityId(cityId);
      setSelectedRegionId(city.regionId);
      setSelectedVillageId(undefined);
    } else {
      setSelectedCityId(undefined);
      setSelectedRegionId(undefined);
      setSelectedVillageId(undefined);
    }
  };

  const handleVillageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVillageId(parseInt(e.target.value));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const path = `merchant_logos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const url = await storageService.uploadFile(file, 'profiles', path);

      setFormData(prev => ({ ...prev, logo_url: url }));
      showToast(
        lang === 'ar' ? 'تم رفع الشعار بنجاح' : lang === 'he' ? 'הלוגו הועלה בהצלחה' : 'Logo uploaded successfully',
        'success',
      );
    } catch (err) {
      const msg = lang === 'ar' ? 'فشل رفع الصورة' : lang === 'he' ? 'העלאת התמונה נכשלה' : 'Failed to upload image';
      setError(msg);
      showToast(msg, 'error');
    }

    setIsUploading(false);
  };

  const validateForm = () => {
    if (
      !formData.business_name ||
      !formData.owner_name ||
      !formData.email ||
      !formData.phone ||
      !selectedCityId ||
      !selectedVillageId ||
      !formData.password
    ) {
      const msg =
        lang === 'en'
          ? 'All fields marked * are required including location'
          : 'جميع الحقول المطلوبة * يجب ملؤها بما في ذلك الموقع';
      setError(msg);
      showToast(msg, 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setStep('TERMS');
  };

  const submitRegistration = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError('');

    const cityObj = cities.find(c => c.id === selectedCityId);
    const cityName = cityObj ? (lang === 'en' ? cityObj.nameEn : cityObj.nameAr) : '';

    const newUser: User = {
      id: '', // Service generates valid UUID
      name: formData.business_name,
      email: formData.email,
      phone: formData.phone,
      city: cityName,
      logoUrl: formData.logo_url,
      role: Role.MERCHANT,
      status: 'PENDING', // Initially pending
      isApproved: false,
      approved_at: undefined,
      createdAt: Date.now(),
      companyName: formData.business_name,
    };

    const result = await userService.register(newUser, formData.password, {
      city_id: selectedCityId,
      village_id: selectedVillageId,
      region_id: selectedRegionId,
      owner_name: formData.owner_name,
      business_name: formData.business_name,
      termsAccepted: true,
    });

    if (result.success && result.data) {
      const successMessage =
        lang === 'ar'
          ? 'تم إنشاء حساب التاجر بنجاح. تم إرسال رمز تحقق إلى بريدك الإلكتروني – يرجى تأكيد بريدك قبل تسجيل الدخول.'
          : lang === 'he'
            ? 'חשבון הסוחר נוצר בהצלחה. נשלח קוד אימות לאימייל שלך – אנא אמת לפני ההתחברות.'
            : 'Merchant account created successfully. A verification code was sent to your email – please verify before logging in.';
      showToast(successMessage, 'success');
      onRegister(result.data.user);
    } else {
      const msg = getAuthErrorMessage(result.error || 'Registration failed', lang);
      setError(msg);
      showToast(msg, 'error');
    }
    setLoading(false);
  };

  // لم نعد نعرض خطوة VERIFY؛ نرجع دائماً نموذج التسجيل فقط

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-20"
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      <div className="max-w-2xl w-full bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo size="medium" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">{t.auth.joinMerchant}</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase mt-2">
            {t.auth.merchantSubtitle}
          </p>
        </div>

        {step === 'FORM' ? (
          <form
            onSubmit={handleSubmit}
            className={`space-y-6 ${lang === 'en' ? 'text-left' : 'text-right'}`}
          >
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl text-center uppercase">
                {error}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">
                  {t.auth.businessName} *
                </label>
                <input
                  required
                  name="business_name"
                  className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none"
                  defaultValue={formData.business_name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">
                  {t.auth.ownerName} *
                </label>
                <input
                  required
                  name="owner_name"
                  className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none"
                  defaultValue={formData.owner_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Subscription plan selection – UI only, backend always uses existing free-trial logic */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500">
                {lang === 'ar'
                  ? 'خطة الاشتراك (واجهة فقط – الشهر الأول مجاني)'
                  : 'Subscription plan (UI only – first month free)'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('free')}
                  className={`w-full text-left rounded-2xl border px-4 py-3 text-xs font-medium transition-all ${
                    selectedPlan === 'free'
                      ? 'border-palma-primary bg-palma-primaryLight text-palma-navy shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-palma-primary/70'
                  }`}
                >
                  <span className="block font-black text-[11px] uppercase tracking-widest mb-1">
                    {lang === 'ar' ? 'الخطة المجانية' : 'Free plan'}
                  </span>
                  <span className="block text-[11px]">
                    {lang === 'ar'
                      ? 'شهر أول مجاني للتجربة، ثم رسوم تُحدد لاحقاً.'
                      : 'First month free for trial, then pricing announced later.'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlan('paid')}
                  className={`w-full text-left rounded-2xl border px-4 py-3 text-xs font-medium transition-all ${
                    selectedPlan === 'paid'
                      ? 'border-palma-primary bg-white text-palma-navy shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                  disabled
                >
                  <span className="block font-black text-[11px] uppercase tracking-widest mb-1">
                    {lang === 'ar' ? 'الخطة المدفوعة (قريباً)' : 'Paid plan (coming soon)'}
                  </span>
                  <span className="block text-[11px]">
                    {lang === 'ar'
                      ? 'مزايا إضافية وظهور أعلى في نتائج البحث – قريباً.'
                      : 'Extra benefits and higher visibility in search – coming soon.'}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">
                {t.auth.storeLogo}
              </label>
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`relative flex items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] p-4 bg-slate-50 transition-all cursor-pointer min-h-[140px] ${
                  isUploading ? 'opacity-50' : 'hover:bg-slate-100 hover:border-palma-primary'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
                {formData.logo_url ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={formData.logo_url}
                      className="w-24 h-24 rounded-2xl object-cover shadow-md mb-2"
                      alt="Logo preview"
                    />
                    <span className="text-[9px] font-black uppercase text-slate-400">
                      {t.auth.clickToChange}
                    </span>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-3xl mb-2 block">{isUploading ? '⌛' : '🏢'}</span>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      {isUploading ? t.common.uploading : t.auth.uploadLogo}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">
                {t.auth.email} *
              </label>
              <input
                required
                type="email"
                name="email"
                className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none"
                defaultValue={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">
                  {t.auth.phone} *
                </label>
                <input
                  required
                  name="phone"
                  className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none"
                  placeholder="05x-xxxxxxx"
                  defaultValue={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">
                  {t.auth.city} *
                </label>
                <select
                  required
                  className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none appearance-none"
                  onChange={handleCityChange}
                  value={selectedCityId || ''}
                >
                  <option value="">
                    {lang === 'ar' ? 'اختر المدينة...' : lang === 'he' ? 'בחר עיר...' : 'Select City...'}
                  </option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>
                      {lang === 'en' ? c.nameEn : c.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">
                {lang === 'en' ? 'Area / Village' : 'المنطقة / القرية'} *
              </label>
              <select
                required
                disabled={!selectedCityId}
                className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none disabled:opacity-50 appearance-none"
                onChange={handleVillageChange}
                value={selectedVillageId || ''}
              >
                <option value="">
                  {lang === 'ar' ? 'اختر المنطقة...' : lang === 'he' ? 'בחר אזור...' : 'Select Area...'}
                </option>
                {availableVillages.map(v => (
                  <option key={v.id} value={v.id}>
                    {lang === 'en' ? v.nameEn : v.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">
                {t.auth.password} *
              </label>
              <input
                required
                type="password"
                name="password"
                className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none"
                defaultValue={formData.password}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || loading}
              className="w-full py-5 bg-palma-primary text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-soft mt-4 disabled:opacity-50 hover:brightness-110 transition-all active:scale-95"
            >
              {loading ? t.common.loading : t.nav.register}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-palma-primary"
            >
              {t.common.back}
            </button>
          </form>
        ) : (
          <div className={`${lang === 'en' ? 'text-left' : 'text-right'} space-y-4 flex flex-col h-full`}>
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl text-center uppercase shrink-0">
                {error}
              </div>
            )}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-[11px] text-amber-800 shrink-0">
              <Mail className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-black mb-1">
                  {lang === 'ar'
                    ? 'تأكيد البريد الإلكتروني مطلوب'
                    : lang === 'he'
                      ? 'נדרש אימות כתובת אימייל'
                      : 'Email verification required'}
                </p>
                <p className="leading-relaxed">
                  {lang === 'ar'
                    ? 'بعد إكمال التسجيل سيصلك رمز تحقق مكوّن من 6 أرقام إلى بريدك الإلكتروني. لن تتمكن من الدخول للوحة التحكم حتى تؤكد بريدك.'
                    : lang === 'he'
                      ? 'לאחר סיום ההרשמה יישלח אליך קוד אימות בן 6 ספרות לאימייל. לא תוכל להיכנס ללוח הבקרה עד שתאמת את האימייל.'
                      : 'After completing registration, a 6-digit verification code will be sent to your email. You will not be able to access the dashboard until you verify your email.'}
                </p>
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 shrink-0">
              {lang === 'en' ? 'Terms and Conditions for Marketplace Merchants' : MERCHANT_TERMS_TITLE_AR}
            </h2>
            <div className="flex-1 min-h-0 max-h-[50vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {lang === 'en' ? MERCHANT_TERMS_FULL_TEXT_EN : MERCHANT_TERMS_FULL_TEXT_AR}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setStep('FORM')}
                className="flex-1 py-4 rounded-2xl border border-slate-200 text-[11px] font-black uppercase text-slate-500 hover:bg-slate-50"
              >
                {lang === 'ar' ? 'العودة لتعديل البيانات' : lang === 'he' ? 'חזרה לעריכת פרטים' : 'Back to edit details'}
              </button>
              <button
                type="button"
                disabled={isUploading || loading}
                onClick={submitRegistration}
                className="flex-1 py-4 bg-palma-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-soft hover:brightness-110 disabled:opacity-50 active:scale-95"
              >
                {loading
                  ? t.common.loading
                  : lang === 'en'
                    ? 'I agree to the terms and conditions and proceed to register as a merchant'
                    : 'أوافق على الشروط والأحكام وأتابع التسجيل كتاجر'}
              </button>
            </div>
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-palma-primary shrink-0"
            >
              {t.common.back}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterMerchant;
