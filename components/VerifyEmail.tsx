/**
 * VerifyEmail – shown when a logged-in user has not yet verified their email.
 * User must enter OTP sent to their email before accessing the app.
 */

import React, { useState } from 'react';
import { User } from '../types';
import { userService } from '../services/userService';
import Logo from './Logo';
import { useToast } from './ToastProvider';
import { getAuthErrorMessage } from '../translations';

interface VerifyEmailProps {
  user: User;
  onVerified: (verifiedUser: User) => void;
  onLogout: () => void;
  lang: 'ar' | 'en' | 'he';
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ user, onVerified, onLogout, lang }) => {
  const { showToast } = useToast();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const displayLang = lang;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await userService.verifyEmail(user.email || '', verificationCode);
    if (result.success && result.data) {
      showToast(
        displayLang === 'en' ? 'Account verified!' : displayLang === 'he' ? 'החשבון אומת!' : 'تم تأكيد الحساب!',
        'success'
      );
      onVerified(result.data.user);
    } else {
      const errMsg = getAuthErrorMessage(result.error || 'Verification failed', displayLang);
      setError(errMsg);
      showToast(errMsg, 'error');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    const result = await userService.resendVerificationCode(user.email || '');
    if (result.success) {
      showToast(
        displayLang === 'en' ? 'Code sent!' : displayLang === 'he' ? 'הקוד נשלח!' : 'تم إرسال الرمز!',
        'success'
      );
    } else {
      const errMsg = getAuthErrorMessage(result.error || 'Error', displayLang);
      showToast(errMsg, 'error');
      setError(errMsg);
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-20"
      dir={displayLang === 'en' ? 'ltr' : 'rtl'}
    >
      <div className="max-w-lg w-full bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="medium" />
          </div>
          <h1 className="text-xl font-black text-slate-900">
            {displayLang === 'en' ? 'Verify your email' : 'تأكيد البريد الإلكتروني'}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            {displayLang === 'en' ? 'Enter the 6-digit code sent to' : 'أدخل الرمز المكون من 6 أرقام المرسل إلى'}:{' '}
            <strong>{user.email}</strong>
          </p>
        </div>
        <form onSubmit={handleVerify} className="space-y-6">
          {error && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl text-center">{error}</div>}
          <input
            type="text"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-center text-xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-palma-primary outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || verificationCode.length !== 6}
            className="w-full py-4 bg-palma-primary text-white rounded-xl font-bold text-sm uppercase disabled:opacity-50"
          >
            {loading ? (displayLang === 'en' ? 'Loading...' : 'جاري...') : displayLang === 'en' ? 'Verify' : 'تأكيد'}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="w-full py-3 text-palma-primary font-bold text-sm hover:underline disabled:opacity-50"
          >
            {displayLang === 'en' ? 'Resend code' : 'إعادة إرسال الرمز'}
          </button>
          <button type="button" onClick={onLogout} className="w-full py-2 text-slate-400 text-xs hover:text-slate-600">
            {displayLang === 'en' ? 'Logout' : 'تسجيل الخروج'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail;
