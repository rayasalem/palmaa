/**
 * Auth.tsx – Login, role selection, and registration (merchant/broker/customer).
 * Uses marketStore.login for API call; state is local (view, email, password, error).
 * For a hook-based auth flow, use hooks/useAuth and call login/getMe from there.
 */

import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';
import { marketStore } from '../store';
import { t } from '../translations';
import { ShoppingCart, TrendingUp, Store, ArrowRight, Mail, Lock, CheckCircle, RefreshCcw } from 'lucide-react';
import RegisterBroker from './RegisterBroker';
import RegisterCustomer from './RegisterCustomer';
import RegisterMerchant from './RegisterMerchant';
import Logo from './Logo';
import { useToast } from './ToastProvider';

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
  const lang = typeof document !== 'undefined' ? (document.documentElement.dir === 'ltr' ? 'en' : 'ar') : 'en';
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

    const result = await marketStore.login(email, password);

    if (result.success && result.data) {
      showToast(t.common.success, 'success');
      onLogin(result.data.user);
    } else {
      setError(result.error || 'Invalid credentials');
      showToast(result.error || 'Login Failed', 'error');
    }
    setLoading(false);
  };

  const handleRoleSelection = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setError('');
  };

  const proceedToRegister = () => {
    if (!role) {
      setError('Please select an account type');
      return;
    }
    
    if (role === 'BROKER') setView('REGISTER_BROKER');
    else if (role === 'CUSTOMER') setView('REGISTER_CUSTOMER');
    else if (role === 'MERCHANT') setView('REGISTER_MERCHANT');
    else setView('ROLE_SELECT');
  };

  const roleOptions = [
    { id: 'CUSTOMER', label: t.roles.CUSTOMER, icon: <ShoppingCart className="w-5 h-5"/>, desc: 'Shop & Discover' },
    { id: 'MERCHANT', label: t.roles.MERCHANT, icon: <Store className="w-5 h-5"/>, desc: 'Sell & Grow' },
    { id: 'BROKER', label: t.roles.BROKER, icon: <TrendingUp className="w-5 h-5"/>, desc: 'Promote & Earn' },
  ];

  if (view === 'REGISTER_BROKER') return <RegisterBroker onRegister={onLogin} onBackToLogin={() => setView('LOGIN')} />;
  if (view === 'REGISTER_CUSTOMER') return <RegisterCustomer onRegister={onLogin} onBackToLogin={() => setView('LOGIN')} />;
  if (view === 'REGISTER_MERCHANT') return <RegisterMerchant onRegister={onLogin} onBackToLogin={() => setView('LOGIN')} onOpenTerms={onOpenTerms} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans" dir="rtl">
      
      <div className="w-full max-w-lg transition-all duration-700 ease-in-out animate-fade-in">
        
        {/* Branding Header */}
        <div className="text-center space-y-8 mb-10">
           <div className="flex justify-center transform scale-125"><Logo /></div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-50 border-b border-slate-100 m-4 rounded-2xl">
            <button 
              onClick={() => { setView('LOGIN'); setError(''); }}
              className={`py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'LOGIN' ? 'bg-white text-palma-navy shadow-sm' : 'text-slate-400 hover:text-palma-navy'}`}
            >
              {t.auth.login}
            </button>
            <button 
              onClick={() => { setView('ROLE_SELECT'); setError(''); }}
              className={`py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view !== 'LOGIN' ? 'bg-white text-palma-navy shadow-sm' : 'text-slate-400 hover:text-palma-navy'}`}
            >
              {t.auth.register}
            </button>
          </div>

          <div className="p-8 sm:p-10 pt-4">
            <div className="mb-10 text-center">
               <h2 className="text-2xl font-black text-palma-navy mb-2 tracking-tight">
                 {view === 'LOGIN' ? t.auth.welcomeHeadline : t.auth.chooseRole}
               </h2>
               <p className="text-sm font-medium text-slate-400">
                 {view === 'LOGIN' ? t.auth.digitalJourney : t.auth.roleSubtitle}
               </p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-3 border border-red-100 animate-slide-up">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {error}
              </div>
            )}

            {/* FORGOT PASSWORD VIEW */}
            {view === 'LOGIN' && showForgotPassword && (
              <div className="space-y-6 animate-fade-in">
                {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                <h3 className="text-lg font-bold text-palma-navy">
                  {forgotStep === 'email' && (lang === 'ar' ? 'نسيت كلمة المرور' : 'Forgot Password')}
                  {forgotStep === 'otp' && (lang === 'ar' ? 'أدخل رمز التحقق المرسل إلى بريدك' : 'Enter the 6-digit code sent to your email')}
                  {forgotStep === 'password' && (lang === 'ar' ? 'كلمة المرور الجديدة' : 'Enter new password')}
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
                      setError(result.error || 'Request failed');
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
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold"
                    />
                    <div className="flex gap-3">
                      <button type="submit" disabled={loading} className="flex-1 py-3 bg-palma-primary text-white rounded-xl font-bold text-xs uppercase">{loading ? t.common.loading : (lang === 'ar' ? 'إرسال' : 'Send')}</button>
                      <button type="button" onClick={() => setShowForgotPassword(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase">{t.common.back}</button>
                    </div>
                  </form>
                )}
                {forgotStep === 'otp' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    setError('');
                    if (String(forgotOtp).trim().length !== 6) {
                      setError(lang === 'ar' ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter the 6-digit code');
                      return;
                    }
                    setForgotStep('password');
                    setForgotNewPassword('');
                    setForgotConfirmPassword('');
                  }} className="space-y-4">
                    <div>
                      <label htmlFor="forgot-otp" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        {lang === 'ar' ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6 digits)'}
                      </label>
                      <input
                        id="forgot-otp"
                        name="forgotOtp"
                        required
                        type="text"
                        inputMode="numeric"
                        placeholder={lang === 'ar' ? '123456' : '123456'}
                        value={forgotOtp}
                        onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="w-full px-4 py-4 rounded-2xl border-2 border-palma-primary/30 bg-palma-primary/5 text-center text-xl font-black tracking-[0.3em] focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/20 outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="flex-1 py-3 bg-palma-primary text-white rounded-xl font-bold text-xs uppercase">
                        {lang === 'ar' ? 'التالي' : 'Next'}
                      </button>
                      <button type="button" onClick={() => setForgotStep('email')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase">{t.common.back}</button>
                    </div>
                  </form>
                )}
                {forgotStep === 'password' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setError('');
                    if (forgotNewPassword.length < 6) {
                      setError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
                      return;
                    }
                    if (forgotNewPassword !== forgotConfirmPassword) {
                      setError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
                      return;
                    }
                    setLoading(true);
                    const result = await marketStore.resetPassword(forgotEmail, forgotOtp, forgotNewPassword);
                    setLoading(false);
                    if (result.success) {
                      showToast(lang === 'ar' ? 'تم تغيير كلمة المرور' : 'Password reset successfully', 'success');
                      setShowForgotPassword(false);
                      setPassword(forgotNewPassword);
                    } else {
                      setError(result.error || 'Reset failed');
                    }
                  }} className="space-y-4">
                    <div>
                      <label htmlFor="forgot-new-password" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
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
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="forgot-confirm-password" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
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
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={loading} className="flex-1 py-3 bg-palma-primary text-white rounded-xl font-bold text-xs uppercase">{loading ? t.common.loading : (lang === 'ar' ? 'تغيير' : 'Reset')}</button>
                      <button type="button" onClick={() => setForgotStep('otp')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase">{t.common.back}</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* LOGIN VIEW */}
            {view === 'LOGIN' && !showForgotPassword && (
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
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-palma-navy focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 outline-none transition-all placeholder:text-slate-300" 
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
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-palma-navy focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 outline-none transition-all placeholder:text-slate-300" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 bg-palma-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-palma-navy/20 hover:bg-palma-primary transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4">
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
                        className={`p-5 rounded-2xl border transition-all flex flex-col items-center text-center gap-3 relative group ${role === r.id ? 'border-palma-primary bg-palma-primary/5 ring-1 ring-palma-primary' : 'border-slate-100 bg-slate-50 hover:border-palma-primary/30 hover:shadow-lg hover:bg-white'}`}
                     >
                        <div className={`p-3 rounded-xl transition-colors ${role === r.id ? 'bg-palma-primary text-white shadow-lg shadow-palma-primary/30' : 'bg-white text-slate-400 group-hover:text-palma-primary shadow-sm'}`}>
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
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${role ? 'bg-palma-navy text-white hover:bg-palma-primary shadow-palma-navy/20 active:scale-[0.98]' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}
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
