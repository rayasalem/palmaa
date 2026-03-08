/**
 * Auth.tsx – Login, role selection, and registration (merchant/broker/customer).
 * Uses marketStore.login for API call; state is local (view, email, password, error).
 * For a hook-based auth flow, use hooks/useAuth and call login/getMe from there.
 */

import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';
import { marketStore } from '../store';
import { translations, getAuthErrorMessage, type Language } from '../translations';
import { ShoppingCart, TrendingUp, Store, ArrowRight, Mail, Lock, CheckCircle, RefreshCcw } from 'lucide-react';
import RegisterBroker from './RegisterBroker';
import RegisterCustomer from './RegisterCustomer';
import RegisterMerchant from './RegisterMerchant';
import Logo from './Logo';
import { useToast } from './ToastProvider';
import { userService } from '../services/userService';
import { ROUTES } from '../routes';

/** Allowed initial views; REGISTER_STUDENT is legacy and treated as LOGIN */
export type AuthView = 'LOGIN' | 'ROLE_SELECT' | 'REGISTER_MERCHANT' | 'REGISTER_BROKER' | 'REGISTER_CUSTOMER';

export interface AuthProps {
  /** Called with the User object after successful login or registration */
  onLogin: (user: User) => void;
  /** Which screen to show first (default LOGIN) */
  initialView?: AuthView | string;
  /** Opens the merchant terms page (e.g. from footer or register merchant) */
  onOpenTerms?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, initialView = 'LOGIN', onOpenTerms }) => {
  const lang: Language = (typeof document !== 'undefined' && (document.documentElement.lang === 'ar' || document.documentElement.lang === 'en' || document.documentElement.lang === 'he')) ? document.documentElement.lang as Language : 'ar';
  const t = translations[lang];
  const [view, setView] = useState(initialView);
  
  // Specific state for Unverified Flow
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'password'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // Sync view from initialView; treat legacy REGISTER_STUDENT as LOGIN
  useEffect(() => {
    if (initialView === 'REGISTER_STUDENT') {
      setView('LOGIN');
    } else if (typeof initialView === 'string' && ['LOGIN', 'ROLE_SELECT', 'REGISTER_MERCHANT', 'REGISTER_BROKER', 'REGISTER_CUSTOMER'].includes(initialView)) {
      setView(initialView as AuthView);
    }
  }, [initialView]);

  // Resend Cooldown Timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simulate slight network delay for effect
    await new Promise(r => setTimeout(r, 600));

    const result = await marketStore.login(email.trim(), password.trim());

    if ((result as any).requiresEmailVerification) {
      // البريد غير موثق: نفعّل وضع التحقق عبر OTP ونمنع الدخول الكامل
      setVerificationMode(true);
      setUnverifiedEmail(email.trim());
      setVerificationCode('');
      setError('');
      showToast(
        lang === 'ar'
          ? 'يرجى تأكيد بريدك الإلكتروني قبل المتابعة.'
          : lang === 'he'
          ? 'אנא אמת את כתובת האימייל לפני המשך השימוש.'
          : 'Please verify your email before continuing.',
        'error'
      );
      if (typeof window !== 'undefined') {
        window.location.hash = `#/${ROUTES.VERIFY_EMAIL}`;
      }
    } else if (result.success && result.data) {
      showToast(t.common.success, 'success');
      onLogin(result.data.user);
    } else {
      const errMsg = getAuthErrorMessage(result.error || 'Invalid credentials', lang);
      setError(errMsg);
      showToast(errMsg, 'error');
    }
    setLoading(false);
  };

  const handleRoleSelection = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setError('');
  };

  const proceedToRegister = () => {
    if (!role) {
      setError(getAuthErrorMessage('Please select an account type', lang));
      return;
    }

    if (role === 'MERCHANT') {
      // التاجر يمر أولاً على صفحة الشروط والأحكام ثم الفورم ثم تأكيد الإيميل ثم الداشبورد
      onOpenTerms?.();
      return;
    }
    if (role === 'BROKER') {
      setView('REGISTER_BROKER');
    } else if (role === 'CUSTOMER') {
      setView('REGISTER_CUSTOMER');
    } else {
      setView('ROLE_SELECT');
    }
  };

  const roleOptions = [
    { id: 'CUSTOMER', label: t.roles.CUSTOMER, icon: <ShoppingCart className="w-5 h-5"/>, desc: t.auth.roleDescCustomer },
    { id: 'MERCHANT', label: t.roles.MERCHANT, icon: <Store className="w-5 h-5"/>, desc: t.auth.roleDescMerchant },
    { id: 'BROKER', label: t.roles.BROKER, icon: <TrendingUp className="w-5 h-5"/>, desc: t.auth.roleDescBroker },
  ];

  if (view === 'REGISTER_BROKER') return <RegisterBroker onRegister={onLogin} onBackToLogin={() => setView('LOGIN')} />;
  if (view === 'REGISTER_CUSTOMER') return <RegisterCustomer onRegister={onLogin} onBackToLogin={() => setView('LOGIN')} />;
  if (view === 'REGISTER_MERCHANT') return <RegisterMerchant onRegister={onLogin} onBackToLogin={() => setView('LOGIN')} onOpenTerms={onOpenTerms} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans font-heading" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <div className="w-full max-w-lg transition-all duration-500 ease-out animate-fade-in">
        <div className="text-center space-y-8 mb-10">
           <div className="flex justify-center transform scale-125"><Logo /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-palma-border overflow-hidden">
          <div className="grid grid-cols-2 p-1.5 bg-slate-50/80 border-b border-palma-border m-4 rounded-xl">
            <button 
              onClick={() => { setView('LOGIN'); setError(''); }}
              className={`py-3.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-200 ${view === 'LOGIN' ? 'bg-white text-palma-navy shadow-soft border border-palma-border' : 'text-slate-400 hover:text-palma-navy'}`}
            >
              {t.auth.login}
            </button>
            <button 
              onClick={() => { setView('ROLE_SELECT'); setError(''); }}
              className={`py-3.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-200 ${view !== 'LOGIN' ? 'bg-white text-palma-navy shadow-soft border border-palma-border' : 'text-slate-400 hover:text-palma-navy'}`}
            >
              {t.auth.register}
            </button>
          </div>

          <div className="p-8 sm:p-10 pt-4">
            <div className="heading-block mb-10">
               <h2 className="heading-block-title font-heading">
                 {view === 'LOGIN' ? t.auth.welcomeHeadline : t.auth.chooseRole}
               </h2>
               <p className="heading-block-sub">
                 {view === 'LOGIN' ? t.auth.digitalJourney : t.auth.roleSubtitle}
               </p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 animate-slide-up space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                  <span>{error}</span>
                </div>
                {!showForgotPassword && (
                  <p className="text-[10px] text-slate-500 text-center">
                    {t.auth.checkEmailAndPassword}
                  </p>
                )}
              </div>
            )}

            {/* FORGOT PASSWORD VIEW */}
            {view === 'LOGIN' && showForgotPassword && (
              <div className="space-y-6 animate-fade-in">
                {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                <h3 className="font-heading text-lg font-bold text-palma-navy">
                  {forgotStep === 'email' && t.auth.forgotPassword}
                  {forgotStep === 'otp' && t.auth.enterCodeSent}
                  {forgotStep === 'password' && t.auth.newPasswordStep}
                </h3>
                {forgotStep === 'email' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setError('');
                    setLoading(true);
                    const result = await marketStore.forgotPassword(forgotEmail);
                    setLoading(false);
                    if (result.success) {
                      const code = (result as any).data?.verificationCode as string | undefined;
                      if (code) {
                        // Email not configured / DNS issue: backend returned code directly
                        setForgotOtp(code);
                        showToast(
                          lang === 'ar'
                            ? 'تم إنشاء رمز التحقق وتم تعبئته هنا لأن البريد غير مهيأ.'
                            : 'A reset code was generated and pre-filled because email is not configured.',
                          'success'
                        );
                      } else {
                        showToast(
                          lang === 'ar'
                            ? 'تم إرسال رمز التحقق إلى بريدك'
                            : 'Check your email for the reset code',
                          'success'
                        );
                        setForgotOtp('');
                      }
                      setForgotStep('otp');
                      setForgotNewPassword('');
                      setForgotConfirmPassword('');
                    } else {
                      const err = typeof result.error === 'string' ? result.error : (result.error as any)?.message || 'Request failed';
                      setError(getAuthErrorMessage(err, lang));
                    }
                  }} className="space-y-4">
                    <label htmlFor="forgot-email" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      {t.auth.email}
                    </label>
                    <input
                      id="forgot-email"
                      name="forgotEmail"
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="email@example.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="input-base rounded-xl"
                    />
                    <div className="flex gap-3">
                      <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-sm">{loading ? t.common.loading : t.auth.send}</button>
                      <button type="button" onClick={() => setShowForgotPassword(false)} className="btn-secondary flex-1 py-3 text-sm">{t.common.back}</button>
                    </div>
                  </form>
                )}
                {forgotStep === 'otp' && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="forgot-otp" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        {t.auth.verificationCode6}
                      </label>
                      <input
                        id="forgot-otp"
                        name="forgotOtp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder={lang === 'ar' ? '123456' : '123456'}
                        value={forgotOtp}
                        onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const code = String(forgotOtp).trim();
                            if (code.length === 6) {
                              setError('');
                              setForgotStep('password');
                              setForgotNewPassword('');
                              setForgotConfirmPassword('');
                            } else {
                              setError(t.auth.enter6DigitCodeError);
                            }
                          }
                        }}
                        className="w-full px-4 py-4 rounded-xl border-2 border-palma-primary/30 bg-palma-primaryLight text-center text-xl font-bold tracking-[0.3em] focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/20 outline-none text-palma-navy"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="btn-primary flex-1 py-3 text-sm"
                        onClick={() => {
                          setError('');
                          const code = String(forgotOtp).trim();
                          if (code.length !== 6) {
                            setError(t.auth.enter6DigitCodeError);
                            return;
                          }
                          setForgotStep('password');
                          setForgotNewPassword('');
                          setForgotConfirmPassword('');
                        }}
                      >
                        {t.auth.next}
                      </button>
                      <button type="button" onClick={() => setForgotStep('email')} className="btn-secondary flex-1 py-3 text-sm">{t.common.back}</button>
                    </div>
                  </div>
                )}
                {forgotStep === 'password' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setError('');
                    if (forgotNewPassword.length < 6) {
                      setError(t.auth.passwordMin6);
                      return;
                    }
                    if (forgotNewPassword !== forgotConfirmPassword) {
                      setError(t.auth.passwordsDontMatch);
                      return;
                    }
                    setLoading(true);
                    const result = await marketStore.resetPassword(forgotEmail, forgotOtp, forgotNewPassword);
                    setLoading(false);
                    if (result.success) {
                      showToast(t.auth.passwordChanged, 'success');
                      setShowForgotPassword(false);
                      setPassword(forgotNewPassword);
                    } else {
                      setError(getAuthErrorMessage(result.error || 'Reset failed', lang));
                    }
                  }} className="space-y-4">
                    <div>
                      <label htmlFor="forgot-new-password" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        {t.auth.newPassword}
                      </label>
                      <input
                        id="forgot-new-password"
                        name="forgotNewPassword"
                        required
                        type="password"
                        placeholder={lang === 'ar' ? '••••••••' : '••••••••'}
                        value={forgotNewPassword}
                        onChange={e => setForgotNewPassword(e.target.value)}
                        minLength={6}
                        className="input-base rounded-xl"
                      />
                    </div>
                    <div>
                      <label htmlFor="forgot-confirm-password" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        {t.auth.confirmPassword}
                      </label>
                      <input
                        id="forgot-confirm-password"
                        name="forgotConfirmPassword"
                        required
                        type="password"
                        placeholder={lang === 'ar' ? '••••••••' : '••••••••'}
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                        minLength={6}
                        className="input-base rounded-xl"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-sm">{loading ? t.common.loading : t.auth.reset}</button>
                      <button type="button" onClick={() => setForgotStep('otp')} className="btn-secondary flex-1 py-3 text-sm">{t.common.back}</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* EMAIL VERIFICATION VIEW (بعد محاولة تسجيل دخول لبريد غير موثق) */}
            {verificationMode && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                  <h3 className="font-heading text-lg font-bold text-palma-navy">
                    {lang === 'ar' ? 'تأكيد البريد الإلكتروني' : lang === 'he' ? 'אימות כתובת אימייל' : 'Verify your email'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'أدخل رمز التحقق المكون من 6 أرقام الذي أُرسل إلى بريدك:'
                      : lang === 'he'
                      ? 'הזן את קוד האימות בן 6 ספרות שנשלח לכתובת:'
                      : 'Enter the 6-digit code sent to:'}{' '}
                    <span className="font-bold">{unverifiedEmail}</span>
                  </p>
                </div>
                <form
                  onSubmit={async (ev) => {
                    ev.preventDefault();
                    setError('');
                    if (!unverifiedEmail || verificationCode.trim().length !== 6) {
                      setError(getAuthErrorMessage('Valid 6-digit OTP is required', lang));
                      return;
                    }
                    setLoading(true);
                    const result = await userService.verifyEmail(unverifiedEmail, verificationCode.trim());
                    setLoading(false);
                    if (result.success && result.data) {
                      showToast(
                        lang === 'ar'
                          ? 'تم تأكيد البريد الإلكتروني بنجاح. جارٍ تسجيل الدخول...'
                          : lang === 'he'
                          ? 'האימייל אומת בהצלחה. מתחבר...'
                          : 'Email verified successfully. Logging you in...',
                        'success'
                      );
                      setVerificationMode(false);
                      setVerificationCode('');
                      // محاولة تسجيل الدخول من جديد الآن بعد التحقق
                      setLoading(true);
                      const loginAgain = await marketStore.login(unverifiedEmail.trim(), password.trim());
                      setLoading(false);
                      if (loginAgain.success && loginAgain.data) {
                        onLogin(loginAgain.data.user);
                      } else if ((loginAgain as any).requiresEmailVerification) {
                        // حالة نادرة لو لم يتم تحديث الحقل بعد – نعيد المستخدم لنفس الشاشة
                        setVerificationMode(true);
                      } else {
                        const errMsg = getAuthErrorMessage(loginAgain.error || 'Invalid credentials', lang);
                        setError(errMsg);
                        showToast(errMsg, 'error');
                      }
                    } else {
                      const errMsg = getAuthErrorMessage(result.error || 'Verification failed', lang);
                      setError(errMsg);
                      showToast(errMsg, 'error');
                    }
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label
                      htmlFor="login-verification-code"
                      className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2"
                    >
                      {t.auth.verificationCode6}
                    </label>
                    <input
                      id="login-verification-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-4 rounded-xl border-2 border-palma-primary/30 bg-palma-primaryLight text-center text-xl font-bold tracking-[0.3em] focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/20 outline-none text-palma-navy"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || verificationCode.trim().length !== 6}
                    className="btn-primary w-full py-4 text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? t.common.loading : (lang === 'ar' ? 'تأكيد الآن' : lang === 'he' ? 'אמת עכשיו' : 'Verify')}
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={loading || resendCooldown > 0}
                    className="w-full py-3 text-[11px] font-bold text-palma-primary hover:underline disabled:opacity-50"
                    onClick={async () => {
                      if (!unverifiedEmail) return;
                      setError('');
                      setLoading(true);
                      const res = await userService.resendVerificationCode(unverifiedEmail);
                      setLoading(false);
                      if (res.success) {
                        showToast(
                          lang === 'ar'
                            ? 'تم إرسال رمز جديد إلى بريدك.'
                            : lang === 'he'
                            ? 'נשלח קוד חדש לאימייל שלך.'
                            : 'A new verification code was sent to your email.',
                          'success'
                        );
                        setResendCooldown(60);
                      } else {
                        const errMsg = getAuthErrorMessage(res.error || 'Error', lang);
                        setError(errMsg);
                        showToast(errMsg, 'error');
                      }
                    }}
                  >
                    {resendCooldown > 0
                      ? lang === 'ar'
                        ? `يمكن إعادة الإرسال بعد ${resendCooldown} ث`
                        : lang === 'he'
                        ? `ניתן לשלוח שוב בעוד ${resendCooldown} שניות`
                        : `You can resend in ${resendCooldown}s`
                      : lang === 'ar'
                      ? 'إعادة إرسال الرمز'
                      : lang === 'he'
                      ? 'שלח קוד שוב'
                      : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    className="w-full py-2 text-[11px] font-bold text-slate-400 hover:text-slate-600"
                    onClick={() => {
                      setVerificationMode(false);
                      setVerificationCode('');
                      setError('');
                      if (typeof window !== 'undefined') {
                        window.location.hash = `#/${ROUTES.LOGIN}`;
                      }
                    }}
                  >
                    {lang === 'ar' ? 'العودة لتسجيل الدخول' : lang === 'he' ? 'חזרה להתחברות' : 'Back to login'}
                  </button>
                </form>
              </div>
            )}

            {/* LOGIN VIEW */}
            {view === 'LOGIN' && !showForgotPassword && !verificationMode && (
              <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.auth.email}</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-palma-primary transition-colors" />
                    <input 
                      id="login-email"
                      name="email"
                      required 
                      type="email" 
                      autoComplete="email"
                      className="w-full pl-12 pr-4 py-4 rounded-xl border border-palma-border bg-white text-sm font-medium text-palma-navy focus:border-palma-primary focus:shadow-input outline-none transition-all placeholder:text-slate-400" 
                      placeholder="name@email.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label htmlFor="login-password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.auth.password}</label>
                    <button type="button" onClick={() => { setShowForgotPassword(true); setError(''); setForgotEmail(email); setForgotStep('email'); setForgotOtp(''); setForgotNewPassword(''); setForgotConfirmPassword(''); }} className="text-[10px] font-bold text-palma-primary hover:underline">{t.auth.forgot}</button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-palma-primary transition-colors" />
                    <input 
                      id="login-password"
                      name="password"
                      required 
                      type="password" 
                      autoComplete="current-password"
                      className="w-full pl-12 pr-4 py-4 rounded-xl border border-palma-border bg-white text-sm font-medium text-palma-navy focus:border-palma-primary focus:shadow-input outline-none transition-all placeholder:text-slate-400" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-5 text-sm tracking-wide shadow-soft hover:shadow-card-hover active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.common.loading}
                    </>
                  ) : (
                    <>
                      {t.auth.loginBtn}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ROLE SELECTION VIEW */}
            {view === 'ROLE_SELECT' && (
              <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                   {roleOptions.map(r => (
                     <button
                        key={r.id}
                        onClick={() => handleRoleSelection(r.id as any)}
                        className={`p-5 rounded-xl border transition-all duration-200 flex flex-col items-center text-center gap-3 relative group ${role === r.id ? 'border-palma-primary bg-palma-primaryLight ring-1 ring-palma-primary shadow-soft' : 'border-palma-border bg-slate-50 hover:border-palma-primary/30 hover:shadow-card hover:bg-white'}`}
                     >
                        <div className={`p-3 rounded-xl transition-colors duration-200 ${role === r.id ? 'bg-palma-primary text-white shadow-soft' : 'bg-white text-slate-400 group-hover:text-palma-primary shadow-soft border border-palma-border'}`}>
                          {r.icon}
                        </div>
                        <div>
                          <span className={`block text-xs font-black uppercase tracking-wider mb-1 ${role === r.id ? 'text-palma-primary' : 'text-palma-navy'}`}>{r.label}</span>
                          <span className="text-[9px] font-bold text-slate-400">{r.desc}</span>
                        </div>
                     </button>
                   ))}
                </div>

                <button 
                  onClick={proceedToRegister}
                  disabled={!role}
                  className={`w-full py-5 rounded-xl font-semibold text-sm tracking-wide shadow-soft transition-all duration-200 flex items-center justify-center gap-3 ${role ? 'btn-primary active:scale-[0.98]' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                >
                  {t.auth.continue}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
           <p className="text-[10px] font-bold text-slate-300">© 2024 Palma Commerce. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
