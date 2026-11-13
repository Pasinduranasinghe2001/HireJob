import React from 'react';
import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';

const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-4">
            <Link to="/" className="inline-block group">
              <img
                src="/logo.png"
                alt="HireJob Logo"
                className="h-10 w-auto max-w-[160px] object-contain group-hover:scale-105 transition-transform"
              />
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The premier marketplace connecting service providers, temporary gigs, and permanent job opportunities with clients across Sri Lanka.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wider uppercase mb-4">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/jobs" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Search Services</Link>
              </li>
              <li>
                <Link to="/jobs?type=TEMPORARY" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Temporary Gigs</Link>
              </li>
              <li>
                <Link to="/jobs?type=PERMANENT" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Permanent Roles</Link>
              </li>
              <li>
                <Link to="/post-job" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Post a Service</Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wider uppercase mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">Technology & IT</span></li>
              <li><span className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">Home & Construction</span></li>
              <li><span className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">Design & Creative</span></li>
              <li><span className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">Logistics & Delivery</span></li>
            </ul>
          </div>

          {/* Platform highlights */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wider uppercase mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-500 dark:text-gray-400">Trilingual Support (SI, TA, EN)</span></li>
              <li><span className="text-gray-500 dark:text-gray-400">Direct WhatsApp & Calling</span></li>
              <li><span className="text-gray-500 dark:text-gray-400">2FA Security & Verification</span></li>
              <li><span className="text-gray-500 dark:text-gray-400">Priority Boost Monetization</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400">
          <p>© {CURRENT_YEAR} HireJob Inc. All rights reserved.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Built with modern technology and <FiHeart className="text-red-500 w-3 h-3" /> in Sri Lanka
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

