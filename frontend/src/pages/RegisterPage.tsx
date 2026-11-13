import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FiUser, FiMail, FiLock, FiPhone, FiAlertCircle, FiCheckCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import api from '../services/api';
import GoogleAccountChooserModal, { type GoogleSelectedAccount } from '../components/common/GoogleAccountChooserModal';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle, verifyEmail } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ROLE_POSTER' | 'ROLE_CLIENT'>('ROLE_POSTER');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Account Chooser
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Email verification modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [resending, setResending] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (!showVerifyModal || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [showVerifyModal, timeLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register({
        fullName,
        email,
        password,
        phone,
        role,
      });

      setTimeLeft(300);
      toast.success('Registration successful! Verification code sent to your email.');
      setShowVerifyModal(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please check inputs.';
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
      await loginWithGoogle({
        email: account.email,
        fullName: account.fullName,
        googleId: account.googleId,
        avatarUrl: account.avatarUrl || 'https://lh3.googleusercontent.com/a/default-user',
      });
      toast.success(`Account created with Google as ${account.fullName}!`);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google registration failed');
      toast.error('Google registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    if (timeLeft <= 0) {
      toast.error('Verification code has expired. Please click Resend Code.');
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(email, verifyCode.trim());
      toast.success('Email verified successfully!');
      setShowVerifyModal(false);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resending) return;
    setResending(true);
    try {
      await api.post('/auth/send-verification-email', null, {
        params: { email },
      });
      setTimeLeft(300);
      setVerifyCode('');
      toast.success(`A new verification code has been dispatched to ${email}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = ('0' + (timeLeft % 60)).slice(-2);

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.getStarted')}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              {t('nav.signIn')}
            </Link>
          </p>
          <div className="mt-3 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300">
            💡 <strong>Service Seekers:</strong> Browsing and contacting workers is 100% free without signing in. Create an account to post services or manage listings.
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <FiAlertCircle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google sign-up with Account Chooser */}
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
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Select Your Account Purpose
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('ROLE_POSTER')}
                className={`p-3 text-center rounded-xl border transition text-xs font-semibold cursor-pointer ${
                  role === 'ROLE_POSTER'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-2 ring-blue-600/30'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                🛠️ Service Provider
                <span className="block text-[10px] text-gray-400 font-normal mt-0.5">Post services & trades</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('ROLE_CLIENT')}
                className={`p-3 text-center rounded-xl border transition text-xs font-semibold cursor-pointer ${
                  role === 'ROLE_CLIENT'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-2 ring-blue-600/30'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                🔍 Service Seeker
                <span className="block text-[10px] text-gray-400 font-normal mt-0.5">Hire workers (Optional)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiUser />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Kasun Bandara"
                className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Email Address *
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
                placeholder="kasun@gmail.com"
                className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Mobile Phone (For WhatsApp / Calling) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiPhone />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0771234567"
                className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Password *
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
                className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiLock />
              </div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
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

      {/* Email Verification Modal with Countdown Timer & Resend */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <FiCheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verify Your Email</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                We've sent a 6-digit confirmation code to <strong className="text-gray-800 dark:text-gray-200">{email}</strong>.
              </p>
            </div>

            <form onSubmit={handleConfirmEmailVerification} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="w-full text-center tracking-widest text-2xl font-mono py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />

                {/* Reducing countdown timer and resend option */}
                <div className="mt-2.5 flex items-center justify-between text-xs px-1">
                  <span className={`flex items-center gap-1 font-semibold ${
                    timeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    <FiClock className="w-3.5 h-3.5" />
                    <span>
                      {timeLeft > 0 ? `Code expires in: ${minutes}:${seconds}` : 'Code has expired'}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={handleResendEmail}
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
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Verify Email & Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Verify Later & Skip to Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
