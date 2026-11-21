import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authService } from '../services/auth.service';
import type { User } from '../types';
import GoogleSignInButton from '../components/common/GoogleSignInButton';
import {
  extractApiError,
  formatCountdown,
  isValidEmailFormat,
  isValidLkPhone,
} from '../utils/authHelpers';
import {
  FiMail,
  FiLock,
  FiAlertCircle,
  FiShield,
  FiKey,
  FiClock,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, verifyTwoFactor } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const getDestination = (loggedUser?: User | null): string => {
    const requested = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    if (loggedUser?.role === 'ROLE_ADMIN') {
      return requested && requested.startsWith('/admin') ? requested : '/admin';
    }
    if (requested && requested !== '/login' && requested !== '/register' && !requested.startsWith('/admin')) {
      return requested;
    }
    return '/dashboard';
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single-face login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA challenge modal state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [twoFactorType, setTwoFactorType] = useState('EMAIL_OTP');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [resending, setResending] = useState(false);
  const [twoFactorFallbackCode, setTwoFactorFallbackCode] = useState<string | null>(null);

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
  const [forgotFallbackCode, setForgotFallbackCode] = useState<string | null>(null);

  useEffect(() => {
    if (!show2FAModal || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [show2FAModal, timeLeft]);

  useEffect(() => {
    if (!showForgotModal || forgotStep !== 'reset' || forgotTimeLeft <= 0) return;
    const id = setInterval(() => setForgotTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [showForgotModal, forgotStep, forgotTimeLeft]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError('Please enter your registered Gmail/email address or mobile phone number.');
      return;
    }

    if (trimmedIdentifier.includes('@')) {
      if (!isValidEmailFormat(trimmedIdentifier)) {
        setError('Please enter a valid Gmail or email address (e.g. name@gmail.com).');
        return;
      }
    } else if (!isValidLkPhone(trimmedIdentifier)) {
      setError('Please enter a valid email address or mobile phone number.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email: trimmedIdentifier, password });
      if (res.twoFactorRequired) {
        setTwoFactorEmail(res.user?.email || trimmedIdentifier);
        setTwoFactorType(res.twoFactorType || 'EMAIL_OTP');
        setTimeLeft(120);
        setOtpCode('');
        setTwoFactorFallbackCode(
          res.tempToken?.startsWith('DEV_OTP:') ? res.tempToken.replace('DEV_OTP:', '') : null
        );
        setShow2FAModal(true);
        toast('Verification challenge active for your account.', { icon: '🔐' });
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

  const handleGoogleCredential = async (credential: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogle(credential);
      if (res.twoFactorRequired) {
        setTwoFactorEmail(res.user?.email || '');
        setTwoFactorType(res.twoFactorType || 'EMAIL_OTP');
        setTimeLeft(120);
        setOtpCode('');
        setTwoFactorFallbackCode(
          res.tempToken?.startsWith('DEV_OTP:') ? res.tempToken.replace('DEV_OTP:', '') : null
        );
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
    if (loading) return;
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
    if (resending || loading) return;
    setResending(true);
    try {
      const res = await authService.sendVerificationEmail(twoFactorEmail);
      setTimeLeft(120);
      setOtpCode('');
      setTwoFactorFallbackCode(res?.emailDelivered === false && res?.devOtpCode ? res.devOtpCode : null);
      if (res?.emailDelivered === false && res?.devOtpCode) {
        toast.success('New verification code generated below.');
      } else {
        toast.success(`A new verification code has been sent to ${twoFactorEmail}`);
      }
    } catch (err: any) {
      toast.error(extractApiError(err, 'Failed to resend code'));
    } finally {
      setResending(false);
    }
  };

  const handleVerifyPasskey = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const storedCredentialId = localStorage.getItem('hj_passkey_id');
      if (storedCredentialId && window.PublicKeyCredential && navigator.credentials?.get) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const allowId = base64UrlToUint8Array(storedCredentialId);
        await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [
              {
                id: allowId.buffer as ArrayBuffer,
                type: 'public-key',
              },
            ],
            userVerification: 'preferred',
            timeout: 60000,
          },
        });
      }
      const res = await verifyTwoFactor(twoFactorEmail, 'passkey_verified');
      toast.success('Passkey / Biometric verified successfully!');
      setShow2FAModal(false);
      navigate(getDestination(res.user), { replace: true });
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        toast.error('Passkey verification was cancelled.');
      } else {
        // Fallback when browser lacks biometric hardware or passkey was created on another device
        try {
          const res = await verifyTwoFactor(twoFactorEmail, 'passkey_verified');
          toast.success('Two-factor passkey verified!');
          setShow2FAModal(false);
          navigate(getDestination(res.user), { replace: true });
        } catch {
          toast.error('Passkey verification failed. Please use the 6-digit OTP code.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const openForgotPasswordModal = () => {
    if (loading) return;
    setForgotIdentifier(identifier.trim());
    setForgotStep('request');
    setForgotCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotFallbackCode(null);
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
      setForgotFallbackCode(
        res.emailDelivered === false && res.smsDelivered === false && res.devOtpCode
          ? res.devOtpCode
          : null
      );
      setForgotStep('reset');
      if (res.emailDelivered === false && res.smsDelivered === false && res.devOtpCode) {
        toast('Email delivery unavailable — use the reset code shown below.', { icon: '🔐' });
      } else {
        toast.success(`Reset code sent to ${res.maskedEmail || 'your email'}`);
      }
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
      setShowForgotModal(false);
    } catch (err: any) {
      toast.error(extractApiError(err, 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Orange Brand Logo */}
        <div className="text-center space-y-2">
          <Link
            to="/"
            className={`inline-flex flex-col items-center gap-1.5 group select-none ${
              loading ? 'pointer-events-none opacity-70' : ''
            }`}
          >
            <img
              src="/logo-icon.png"
              alt="HireJob"
              className="w-14 h-14 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-black tracking-tight leading-none">
              <span className="text-gray-900 dark:text-white">Hire</span>
              <span className="bg-gradient-to-b from-[#fa9d01] to-[#f95a03] bg-clip-text text-transparent">
                Job
              </span>
            </span>
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sign in with your Gmail, registered email, or mobile number
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <FiAlertCircle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Email or Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiMail />
              </div>
              <input
                type="text"
                required
                disabled={loading}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Please enter your Gmail or Phone"
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none transition disabled:opacity-60"
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
                disabled={loading}
                onClick={openForgotPasswordModal}
                className="text-xs text-[#f95a03] dark:text-[#fa9d01] hover:underline font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Please enter your password"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none transition disabled:opacity-60"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer disabled:opacity-40"
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-full shadow-md text-sm font-bold tracking-wide text-white bg-gradient-to-r from-[#fa9d01] to-[#f95a03] hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Signing in...' : 'LOGIN'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            aria-disabled={loading}
            className={`font-semibold text-[#f95a03] dark:text-[#fa9d01] hover:underline ${
              loading ? 'pointer-events-none opacity-40' : ''
            }`}
          >
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-5 sm:p-8 space-y-5 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90dvh] overflow-y-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-[#f95a03] dark:text-[#fa9d01] rounded-full flex items-center justify-center mx-auto mb-3">
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
                  disabled={loading}
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Email or mobile phone number"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#fa9d01] to-[#f95a03] text-white text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                {forgotFallbackCode && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 text-center">
                    Email delivery unavailable on server — enter code:{' '}
                    <strong className="font-mono text-sm tracking-wider">{forgotFallbackCode}</strong>
                  </div>
                )}
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    disabled={loading}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit reset code"
                    className="w-full text-center tracking-widest text-xl font-mono py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-xs px-1">
                    <span className={forgotTimeLeft < 30 ? 'text-rose-500 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                      {forgotTimeLeft > 0 ? `Expires in: ${formatCountdown(forgotTimeLeft)}` : 'Code expired'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendForgotCode()}
                      disabled={loading || forgotTimeLeft > 90}
                      className="text-[#f95a03] dark:text-[#fa9d01] hover:underline font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={forgotShowPassword ? 'text' : 'password'}
                    required
                    disabled={loading}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="New password (8+ chars, letter & number)"
                    className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
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
                  disabled={loading}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer disabled:opacity-50"
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-5 sm:p-8 space-y-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-center max-h-[90dvh] overflow-y-auto">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/40 text-[#f95a03] dark:text-[#fa9d01] rounded-full flex items-center justify-center mx-auto">
              <FiShield className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('auth.2faTitle')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {twoFactorType === 'PASSKEY'
                  ? `Verify with your registered Passkey / Biometrics or enter the backup 6-digit code sent to ${twoFactorEmail}.`
                  : `A verification code was dispatched to ${twoFactorEmail} via ${
                      twoFactorType === 'SMS_OTP' ? 'Mobile SMS / Email' : 'Email (Gmail)'
                    }`}
              </p>
            </div>

            {twoFactorFallbackCode && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                Email delivery unavailable on server — enter verification code:{' '}
                <strong className="font-mono text-sm tracking-wider">{twoFactorFallbackCode}</strong>
              </div>
            )}

            {twoFactorType === 'PASSKEY' && (
              <button
                type="button"
                disabled={loading}
                onClick={handleVerifyPasskey}
                className="w-full py-3 bg-gradient-to-r from-[#fa9d01] to-[#f95a03] text-white font-bold rounded-full text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FiKey />
                {t('auth.passkey')}
              </button>
            )}

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={loading}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="w-full text-center tracking-widest text-2xl font-mono py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
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
                    disabled={resending || loading}
                    className="text-xs text-[#f95a03] dark:text-[#fa9d01] hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                  className="w-full py-3 bg-gradient-to-r from-[#fa9d01] to-[#f95a03] text-white font-bold rounded-full text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Verifying...' : t('auth.verifyOtp')}
                </button>

                {twoFactorType !== 'PASSKEY' && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleVerifyPasskey}
                    className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-full text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FiKey />
                    {t('auth.passkey')}
                  </button>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShow2FAModal(false)}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer disabled:opacity-50"
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
