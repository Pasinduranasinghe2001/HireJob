import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useSavedServices } from '../../context/SavedServicesContext';
import SavedServicesDrawer from '../common/SavedServicesDrawer';
import {
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiPlusCircle,
  FiSun,
  FiMoon,
  FiGlobe,
  FiShield,
  FiHeart,
} from 'react-icons/fi';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { savedJobs, openDrawer } = useSavedServices();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'si', label: 'සිංහල', flag: '🇱🇰' },
    { code: 'ta', label: 'தமிழ்', flag: '🇱🇰' },
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="HireJob Logo"
                className="h-10 w-auto max-w-[140px] sm:max-w-[170px] object-contain group-hover:scale-105 transition-transform"
              />
            </Link>
            <div className="hidden md:flex ml-10 space-x-6">
              <Link
                to="/"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm transition"
              >
                {t('nav.home')}
              </Link>
              <Link
                to="/jobs"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm transition"
              >
                {t('nav.jobs')}
              </Link>
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm transition"
                >
                  {t('nav.dashboard')}
                </Link>
              )}
              {isAuthenticated && user?.role === 'ROLE_ADMIN' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 font-semibold text-sm transition"
                >
                  <FiShield className="w-4 h-4" />
                  {t('nav.admin')}
                </Link>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition cursor-pointer"
                title={t('lang.select')}
              >
                <FiGlobe className="w-3.5 h-3.5 text-blue-500" />
                <span>{currentLangObj.flag} {currentLangObj.label}</span>
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                        language === l.code ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Saved / Remembered Services Cart Drawer Button */}
            <button
              onClick={openDrawer}
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer flex items-center gap-1.5"
              title="Saved / Remembered Services"
            >
              <FiHeart className={`w-4 h-4 ${savedJobs.length > 0 ? 'text-rose-500 fill-current' : ''}`} />
              <span className="hidden lg:inline text-xs font-semibold text-gray-700 dark:text-gray-200">Saved</span>
              {savedJobs.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {savedJobs.length}
                </span>
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer"
              title={t('theme.toggle')}
            >
              {theme === 'dark' ? (
                <FiSun className="w-4 h-4 text-amber-400" />
              ) : (
                <FiMoon className="w-4 h-4 text-gray-600" />
              )}
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  to="/post-job"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                >
                  <FiPlusCircle className="w-4 h-4" />
                  {t('nav.postJob')}
                </Link>
                <div className="flex items-center gap-3 pl-2 border-l border-gray-200 dark:border-gray-700">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs border border-blue-200 dark:border-blue-700">
                      {user?.fullName?.charAt(0).toUpperCase() || <FiUser />}
                    </div>
                    <span>{user?.fullName}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                    title={t('nav.logout')}
                  >
                    <FiLogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                >
                  {t('nav.getStarted')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={openDrawer}
              className="p-2 text-gray-600 dark:text-gray-300 relative"
              title="Saved Services"
            >
              <FiHeart className={`w-5 h-5 ${savedJobs.length > 0 ? 'text-rose-500 fill-current' : ''}`} />
              {savedJobs.length > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {savedJobs.length}
                </span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300"
              title={t('theme.toggle')}
            >
              {theme === 'dark' ? <FiSun className="w-5 h-5 text-amber-400" /> : <FiMoon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-500 dark:text-gray-300 hover:text-gray-700"
            >
              {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Global Saved Services Drawer */}
      <SavedServicesDrawer />

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 px-4 pt-2 pb-4 space-y-2 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{t('lang.select')}:</span>
            <div className="flex gap-1">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2 py-1 text-xs rounded-md ${
                    language === l.code ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/jobs"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
          >
            {t('nav.jobs')}
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
              >
                {t('nav.dashboard')}
              </Link>
              {user?.role === 'ROLE_ADMIN' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 rounded-md"
                >
                  {t('nav.admin')}
                </Link>
              )}
              <Link
                to="/post-job"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50 rounded-md"
              >
                + {t('nav.postJob')}
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 rounded-md"
              >
                {t('nav.profile')} ({user?.fullName})
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                {t('nav.signIn')}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg"
              >
                {t('nav.getStarted')}
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
