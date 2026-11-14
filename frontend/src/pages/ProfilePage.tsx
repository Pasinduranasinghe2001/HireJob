import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import type { ApiResponse, Review } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StarRating from '../components/common/StarRating';
import ReviewCard from '../components/reviews/ReviewCard';
import { FiUser, FiMail, FiPhone, FiShield, FiCheckCircle, FiAlertTriangle, FiKey, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user, toggleTwoFactor, verifyEmail, sendVerificationEmail } = useAuth();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [averageRating, setAverageRating] = useState<number>(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [twoFactorType, setTwoFactorType] = useState(user?.twoFactorType || 'SMS_OTP');
  const [updating2FA, setUpdating2FA] = useState(false);

  // Email verification modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfileData = async () => {
      try {
        const [profileRes, reviewsRes] = await Promise.all([
          api.get<ApiResponse<any>>(`/users/${user.id}/profile`),
          api.get<ApiResponse<Review[]>>(`/reviews/user/${user.id}`),
        ]);
        setAverageRating(profileRes.data.data?.averageRating || 0);
        setReviews(reviewsRes.data.data || []);
      } catch (err) {
        console.error('Failed to load profile feedback', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/me', { fullName, phone });
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle2FA = async (enable: boolean) => {
    setUpdating2FA(true);
    try {
      await toggleTwoFactor(enable, twoFactorType);
      setTwoFactorEnabled(enable);
      toast.success(enable ? '2FA security enabled!' : '2FA disabled');
    } catch {
      toast.error('Failed to update 2FA settings');
    } finally {
      setUpdating2FA(false);
    }
  };

  const handleSendVerification = async () => {
    if (!user?.email) return;
    setSendingEmail(true);
    try {
      await sendVerificationEmail(user.email);
      toast.success('Verification code sent to ' + user.email);
      setShowEmailModal(true);
    } catch {
      toast.error('Failed to send verification code');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleConfirmVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (!verifyCode.trim()) {
      toast.error('Please enter the verification code sent to your email');
      return;
    }
    try {
      await verifyEmail(user.email, verifyCode.trim());
      toast.success('Email verified successfully!');
      setShowEmailModal(false);
    } catch {
      toast.error('Invalid verification code. Please check again.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
      toast.error('New password must contain at least one letter and one number');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/users/me/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-24" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
          {t('nav.profile')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal details, contact numbers, and account security
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl font-bold mx-auto">
            {user?.fullName?.charAt(0).toUpperCase() || <FiUser />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{user?.fullName}</h2>
            <p className="text-xs text-gray-400">{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800">
              {user?.role}
            </span>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col items-center">
            <span className="text-xs text-gray-400 font-semibold uppercase">Reputation</span>
            <div className="flex items-center gap-1.5 mt-1">
              <StarRating rating={Math.round(averageRating)} size={16} />
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{averageRating.toFixed(1)} / 5</span>
            </div>
            <span className="text-xs text-gray-400 mt-1">({reviews.length} reviews received)</span>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Personal Contact Information</h3>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Full Name
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
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Email Address
                </label>
                {user?.emailVerified ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <FiCheckCircle /> Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={sendingEmail}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                  >
                    <FiAlertTriangle /> {sendingEmail ? 'Sending...' : 'Verify Now'}
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiMail />
                </div>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Phone Number (Used for Direct Client Inquiries)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiPhone />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="077 123 4567"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>

      {/* Two-Factor Authentication Security Card */}
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FiShield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Protect your account by requiring an OTP code or passkey each time you sign in
              </p>
            </div>
          </div>

          <button
            onClick={() => handleToggle2FA(!twoFactorEnabled)}
            disabled={updating2FA}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              twoFactorEnabled
                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>

        {twoFactorEnabled && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'SMS_OTP', label: 'Mobile SMS OTP', icon: FiPhone },
              { id: 'EMAIL_OTP', label: 'Email Code OTP', icon: FiMail },
              { id: 'PASSKEY', label: 'Biometric Passkey', icon: FiKey },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setTwoFactorType(m.id);
                    toggleTwoFactor(true, m.id);
                  }}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition ${
                    twoFactorType === m.id
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Icon />
                  <span>{m.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FiLock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Change Account Password</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              For security, enter your current password before setting a new one
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Current Password
              </label>
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                {showCurrentPassword ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                <span>{showCurrentPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiLock />
              </div>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  {showNewPassword ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                  <span>{showNewPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiLock />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 letter & 1 number"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiLock />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {changingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Reviews Received */}
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Reviews & Ratings Received</h3>
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">You have not received any reviews yet.</p>
        )}
      </div>

      {/* Email Verification Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <FiCheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verify Your Email</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter the 6-digit code sent to <strong className="text-gray-800 dark:text-gray-200">{user?.email}</strong>
              </p>
            </div>

            <form onSubmit={handleConfirmVerification} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center tracking-widest text-2xl font-mono py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 py-2.5 border rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
