
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
  const [step, setStep] = useState<'FORM' | 'VERIFY'>('FORM');
  const t = translations[lang];

  // UI State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  // UI-only subscription plan selection (لا يغيّر منطق الاشتراك المجاني للتاجر في الباكند)
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'paid'>('free');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailNotSent, setEmailNotSent] = useState(false);
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await userService.verifyEmail(formData.email, verificationCode);
      if (result.success && result.data) {
        showToast(
          lang === 'ar'
            ? 'تم تأكيد الحساب بنجاح. جاري تسجيل الدخول...'
            : lang === 'he'
            ? 'החשבון אומת בהצלחה. מתחבר...'
            : 'Account verified successfully. Logging you in...',
          'success',
        );
        const loginResult = await authService.login(formData.email, formData.password);
        if (loginResult.success && loginResult.data) {
          onRegister(loginResult.data.user);
        } else {
          onRegister(result.data.user);
        }
      } else {
        const errMsg = getAuthErrorMessage(result.error || 'Verification failed', lang);
        setError(errMsg);
        showToast(errMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const cityId = raw === '' ? NaN : parseInt(raw, 10);
    const city = cities.find(c => c.id === cityId);
    if (city && !Number.isNaN(cityId)) {
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
    submitRegistration();
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
          ? 'تم إنشاء حساب التاجر بنجاح. تم إرسال رمز تحقق إلى بريدك الإلكتروني – يرجى إدخال الكود لتفعيل الحساب.'
          : lang === 'he'
            ? 'חשבון הסוחר נוצר בהצלחה. נשלח קוד אימות לאימייל שלך – הזן את הקוד כדי להפעיל את החשבון.'
            : 'Merchant account created successfully. A verification code was sent to your email – please enter the code to activate your account.';
      showToast(successMessage, 'success');
      setStep('VERIFY');
      setVerificationCode('');
      setEmailNotSent((result as any).emailSent === false);
      const codeFromApi = (result as any).verificationCode as string | undefined;
      if (codeFromApi && (result as any).emailSent === false) {
        setVerificationCode(codeFromApi);
      }
    } else {
      const msg = getAuthErrorMessage(result.error || 'Registration failed', lang);
      setError(msg);
      showToast(msg, 'error');
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-20"
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      <div className="max-w-2xl w-full bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="heading-block mb-10">
          <div className="flex justify-center mb-6">
            <Logo size="medium" />
          </div>
          <h1 className="heading-block-title font-heading text-palma-navy">{t.auth.joinMerchant}</h1>
          <p className="heading-block-sub">
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

            {/* Subscription plan selection – UI only, backend keeps merchant subscription free */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500">
                {lang === 'ar'
                  ? 'خطة الاشتراك (واجهة فقط – اشتراك التاجر مجاني دائماً)'
                  : 'Subscription plan (UI only – merchant stays on a free plan)'}
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
                      ? 'اشتراك مجاني للتاجر داخل المنصة، مع إمكانية إضافة باقات مدفوعة لاحقاً.'
                      : 'Free subscription for merchants inside the platform, with optional paid tiers in the future.'}
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
                  value={selectedCityId !== undefined && selectedCityId !== null ? String(selectedCityId) : ''}
                >
                  <option value="">
                    {lang === 'ar' ? 'اختر المدينة...' : lang === 'he' ? 'בחר עיר...' : 'Select City...'}
                  </option>
                  {cities.map(c => (
                    <option key={c.id} value={String(c.id)}>
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
                value={selectedVillageId !== undefined && selectedVillageId !== null ? String(selectedVillageId) : ''}
              >
                <option value="">
                  {lang === 'ar' ? 'اختر المنطقة...' : lang === 'he' ? 'בחר אזור...' : 'Select Area...'}
                </option>
                {availableVillages.map(v => (
                  <option key={v.id} value={String(v.id)}>
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
          <div className={`space-y-6 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-palma-primaryLight flex items-center justify-center text-palma-primary">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-1">
                {lang === 'ar' ? 'تأكيد البريد الإلكتروني' : lang === 'he' ? 'אימות כתובת אימייל' : 'Verify your email'}
              </h2>
              <p className="text-sm text-slate-600">
                {lang === 'ar'
                  ? `أدخل رمز التحقق المكوّن من 6 أرقام الذي أُرسل إلى ${formData.email}`
                  : lang === 'he'
                  ? `הזן את קוד האימות בן 6 ספרות שנשלח אל ${formData.email}`
                  : `Enter the 6-digit verification code sent to ${formData.email}`}
              </p>
              {emailNotSent && (
                <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 inline-block">
                  {lang === 'ar'
                    ? 'إرسال البريد غير مهيأ في هذه البيئة. يمكنك استخدام الكود الظاهر هنا مباشرة.'
                    : lang === 'he'
                    ? 'שליחת האימייל אינה מוגדרת בסביבה זו. ניתן להשתמש בקוד שמופיע כאן ישירות.'
                    : 'Email sending is not configured in this environment. You can use the code shown here directly.'}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-[11px] font-bold rounded-2xl text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4 max-w-xs mx-auto">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full p-4 text-center text-2xl font-black tracking-[0.5em] rounded-2xl border-2 border-slate-200 focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 outline-none"
                placeholder="000000"
              />
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full py-4 bg-palma-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl disabled:opacity-50 hover:bg-emerald-800 transition-all flex items-center justify-center gap-2"
              >
                {loading ? t.common.loading : lang === 'ar' ? 'تأكيد وبدء الاستخدام' : lang === 'he' ? 'אימות והתחלה' : 'Verify & Start'}
                {!loading && <CheckCircle className="w-4 h-4" />}
              </button>
            </form>

            <div className="flex flex-col sm:flex-row gap-3 max-w-xs mx-auto">
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  try {
                    const res = await userService.resendVerificationCode(formData.email);
                    if (res.success) {
                      showToast(
                        lang === 'ar'
                          ? 'تم إرسال رمز جديد إلى بريدك.'
                          : lang === 'he'
                          ? 'נשלח קוד חדש לאימייל שלך.'
                          : 'A new code was sent to your email.',
                        'success',
                      );
                    } else {
                      const errMsg = getAuthErrorMessage(res.error || 'Error', lang);
                      setError(errMsg);
                      showToast(errMsg, 'error');
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                className="flex-1 py-3 text-[11px] font-bold rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {lang === 'ar' ? 'إعادة إرسال الرمز' : lang === 'he' ? 'שליחת קוד שוב' : 'Resend code'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep('FORM');
                  setVerificationCode('');
                  setError('');
                }}
                className="flex-1 py-3 text-[11px] font-bold rounded-2xl text-slate-400 hover:text-palma-primary"
              >
                {lang === 'ar' ? 'العودة لتعديل البيانات' : lang === 'he' ? 'חזרה לעריכת פרטים' : 'Back to edit details'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterMerchant;
