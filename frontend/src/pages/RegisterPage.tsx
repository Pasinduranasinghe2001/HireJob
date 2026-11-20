import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import GoogleSignInButton from '../components/common/GoogleSignInButton';
import {
  extractApiError,
  formatCountdown,
  isValidEmailFormat,
  suggestEmailFix,
} from '../utils/authHelpers';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiArrowLeft,
  FiCheck,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Matching uploaded modern eBay/global marketplace style: Personal | Business pill switch
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Step 2: Mandatory Gmail OTP verification before account creation completes (2:00 / 120s)
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verifyCode, setVerifyCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [resending, setResending] = useState(false);

  const emailSuggestion = suggestEmailFix(email);
  const hasMinLen = password.length >= 8;
  const hasLetterAndDigit = /(?=.*[A-Za-z])(?=.*\d)/.test(password);
  const resolvedFullName =
    accountType === 'business'
      ? businessName.trim()
      : `${firstName.trim()} ${lastName.trim()}`.trim();
  const isFormReady =
    resolvedFullName.length >= 2 &&
    isValidEmailFormat(email) &&
    !emailSuggestion &&
    hasMinLen &&
    hasLetterAndDigit;

  useEffect(() => {
    if (step !== 'verify' || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const buildPayload = (otpCode?: string) => ({
    fullName: resolvedFullName,
    email: email.trim().toLowerCase(),
    password,
    phone: '',
    // Registered users can browse and post job/service listings; anonymous visitors can only browse
    role: 'ROLE_POSTER' as const,
    ...(otpCode ? { otpCode } : {}),
  });

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
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

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmailFormat(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. name@gmail.com)');
      toast.error('Invalid email format. Please check your email.');
      return;
    }

    if (emailSuggestion) {
      setError(`Did you mean ${emailSuggestion}? Please fix the email typo before continuing.`);
      return;
    }

    if (!hasMinLen || !hasLetterAndDigit) {
      setError('Password must be at least 8 characters and include a letter and a number');
      return;
    }

    setLoading(true);
    try {
      await authService.sendRegistrationOtp(buildPayload());
      setTimeLeft(120);
      setVerifyCode('');
      setStep('verify');
      toast.success(`6-digit verification code sent to ${trimmedEmail}`);
    } catch (err: any) {
      const msg = extractApiError(err, 'Could not send verification email. Please check your details.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (verifyCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your Gmail');
      return;
    }
    if (timeLeft <= 0) {
      setError('Verification code has expired. Please click Resend Code.');
      return;
    }

    setLoading(true);
    try {
      await register(buildPayload(verifyCode.trim()));
      toast.success('Email verified and account created! You can now post services.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = extractApiError(err, 'Invalid or expired verification code');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resending || timeLeft > 90) return;
    setResending(true);
    setError(null);
    try {
      await authService.sendRegistrationOtp(buildPayload());
      setTimeLeft(120);
      setVerifyCode('');
      toast.success(`A new verification code was sent to ${email.trim().toLowerCase()}`);
    } catch (err: any) {
      const msg = extractApiError(err, 'Failed to resend code');
      setError(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
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

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-7 sm:p-9 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
        {step === 'form' ? (
          <>
            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-2">
                <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-gray-900 dark:text-white">
                  Create an account
                </h1>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                >
                  Sign in
                </Link>
              </div>

              {/* Clean Segmented Pill Toggle (Personal | Business — modeled on uploaded design) */}
              <div className="grid grid-cols-2 p-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
                <button
                  type="button"
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
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs sm:text-sm text-red-700 dark:text-red-300">
                <FiAlertCircle className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-3.5" onSubmit={handleRequestOtp}>
              {accountType === 'personal' ? (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                  />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business name"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                />
              )}

              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                />
                {emailSuggestion && (
                  <button
                    type="button"
                    onClick={() => setEmail(emailSuggestion)}
                    className="mt-1 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer"
                  >
                    Did you mean <strong>{emailSuggestion}</strong>? Click to fix
                  </button>
                )}
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                  />
                  <button
                    type="button"
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
                  className="text-blue-600 dark:text-blue-400 underline cursor-pointer"
                >
                  User Agreement
                </button>{' '}
                and acknowledge reading our{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-blue-600 dark:text-blue-400 underline cursor-pointer"
                >
                  User Privacy Notice
                </button>
                .
              </p>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-full text-sm font-bold transition cursor-pointer ${
                  isFormReady
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                    : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                } disabled:opacity-50`}
              >
                {loading
                  ? 'Sending Verification Code...'
                  : accountType === 'personal'
                    ? 'Create personal account'
                    : 'Create business account'}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-gray-200 dark:border-gray-700" />
              <span className="shrink mx-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                or continue with
              </span>
              <div className="grow border-t border-gray-200 dark:border-gray-700" />
            </div>

            {/* Clean Google pill button using real browser Gmail accounts */}
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              text="signup_with"
              label="Continue with Google"
              disabled={loading}
            />

            <p className="text-center text-[11px] text-gray-500 dark:text-gray-400 pt-1">
              Browsing jobs and viewing service posts is free for everyone — sign up to post your own services.
            </p>
          </>
        ) : (
          /* STEP 2: Mandatory Gmail OTP Verification before account completes */
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <FiCheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verify Your Email</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                We sent a 6-digit verification code to{' '}
                <strong className="text-gray-800 dark:text-gray-200">{email.trim().toLowerCase()}</strong>.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300 text-left">
                <FiAlertCircle className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAndCreate} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
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
                    onClick={handleResendCode}
                    disabled={resending || timeLeft > 90}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiRefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                    <span>{resending ? 'Sending...' : timeLeft > 90 ? `Resend in ${timeLeft - 90}s` : 'Resend Code'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || timeLeft <= 0 || verifyCode.length !== 6}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating Verified Account...' : 'Verify & Create Account'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError(null);
                }}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                <span>Wrong email? Edit registration details</span>
              </button>
            </form>
          </div>
        )}
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
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full text-xs cursor-pointer"
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
