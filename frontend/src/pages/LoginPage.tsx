import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FiMail, FiLock, FiBriefcase, FiAlertCircle, FiShield, FiKey, FiClock, FiRefreshCw } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import api from '../services/api';
import GoogleAccountChooserModal, { type GoogleSelectedAccount } from '../components/common/GoogleAccountChooserModal';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, verifyTwoFactor } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Account Chooser
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // 2FA Challenge state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [twoFactorType, setTwoFactorType] = useState('SMS_OTP');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const [resending, setResending] = useState(false);

  // 2FA Timer countdown effect
  useEffect(() => {
    if (!show2FAModal || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [show2FAModal, timeLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login({ email, password });
      if (res.twoFactorRequired) {
        setTwoFactorType(res.twoFactorType || 'SMS_OTP');
        setTimeLeft(300);
        setShow2FAModal(true);
        toast('Two-Factor Authentication code dispatched to your Gmail / phone.', { icon: '🔐' });
        return;
      }

      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGoogleAccount = async (account: GoogleSelectedAccount) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogle({
        email: account.email,
        fullName: account.fullName,
        googleId: account.googleId,
        avatarUrl: account.avatarUrl || 'https://lh3.googleusercontent.com/a/default-user',
      });

      if (res.twoFactorRequired) {
        setEmail(account.email);
        setTwoFactorType(res.twoFactorType || 'PASSKEY');
        setTimeLeft(300);
        setShow2FAModal(true);
        return;
      }

      toast.success(`Signed in as ${account.fullName}!`);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google sign in failed');
      toast.error('Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    if (timeLeft <= 0) {
      toast.error('Verification code has expired. Please click Resend Code.');
      return;
    }

    setLoading(true);
    try {
      await verifyTwoFactor(email, otpCode.trim());
      toast.success('Two-factor verification successful!');
      setShow2FAModal(false);
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid 2FA code. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending) return;
    setResending(true);
    try {
      await api.post('/auth/send-verification-email', null, {
        params: { email },
      });
      setTimeLeft(300);
      setOtpCode('');
      toast.success(`A new verification code has been sent to ${email}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleVerifyPasskey = async () => {
    setLoading(true);
    try {
      await verifyTwoFactor(email, 'passkey_verified');
      toast.success('Passkey / Biometric verified successfully!');
      setShow2FAModal(false);
      navigate(from, { replace: true });
    } catch {
      toast.error('Passkey verification failed');
    } finally {
      setLoading(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = ('0' + (timeLeft % 60)).slice(-2);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-md">
            <FiBriefcase className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{t('nav.signIn')}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Or{' '}
            <Link to="/register" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              {t('nav.getStarted')}
            </Link>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <FiAlertCircle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-in button with Account Picker */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-xs transition cursor-pointer"
        >
          <FcGoogle className="w-5 h-5" />
          <span>{t('auth.google')} (Choose Account)</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="grow border-t border-gray-200 dark:border-gray-700"></div>
          <span className="shrink mx-4 text-xs text-gray-400 uppercase font-semibold">
            {t('auth.orEmail')}
          </span>
          <div className="grow border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiMail />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiLock />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Signing in...' : t('nav.signIn')}
          </button>
        </form>
      </div>

      {/* Google Account Chooser Modal */}
      <GoogleAccountChooserModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleSelectGoogleAccount}
        currentEmailHint={email}
      />

      {/* 2FA Verification Modal with reducing valid time range and Resend option */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
              <FiShield className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('auth.2faTitle')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                A verification code was dispatched to <strong className="text-gray-800 dark:text-gray-200">{email}</strong> via {twoFactorType === 'SMS_OTP' ? 'Mobile SMS' : 'Email (Gmail)'}
              </p>
            </div>

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="w-full text-center tracking-widest text-2xl font-mono py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />

                {/* Reducing countdown timer indicator */}
                <div className="mt-2.5 flex items-center justify-between text-xs px-1">
                  <span className={`flex items-center gap-1 font-semibold ${
                    timeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    <FiClock className="w-3.5 h-3.5" />
                    <span>
                      {timeLeft > 0 ? `Code expires in: ${minutes}:${seconds}` : 'Code has expired'}
                    </span>
                  </span>

                  {/* Resend Code Button */}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <FiRefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                    <span>{resending ? 'Sending...' : 'Resend Code'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || timeLeft <= 0}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Verifying...' : t('auth.verifyOtp')}
                </button>

                <button
                  type="button"
                  onClick={handleVerifyPasskey}
                  className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiKey />
                  {t('auth.passkey')}
                </button>

                <button
                  type="button"
                  onClick={() => setShow2FAModal(false)}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
