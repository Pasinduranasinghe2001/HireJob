import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FiX, FiUserPlus, FiCheck } from 'react-icons/fi';

export interface GoogleSelectedAccount {
  email: string;
  fullName: string;
  avatarUrl?: string;
  googleId: string;
}

interface GoogleAccountChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: GoogleSelectedAccount) => void;
  currentEmailHint?: string;
}

export const GoogleAccountChooserModal: React.FC<GoogleAccountChooserModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  currentEmailHint = '',
}) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState('');

  if (!isOpen) return null;

  // Suggested demo Google accounts
  const defaultAccounts: GoogleSelectedAccount[] = [
    {
      email: currentEmailHint && currentEmailHint.includes('@') ? currentEmailHint : 'kasun.serviceprovider@gmail.com',
      fullName: 'Kasun Bandara (Service Provider)',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      googleId: 'g_kasun_109823',
    },
    {
      email: 'priyantha.client@gmail.com',
      fullName: 'Priyantha Silva (Client / Seeker)',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
      googleId: 'g_priyantha_94812',
    },
  ];

  const handleSelect = (acc: GoogleSelectedAccount) => {
    onSelectAccount(acc);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      setCustomError('Please enter a valid Gmail address');
      return;
    }
    const name = customName.trim() || customEmail.split('@')[0];
    onSelectAccount({
      email: customEmail.trim(),
      fullName: name,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
      googleId: 'g_' + Math.random().toString(36).substring(2, 12),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden text-left transition-colors">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Google Header */}
        <div className="p-6 pb-4 text-center border-b border-gray-100 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700/50 mb-3 shadow-inner">
            <FcGoogle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose an account</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            to continue to <strong className="text-blue-600 dark:text-blue-400">HireJob Sri Lanka</strong>
          </p>
        </div>

        {/* Accounts List */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {defaultAccounts.map((account) => (
            <button
              key={account.email}
              onClick={() => handleSelect(account)}
              className="w-full p-3.5 flex items-center gap-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/60 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition text-left cursor-pointer group"
            >
              <img
                src={account.avatarUrl}
                alt={account.fullName}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600 group-hover:scale-105 transition"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {account.fullName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{account.email}</p>
              </div>
              <FiCheck className="w-4 h-4 text-transparent group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
            </button>
          ))}

          {/* Use another account option */}
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full p-3.5 flex items-center gap-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/60 border border-dashed border-gray-200 dark:border-gray-600 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                <FiUserPlus className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Use another Gmail account
                </p>
                <p className="text-xs text-gray-400">Enter custom Gmail & name</p>
              </div>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="p-4 bg-gray-50 dark:bg-gray-750/50 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Enter Gmail Account Details
              </h4>
              {customError && (
                <p className="text-xs text-red-500 font-medium">{customError}</p>
              )}
              <input
                type="email"
                required
                placeholder="your.email@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Full Name (e.g. Kasun Silva)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Continue with this Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-700 text-center">
          <p className="text-[11px] text-gray-400">
            To continue, Google will share your name, email address, and profile picture with HireJob.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleAccountChooserModal;

