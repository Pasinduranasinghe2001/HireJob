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
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
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

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ROLE_POSTER' | 'ROLE_CLIENT'>('ROLE_POSTER');
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Step 2: Mandatory pre-creation Gmail OTP verification gate (120 seconds / 2 mins)
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verifyCode, setVerifyCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [resending, setResending] = useState(false);

  const emailSuggestion = suggestEmailFix(email);
  const hasMinLen = password.length >= 8;
  const hasLetterAndDigit = /(?=.*[A-Za-z])(?=.*\d)/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (step !== 'verify' || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const buildPayload = (otpCode?: string) => ({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password,
    phone: normalizeLkPhone(phone),
    role,
    ...(otpCode ? { otpCode } : {}),
  });

  const handleRequestRegistrationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Please enter your full name (minimum 2 characters)');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmailFormat(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. name@gmail.com)');
      toast.error('Invalid email format. Please check your Gmail address.');
      return;
    }

    if (emailSuggestion) {
      setError(`Did you mean ${emailSuggestion}? Please fix the email typo before verifying.`);
      return;
    }

    if (!isValidLkPhone(phone)) {
      setError('Please enter a valid Sri Lankan mobile number (e.g. 771234567 or 0771234567)');
      return;
    }

    if (!hasMinLen || !hasLetterAndDigit) {
      setError('Password must be at least 8 characters and include at least 1 letter and 1 number');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptedTerms) {
      setError('Please agree to the Terms of Use and Privacy Policy to continue');
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
      const msg = extractApiError(err, 'Could not send verification email. Please check your inputs.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreateAccount = async (e: React.FormEvent) => {
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
      toast.success('Email verified and account created! Welcome to HireJob.');
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
      toast.success(`Signed in with Google as ${res.user?.fullName || 'Google user'}!`);
      navigate('/dashboard', { replace: true });
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
      <div className="max-w-md w-full space-y-5 bg-white dark:bg-gray-800 p-7 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        {step === 'form' ? (
          <>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign up</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  Log in Now
                </Link>
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300">
                💡 <strong>Service Seekers:</strong> Browsing and contacting providers is 100% free without an account. Register to post services or manage saved jobs.
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <FiAlertCircle className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleRequestRegistrationOtp}>
              {/* Account Purpose Selector */}
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

              {/* Full Name */}
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

              {/* Gmail / Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Gmail / Email Address *
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
                    className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  />
                </div>
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

              {/* Mobile Phone with LK +94 prefix (Daraz style) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Mobile Number (WhatsApp / Calls) *
                </label>
                <div className="flex gap-2">
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center shrink-0 select-none">
                    🇱🇰 +94
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FiPhone />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="77 123 4567"
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    {showPassword ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
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
                    placeholder="At least 8 chars, letters & numbers"
                    className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  />
                </div>
                {/* Live password checklist */}
                {password.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[11px]">
                    <span className={`flex items-center gap-1 ${hasMinLen ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                      <FiCheck className="w-3 h-3" /> 8+ characters
                    </span>
                    <span className={`flex items-center gap-1 ${hasLetterAndDigit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                      <FiCheck className="w-3 h-3" /> Letter &amp; number
                    </span>
                    {confirmPassword.length > 0 && (
                      <span className={`flex items-center gap-1 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        <FiCheck className="w-3 h-3" /> {passwordsMatch ? 'Passwords match' : 'Mismatch'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiLock />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Terms Checkbox (Daraz style) */}
              <label className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>
                  By creating and/or using your account, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Terms of Use
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Sending Verification Code...' : 'Send Verification Code to Gmail'}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-gray-200 dark:border-gray-700" />
              <span className="shrink mx-4 text-xs text-gray-400 uppercase font-semibold">
                Or, sign up with
              </span>
              <div className="grow border-t border-gray-200 dark:border-gray-700" />
            </div>

            {/* Official Google Sign-Up (uses real browser Gmail accounts) */}
            <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" disabled={loading} />
          </>
        ) : (
          /* STEP 2: Mandatory Gmail OTP Verification before account completes */
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <FiCheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verify Your Gmail</h3>
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

            <form onSubmit={handleVerifyAndCreateAccount} className="space-y-4">
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

                {/* 2-minute reducing countdown timer & resend option */}
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
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
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
                <span>Wrong Gmail or phone? Edit registration details</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Terms & Privacy Summary Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Terms of Use & Privacy Policy</h3>
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
              <p>1. Provide accurate contact information (Gmail and Sri Lankan mobile number) so clients can reach you genuinely.</p>
              <p>2. Spam, misleading service ads, or fraudulent listings will be removed by HireJob moderators.</p>
              <p>3. Your email and password are protected with BCrypt hashing and encrypted HTTPS transport. Public contact details on service posts are displayed only as entered when creating listings.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
