import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authService } from '../services/auth.service';
import type { User } from '../types';
import api from '../services/api';
import GoogleSignInButton from '../components/common/GoogleSignInButton';
import {
  extractApiError,
  formatCountdown,
  normalizeLkPhone,
} from '../utils/authHelpers';
import {
  FiMail,
  FiLock,
  FiBriefcase,
  FiAlertCircle,
  FiShield,
  FiKey,
  FiClock,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiSmartphone,
  FiCheckCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

type LoginTab = 'password' | 'otp';

export const LoginPage: React.FC = () => {
  const { login, verifyOtpLogin, loginWithGoogle, verifyTwoFactor } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const getDestination = (loggedUser?: User | null): string => {
    const requested = (location.state as any)?.from?.pathname;
    if (loggedUser?.role === 'ROLE_ADMIN') {
      return requested && requested.startsWith('/admin') ? requested : '/admin';
    }
    if (requested && requested !== '/login' && requested !== '/register' && !requested.startsWith('/admin')) {
      return requested;
    }
    return '/dashboard';
  };

  const [activeTab, setActiveTab] = useState<LoginTab>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Passwordless OTP login state (Phone/Email Code tab)
  const [otpInputMode, setOtpInputMode] = useState<'phone' | 'email'>('email');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [otpMaskedTarget, setOtpMaskedTarget] = useState('');
  const [otpTimeLeft, setOtpTimeLeft] = useState(120);

  // 2FA challenge modal state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [twoFactorType, setTwoFactorType] = useState('EMAIL_OTP');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [resending, setResending] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotTimeLeft, setForgotTimeLeft] = useState(120);

  useEffect(() => {
    if (!show2FAModal || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [show2FAModal, timeLeft]);

  useEffect(() => {
    if (!otpSent || otpTimeLeft <= 0) return;
    const id = setInterval(() => setOtpTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [otpSent, otpTimeLeft]);

  useEffect(() => {
    if (!showForgotModal || forgotStep !== 'reset' || forgotTimeLeft <= 0) return;
    const id = setInterval(() => setForgotTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [showForgotModal, forgotStep, forgotTimeLeft]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ email: identifier.trim(), password });
      if (res.twoFactorRequired) {
        setTwoFactorEmail(res.user?.email || identifier.trim());
        setTwoFactorType(res.twoFactorType || 'EMAIL_OTP');
        setTimeLeft(120);
        setOtpCode('');
        setShow2FAModal(true);
        toast('Verification code sent to your email / phone.', { icon: '🔐' });
        return;
      }
      toast.success(res.user?.role === 'ROLE_ADMIN' ? 'Welcome to Company Admin Console!' : 'Welcome back!');
      navigate(getDestination(res.user), { replace: true });
    } catch (err: any) {
      const msg = extractApiError(err, 'Invalid phone/email or password.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resolveOtpLoginIdentifier = (): string => {
    return otpInputMode === 'phone' ? normalizeLkPhone(otpPhone) : otpEmail.trim().toLowerCase();
  };

  const handleSendOtpLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = resolveOtpLoginIdentifier();
    if (!target) {
      setError(otpInputMode === 'phone' ? 'Please enter your mobile number' : 'Please enter your Gmail address');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await authService.sendOtpLoginCode(target);
      setOtpMaskedTarget(res.maskedEmail || target);
      setOtpTimeLeft(res.expiresInSeconds || 120);
      setLoginOtpCode('');
      setOtpSent(true);
      toast.success(`6-digit login code sent to ${res.maskedEmail || 'your inbox'}`);
    } catch (err: any) {
      const msg = extractApiError(err, 'Could not send login code. Check your phone/email or sign up.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginOtpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    if (otpTimeLeft <= 0) {
      setError('Code expired. Please click Resend Code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtpLogin(resolveOtpLoginIdentifier(), loginOtpCode.trim());
      toast.success(res.user?.role === 'ROLE_ADMIN' ? 'Welcome to Company Admin Console!' : 'Welcome back!');
      navigate(getDestination(res.user), { replace: true });
    } catch (err: any) {
      const msg = extractApiError(err, 'Invalid or expired verification code.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogle(credential);
      if (res.twoFactorRequired) {
        setTwoFactorEmail(res.user?.email || '');
        setTwoFactorType(res.twoFactorType || 'EMAIL_OTP');
        setTimeLeft(120);
        setOtpCode('');
        setShow2FAModal(true);
        return;
      }
      toast.success(`Signed in as ${res.user?.fullName || 'Google user'}!`);
      navigate(getDestination(res.user), { replace: true });
    } catch (err: any) {
      const msg = extractApiError(err, 'Google sign-in failed');
      setError(msg);
      toast.error(msg);
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
      const res = await verifyTwoFactor(twoFactorEmail, otpCode.trim());
      toast.success('Two-factor verification successful!');
      setShow2FAModal(false);
      navigate(getDestination(res.user), { replace: true });
    } catch (err: any) {
      toast.error(extractApiError(err, 'Invalid 2FA code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend2FAOtp = async () => {
    if (resending) return;
    setResending(true);
    try {
      await api.post('/auth/send-verification-email', null, { params: { email: twoFactorEmail } });
      setTimeLeft(120);
      setOtpCode('');
      toast.success(`A new verification code has been sent to ${twoFactorEmail}`);
    } catch (err: any) {
      toast.error(extractApiError(err, 'Failed to resend code'));
    } finally {
      setResending(false);
    }
  };

  const handleVerifyPasskey = async () => {
    setLoading(true);
    try {
      const res = await verifyTwoFactor(twoFactorEmail, 'passkey_verified');
      toast.success('Passkey / Biometric verified successfully!');
      setShow2FAModal(false);
      navigate(getDestination(res.user), { replace: true });
    } catch {
      toast.error('Passkey verification failed');
    } finally {
      setLoading(false);
    }
  };

  const openForgotPasswordModal = () => {
    setForgotIdentifier(identifier.trim());
    setForgotStep('request');
    setForgotCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setShowForgotModal(true);
  };

  const handleSendForgotCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotIdentifier.trim()) {
      toast.error('Please enter your email or phone number');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.sendForgotPasswordCode(forgotIdentifier.trim());
      setForgotMaskedEmail(res.maskedEmail || forgotIdentifier.trim());
      setForgotTimeLeft(res.expiresInSeconds || 120);
      setForgotCode('');
      setForgotStep('reset');
      toast.success(`Reset code sent to ${res.maskedEmail || 'your email'}`);
    } catch (err: any) {
      toast.error(extractApiError(err, 'Could not send reset code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit reset code');
      return;
    }
    if (forgotTimeLeft <= 0) {
      toast.error('Reset code has expired. Please request a new code.');
      return;
    }
    if (forgotNewPassword.length < 8 || !/(?=.*[A-Za-z])(?=.*\d)/.test(forgotNewPassword)) {
      toast.error('Password must be 8+ characters with at least one letter and one number');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(forgotIdentifier.trim(), forgotCode.trim(), forgotNewPassword);
      toast.success('Password reset successful! Please sign in with your new password.');
      setIdentifier(forgotIdentifier.trim());
      setPassword('');
      setActiveTab('password');
      setShowForgotModal(false);
    } catch (err: any) {
      toast.error(extractApiError(err, 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-7 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Top Mode Tabs */}
        <div className="text-center space-y-4">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-md">
            <FiBriefcase className="w-5 h-5" />
          </div>

          <div className="grid grid-cols-2 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setError(null);
              }}
              className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'password'
                  ? 'border-blue-600 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('otp');
                setError(null);
              }}
              className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'otp'
                  ? 'border-blue-600 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Phone / Email Code
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <FiAlertCircle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: Password Login */}
        {activeTab === 'password' ? (
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Phone Number or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiMail />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Please enter your Phone or Email"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={openForgotPasswordModal}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiLock />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Please enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-full shadow-md text-sm font-bold tracking-wide text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'LOGIN'}
            </button>
          </form>
        ) : (
          /* TAB 2: Passwordless OTP Login */
          <div className="space-y-4">
            {!otpSent ? (
              <form className="space-y-4" onSubmit={handleSendOtpLogin}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {otpInputMode === 'phone' ? 'Mobile Number (+94)' : 'Registered Email'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtpInputMode(otpInputMode === 'phone' ? 'email' : 'phone')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {otpInputMode === 'phone' ? 'Use Email instead' : 'Use Phone (+94)'}
                  </button>
                </div>

                {otpInputMode === 'phone' ? (
                  <div className="flex gap-2">
                    <div className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 shrink-0 select-none">
                      +94
                    </div>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FiSmartphone />
                      </div>
                      <input
                        type="tel"
                        required
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value)}
                        placeholder="77 123 4567"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FiMail />
                    </div>
                    <input
                      type="email"
                      required
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="you@gmail.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                  </div>
                )}

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  We will send a 6-digit login code to your account&apos;s verified Gmail (and SMS when enabled).
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-full shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <FiSmartphone className="w-4 h-4" />
                  <span>{loading ? 'Sending code...' : 'Send Verification Code'}</span>
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleVerifyOtpLogin}>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-200 flex items-center justify-between">
                  <span>
                    Code sent to <strong>{otpMaskedTarget}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setError(null);
                    }}
                    className="font-semibold underline cursor-pointer ml-2 shrink-0"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={loginOtpCode}
                    onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full text-center tracking-widest text-2xl font-mono py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />

                  <div className="mt-2.5 flex items-center justify-between text-xs px-1">
                    <span
                      className={`flex items-center gap-1 font-semibold ${
                        otpTimeLeft < 30 ? 'text-rose-500 animate-pulse' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <FiClock className="w-3.5 h-3.5" />
                      <span>{otpTimeLeft > 0 ? `Expires in: ${formatCountdown(otpTimeLeft)}` : 'Code expired'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendOtpLogin()}
                      disabled={loading || otpTimeLeft > 90}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiRefreshCw className="w-3 h-3" />
                      <span>{otpTimeLeft > 90 ? `Wait ${otpTimeLeft - 90}s` : 'Resend Code'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpTimeLeft <= 0 || loginOtpCode.length !== 6}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Verify & Log In'}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            Sign up
          </Link>
        </p>

        <div className="relative flex py-1 items-center">
          <div className="grow border-t border-gray-200 dark:border-gray-700" />
          <span className="shrink mx-4 text-xs text-gray-400 uppercase font-semibold">
            Or, login with
          </span>
          <div className="grow border-t border-gray-200 dark:border-gray-700" />
        </div>

        {/* Visible Google Sign-In button using real browser Gmail accounts */}
        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          text="continue_with"
          label="Continue with Google"
          disabled={loading}
        />
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiKey className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reset Password</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {forgotStep === 'request'
                  ? 'Enter your registered email or phone number to receive a 6-digit reset code.'
                  : `Enter the 6-digit code sent to ${forgotMaskedEmail} and set a strong new password.`}
              </p>
            </div>

            {forgotStep === 'request' ? (
              <form onSubmit={handleSendForgotCode} className="space-y-4">
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Email or mobile phone number"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit reset code"
                    className="w-full text-center tracking-widest text-xl font-mono py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-xs px-1">
                    <span className={forgotTimeLeft < 30 ? 'text-rose-500 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                      {forgotTimeLeft > 0 ? `Expires in: ${formatCountdown(forgotTimeLeft)}` : 'Code expired'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendForgotCode()}
                      disabled={loading || forgotTimeLeft > 90}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={forgotShowPassword ? 'text' : 'password'}
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="New password (8+ chars, letter & number)"
                    className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setForgotShowPassword(!forgotShowPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 cursor-pointer"
                  >
                    {forgotShowPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>

                <input
                  type={forgotShowPassword ? 'text' : 'password'}
                  required
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || forgotTimeLeft <= 0}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FiCheckCircle className="w-3.5 h-3.5" />
                    <span>{loading ? 'Updating...' : 'Reset Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2FA Verification Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
              <FiShield className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('auth.2faTitle')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                A verification code was dispatched to <strong className="text-gray-800 dark:text-gray-200">{twoFactorEmail}</strong> via{' '}
                {twoFactorType === 'SMS_OTP' ? 'Mobile SMS / Email' : 'Email (Gmail)'}
              </p>
            </div>

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="w-full text-center tracking-widest text-2xl font-mono py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />

                <div className="mt-2.5 flex items-center justify-between text-xs px-1">
                  <span
                    className={`flex items-center gap-1 font-semibold ${
                      timeLeft < 30 ? 'text-rose-500 animate-pulse' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <FiClock className="w-3.5 h-3.5" />
                    <span>{timeLeft > 0 ? `Code expires in: ${formatCountdown(timeLeft)}` : 'Code has expired'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleResend2FAOtp}
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
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Verifying...' : t('auth.verifyOtp')}
                </button>

                <button
                  type="button"
                  onClick={handleVerifyPasskey}
                  className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-full text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiKey />
                  {t('auth.passkey')}
                </button>

                <button
                  type="button"
                  onClick={() => setShow2FAModal(false)}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
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
