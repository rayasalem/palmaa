
import React, { useState, useMemo, useEffect } from 'react';
import { User, Role } from '../types';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { t } from '../translations';
import Logo from './Logo';
import { getInternalCities, getInternalVillages } from '../services/flashlineService';
import { useToast } from './ToastProvider';
import { Mail, RefreshCcw } from 'lucide-react';

interface RegisterBrokerProps {
  onRegister: (user: User) => void;
  onBackToLogin: () => void;
}

const RegisterBroker: React.FC<RegisterBrokerProps> = ({ onRegister, onBackToLogin }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const { showToast } = useToast();

  useEffect(() => {
    setLang(document.documentElement.lang === 'en' ? 'en' : 'ar');
  }, []);

  // Step state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    company_name: '',
  });

  // Location State
  const cities = useMemo(() => getInternalCities(), []);
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(undefined);
  const [selectedVillageId, setSelectedVillageId] = useState<number | undefined>(undefined);
  const [selectedRegionId, setSelectedRegionId] = useState<number | undefined>(undefined);
  const [cityName, setCityName] = useState('');
  
  const availableVillages = useMemo(() => selectedCityId ? getInternalVillages(selectedCityId) : [], [selectedCityId]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email verification step: FORM → VERIFY
  const [step, setStep] = useState<'FORM' | 'VERIFY'>('FORM');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailNotSent, setEmailNotSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = parseInt(e.target.value);
    const city = cities.find(c => c.id === cityId);
    if (city) {
      setSelectedCityId(cityId);
      setSelectedRegionId(city.regionId);
      setCityName(lang === 'en' ? city.nameEn : city.nameAr);
      setSelectedVillageId(undefined); // Reset village
    } else {
      setSelectedCityId(undefined);
      setSelectedRegionId(undefined);
      setSelectedVillageId(undefined);
    }
  };

  const handleVillageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVillageId(parseInt(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Strict validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !selectedCityId || !selectedVillageId) {
      const msg = lang === 'en' ? 'All mandatory fields (*) are required' : 'جميع الحقول الأساسية (*) مطلوبة';
      setError(msg);
      showToast(msg, 'warning');
      setLoading(false);
      return;
    }

    const newUser: User = {
      id: '', // Service generated
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      city: cityName, 
      companyName: formData.company_name,
      role: Role.BROKER,
      status: 'PENDING',
      isApproved: false,
      createdAt: Date.now(),
    };

    const result = await userService.register(newUser, formData.password, {
      city_id: selectedCityId,
      village_id: selectedVillageId,
      region_id: selectedRegionId
    });

    if (result.success) {
      if (result.requiresVerification) {
        setStep('VERIFY');
        const codeFromServer = (result as any).verificationCode;
        if (codeFromServer) {
          setVerificationCode(String(codeFromServer));
          setEmailNotSent(true);
        } else {
          setEmailNotSent(false);
        }
        showToast(
          codeFromServer
            ? (lang === 'en' ? 'Account created. Email is not configured; use the code below to verify.' : 'تم إنشاء الحساب. البريد غير مُعد؛ استخدم الرمز أدناه للتحقق.')
            : (lang === 'en' ? 'Registration successful. Check your email for the verification code.' : 'تم التسجيل بنجاح. تحقق من بريدك للحصول على رمز التأكيد.'),
          'info'
        );
      } else if (result.data) {
        showToast(t.common.success, 'success');
        onRegister(result.data.user);
      }
    } else {
      const msg = result.error || (lang === 'en' ? 'Registration failed' : 'فشل التسجيل');
      setError(msg);
      showToast(msg, 'error');
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await userService.verifyEmail(formData.email, verificationCode);
    if (result.success && result.data) {
      showToast(lang === 'en' ? 'Account verified!' : 'تم تأكيد الحساب!', 'success');
      const loginResult = await authService.login(formData.email, formData.password);
      if (loginResult.success && loginResult.data) {
        onRegister(loginResult.data.user);
      } else {
        onRegister(result.data.user);
      }
    } else {
      setError(result.error || (lang === 'en' ? 'Verification failed' : 'فشل التحقق'));
      showToast(result.error || 'Failed', 'error');
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    const result = await userService.resendVerificationCode(formData.email);
    if (result.success) {
      showToast(lang === 'en' ? 'Code sent!' : 'تم إرسال الرمز!', 'success');
    } else {
      showToast(result.error || 'Error', 'error');
    }
    setLoading(false);
  };

  if (step === 'VERIFY') {
    return (
      <div className="min-h-screen py-12 px-4 bg-slate-50 flex items-center justify-center" dir={lang === 'en' ? 'ltr' : 'rtl'}>
        <div className="max-w-lg w-full bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-100">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6"><Logo size="medium" /></div>
            <h1 className="text-xl font-black text-slate-900">{lang === 'en' ? 'Verify your email' : 'تأكيد البريد الإلكتروني'}</h1>
            <p className="text-slate-500 text-sm mt-2">{lang === 'en' ? 'Enter the 6-digit code sent to' : 'أدخل الرمز المكون من 6 أرقام المرسل إلى'}: <strong>{formData.email}</strong></p>
            {emailNotSent && (
              <p className="mt-3 px-4 py-2 bg-amber-50 text-amber-800 text-sm rounded-xl border border-amber-200">
                {lang === 'en' ? 'Email sending is not configured. Use the code shown below to verify.' : 'إرسال البريد غير مُعد. استخدم الرمز المعروض أدناه للتحقق.'}
              </p>
            )}
          </div>
          <form onSubmit={handleVerify} className="space-y-6">
            {error && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl text-center">{error}</div>}
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-center text-xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-palma-primary outline-none"
            />
            <button type="submit" disabled={loading || verificationCode.length !== 6} className="w-full py-4 bg-palma-primary text-white rounded-xl font-bold text-sm uppercase disabled:opacity-50">
              {loading ? (lang === 'en' ? 'Loading...' : 'جاري...') : (lang === 'en' ? 'Verify' : 'تأكيد')}
            </button>
            <button type="button" onClick={handleResendCode} disabled={loading} className="w-full py-3 text-palma-primary font-bold text-sm hover:underline disabled:opacity-50">
              {lang === 'en' ? 'Resend code' : 'إعادة إرسال الرمز'}
            </button>
            <button type="button" onClick={() => setStep('FORM')} className="w-full py-2 text-slate-400 text-xs hover:text-slate-600">
              {lang === 'en' ? '← Back to form' : '← الرجوع للنموذج'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-slate-50 flex items-center justify-center" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
        
            <div className="bg-palma-primary p-10 text-center text-white">
              <div className="flex justify-center mb-6">
                <Logo size="medium" theme="dark" showText={false} />
              </div>
              <h1 className="text-2xl font-black tracking-tight">{t.auth.joinBroker}</h1>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mt-2">{t.auth.brokerVerification}</p>
            </div>

            <form onSubmit={handleSubmit} className={`p-10 space-y-5 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
              {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl text-center uppercase">{error}</div>}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">{t.auth.name} *</label>
                <input required name="name" className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none" value={formData.name} onChange={handleChange} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">{t.auth.phone} *</label>
                <input required name="phone" className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none" value={formData.phone} onChange={handleChange} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">{t.auth.city} *</label>
                  <select 
                    required 
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none appearance-none"
                    onChange={handleCityChange}
                    value={selectedCityId || ''}
                  >
                    <option value="">{lang === 'en' ? 'Select...' : 'اختر...'}</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{lang === 'en' ? c.nameEn : c.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">{lang === 'en' ? 'Area' : 'المنطقة'} *</label>
                  <select 
                    required 
                    disabled={!selectedCityId}
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none disabled:opacity-50 appearance-none"
                    onChange={handleVillageChange}
                    value={selectedVillageId || ''}
                  >
                    <option value="">{lang === 'en' ? 'Select...' : 'اختر...'}</option>
                    {availableVillages.map(v => (
                      <option key={v.id} value={v.id}>{lang === 'en' ? v.nameEn : v.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">{t.auth.companyName}</label>
                <input name="company_name" className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none" value={formData.company_name} onChange={handleChange} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">{t.auth.email} *</label>
                <input required type="email" name="email" className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none" value={formData.email} onChange={handleChange} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">{t.auth.password} *</label>
                <input required type="password" name="password" className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-palma-primary outline-none" value={formData.password} onChange={handleChange} />
              </div>

              <div className="pt-4 flex flex-col items-center space-y-4">
                <button type="submit" disabled={loading} className="w-full py-5 bg-palma-primary text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-palma-primary/20 hover:brightness-110 transition-all active:scale-95 disabled:opacity-50">
                  {loading ? t.common.loading : t.nav.register}
                </button>
                <button type="button" onClick={onBackToLogin} className="text-[10px] font-black uppercase text-slate-400 hover:text-palma-primary">
                  {t.common.back}
                </button>
              </div>
            </form>
      </div>
    </div>
  );
};

export default RegisterBroker;
