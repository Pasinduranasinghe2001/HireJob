import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import GoogleSignInButton from '../components/common/GoogleSignInButton';
import {
  extractApiError,
  formatCountdown,
  isValidEmailFormat,
  isValidLkPhone,
  normalizeLkPhone,
  suggestEmailFix,
} from '../utils/authHelpers';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiMail,
  FiPhone,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Phase 1: Email verification before details are entered
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [resending, setResending] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // Phase 2: Account details after email is verified
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const busy = loading || resending;
  const normalizedEmail = email.trim().toLowerCase();
  const emailSuggestion = suggestEmailFix(email);
  const hasMinLen = password.length >= 8;
  const hasLetterAndDigit = /(?=.*[A-Za-z])(?=.*\d)/.test(password);
  const resolvedFullName =
    accountType === 'business'
      ? businessName.trim()
      : `${firstName.trim()} ${lastName.trim()}`.trim();

  const isDetailsReady =
    resolvedFullName.length >= 2 &&
    isValidLkPhone(phone) &&
    hasMinLen &&
    hasLetterAndDigit;

  useEffect(() => {
    if (!otpSent || emailVerified || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpSent, emailVerified, timeLeft]);

  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (busy) return;
    setError(null);

    if (!isValidEmailFormat(normalizedEmail)) {
      setError('Please enter a valid Gmail or email address (e.g. name@gmail.com)');
      toast.error('Invalid email format');
      return;
    }

    if (emailSuggestion) {
      setError(`Did you mean ${emailSuggestion}? Please fix the email typo before continuing.`);
      return;
    }

    setLoading(true);
    try {
      await authService.sendPreRegistrationEmailOtp(normalizedEmail);
      setTimeLeft(120);
      setVerifyCode('');
      setOtpSent(true);
      toast.success(`6-digit verification code sent to ${normalizedEmail}`);
    } catch (err: any) {
      const msg = extractApiError(err, 'Could not send verification email. Please check your address.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (busy || timeLeft > 90) return;
    setResending(true);
    setError(null);
    try {
      await authService.sendPreRegistrationEmailOtp(normalizedEmail);
      setTimeLeft(120);
      setVerifyCode('');
      toast.success(`New verification code sent to ${normalizedEmail}. Use the new code.`);
    } catch (err: any) {
      const msg = extractApiError(err, 'Failed to resend verification code');
      setError(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (verifyCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    if (timeLeft <= 0) {
      setError('Verification code has expired. Please click Resend Code to get a valid new code.');
      return;
    }

    setLoading(true);
    try {
      await authService.verifyPreRegistrationEmailOtp(normalizedEmail, verifyCode.trim());
      setEmailVerified(true);
      toast.success('Email verified! Now complete your account details.');
    } catch (err: any) {
      const msg = extractApiError(err, 'Invalid or expired verification code');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (accountType === 'personal') {
      if (firstName.trim().length < 2) {
        setError('Please enter your first name');
        return;
      }
      if (lastName.trim().length < 1) {
        setError('Please enter your last name');
        return;
      }
    } else if (businessName.trim().length < 2) {
      setError('Please enter your business name');
      return;
    }

    if (!isValidLkPhone(phone)) {
      setError('Please enter a valid mobile phone number (e.g. 077 123 4567)');
      return;
    }

    if (!hasMinLen || !hasLetterAndDigit) {
      setError('Password must be at least 8 characters and include a letter and a number');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: resolvedFullName,
        email: normalizedEmail,
        password,
        phone: normalizeLkPhone(phone),
        role: 'ROLE_POSTER',
      });
      toast.success('Account created successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = extractApiError(err, 'Could not create account. Please try again.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    if (busy) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogle(credential);
      toast.success(`Signed in as ${res.user?.fullName || 'Google user'}!`);
      navigate(res.user?.role === 'ROLE_ADMIN' ? '/admin' : '/dashboard', { replace: true });
    } catch (err: any) {
      const msg = extractApiError(err, 'Google sign-up failed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetEmailStep = () => {
    if (busy) return;
    setOtpSent(false);
    setEmailVerified(false);
    setVerifyCode('');
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-7 sm:p-9 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
        {/* Top Brand + Heading */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              className={`inline-flex items-center gap-2 select-none ${
                busy ? 'pointer-events-none opacity-70' : ''
              }`}
            >
              <img
                src="/logo-icon.png"
                alt="HireJob"
                className="w-9 h-9 object-contain drop-shadow-sm"
              />
              <span className="text-xl font-black tracking-tight leading-none">
                <span className="text-gray-900 dark:text-white">Hire</span>
                <span className="bg-gradient-to-b from-[#fa9d01] to-[#f95a03] bg-clip-text text-transparent">
                  Job
                </span>
              </span>
            </Link>

            <Link
              to="/login"
              aria-disabled={busy}
              className={`text-xs font-semibold text-[#f95a03] dark:text-[#fa9d01] hover:underline shrink-0 ${
                busy ? 'pointer-events-none opacity-40' : ''
              }`}
            >
              Sign in
            </Link>
          </div>

          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-gray-900 dark:text-white">
              Create an account
            </h1>
            <span className="text-[11px] font-semibold text-gray-400">
              {emailVerified ? 'Step 2 of 2' : 'Step 1 of 2'}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs sm:text-sm text-red-700 dark:text-red-300">
            <FiAlertCircle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PHASE 1: Check & Verify Email via OTP first */}
        {!emailVerified ? (
          <div className="space-y-4">
            <form onSubmit={handleSendEmailOtp} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Gmail / Email Address
                  </label>
                  {otpSent && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={resetEmailStep}
                      className="text-xs font-semibold text-[#f95a03] dark:text-[#fa9d01] hover:underline cursor-pointer disabled:opacity-40"
                    >
                      Change email
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiMail />
                  </div>
                  <input
                    type="email"
                    required
                    disabled={busy || otpSent}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your Gmail or email address"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition disabled:opacity-60"
                  />
                </div>
                {!otpSent && emailSuggestion && (
                  <button
                    type="button"
                    onClick={() => setEmail(emailSuggestion)}
                    className="mt-1 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer"
                  >
                    Did you mean <strong>{emailSuggestion}</strong>? Click to fix
                  </button>
                )}
              </div>

              {!otpSent && (
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 px-4 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#fa9d01] to-[#f95a03] hover:brightness-105 shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Sending Verification Code...' : 'Send Verification Code'}
                </button>
              )}
            </form>

            {otpSent && (
              <form onSubmit={handleVerifyEmailOtp} className="space-y-4 pt-1">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                  We sent a 6-digit OTP code to <strong>{normalizedEmail}</strong>. Enter it below to verify your email.
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    disabled={busy}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
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
                      <span>{timeLeft > 0 ? `Code expires in: ${formatCountdown(timeLeft)}` : 'Code expired'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={busy || timeLeft > 90}
                      className="text-xs text-[#f95a03] dark:text-[#fa9d01] hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiRefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                      <span>{resending ? 'Sending...' : timeLeft > 90 ? `Resend in ${timeLeft - 90}s` : 'Resend Code'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy || timeLeft <= 0 || verifyCode.length !== 6}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Verifying Email...' : 'Verify Email'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* PHASE 2: Verified Email -> Enter Details & Create Account */
          <form className="space-y-3.5" onSubmit={handleCreateAccount}>
            <div className="p-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                <FiCheckCircle className="shrink-0 w-4 h-4" />
                <span className="truncate">{normalizedEmail}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={resetEmailStep}
                className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 underline ml-2 shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Account Type Toggle */}
            <div className="grid grid-cols-2 p-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setAccountType('personal');
                  setError(null);
                }}
                className={`py-2 text-xs sm:text-sm font-bold rounded-full transition cursor-pointer ${
                  accountType === 'personal'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setAccountType('business');
                  setError(null);
                }}
                className={`py-2 text-xs sm:text-sm font-bold rounded-full transition cursor-pointer ${
                  accountType === 'business'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Business
              </button>
            </div>

            {accountType === 'personal' ? (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  disabled={busy}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
                <input
                  type="text"
                  required
                  disabled={busy}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
              </div>
            ) : (
              <input
                type="text"
                required
                disabled={busy}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Business name"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
              />
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiPhone />
              </div>
              <input
                type="tel"
                required
                disabled={busy}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile phone (e.g. 077 123 4567)"
                className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
              />
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={busy}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-4 text-[11px] px-1">
                  <span className={`flex items-center gap-1 ${hasMinLen ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                    <FiCheck className="w-3 h-3" /> 8+ characters
                  </span>
                  <span className={`flex items-center gap-1 ${hasLetterAndDigit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                    <FiCheck className="w-3 h-3" /> 1 letter &amp; 1 number
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 pt-1">
              By selecting <strong>{accountType === 'personal' ? 'Create personal account' : 'Create business account'}</strong>, you agree to our{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-[#f95a03] dark:text-[#fa9d01] underline cursor-pointer"
              >
                User Agreement
              </button>{' '}
              and acknowledge reading our{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-[#f95a03] dark:text-[#fa9d01] underline cursor-pointer"
              >
                User Privacy Notice
              </button>
              .
            </p>

            <button
              type="submit"
              disabled={busy}
              className={`w-full py-3 px-4 rounded-full text-sm font-bold transition cursor-pointer ${
                isDetailsReady
                  ? 'bg-gradient-to-r from-[#fa9d01] to-[#f95a03] text-white shadow-md hover:brightness-105'
                  : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
              } disabled:opacity-50`}
            >
              {loading
                ? 'Creating Account...'
                : accountType === 'personal'
                  ? 'Create personal account'
                  : 'Create business account'}
            </button>
          </form>
        )}

        <div className="relative flex py-1 items-center">
          <div className="grow border-t border-gray-200 dark:border-gray-700" />
          <span className="shrink mx-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
            or continue with
          </span>
          <div className="grow border-t border-gray-200 dark:border-gray-700" />
        </div>

        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          text="signup_with"
          label="Continue with Google"
          disabled={busy}
        />
      </div>

      {/* Terms & Privacy Summary Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">User Agreement & Privacy Notice</h3>
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
              <p>1. Only verified registered accounts may publish job or service postings on HireJob Sri Lanka. All visitors can freely browse and inspect public service posts.</p>
              <p>2. Spam, misleading pricing, or harmful content will be flagged and removed by our company team.</p>
              <p>3. Passwords are protected using BCrypt hashing and are never visible even to company administrators.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-[#fa9d01] to-[#f95a03] text-white font-semibold rounded-full text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
