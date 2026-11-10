import React from 'react';
import { Link } from 'react-router-dom';
import { FiBriefcase, FiHeart } from 'react-icons/fi';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 text-gray-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <FiBriefcase className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-gray-900">HireJob</span>
            </div>
            <p className="text-sm text-gray-500">
              The premier marketplace connecting service providers, temporary gigs, and permanent job opportunities with clients worldwide.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/jobs" className="hover:text-blue-600 transition">Search Jobs</Link>
              </li>
              <li>
                <Link to="/jobs?type=TEMPORARY" className="hover:text-blue-600 transition">Temporary Gigs</Link>
              </li>
              <li>
                <Link to="/jobs?type=PERMANENT" className="hover:text-blue-600 transition">Permanent Roles</Link>
              </li>
              <li>
                <Link to="/post-job" className="hover:text-blue-600 transition">Post an Opportunity</Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-500 hover:text-gray-700 cursor-pointer">Technology & IT</span></li>
              <li><span className="text-gray-500 hover:text-gray-700 cursor-pointer">Home & Construction</span></li>
              <li><span className="text-gray-500 hover:text-gray-700 cursor-pointer">Design & Creative</span></li>
              <li><span className="text-gray-500 hover:text-gray-700 cursor-pointer">Logistics & Delivery</span></li>
            </ul>
          </div>

          {/* Platform highlights */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-500">Location-based Matching</span></li>
              <li><span className="text-gray-500">Verified Client Reviews</span></li>
              <li><span className="text-gray-500">AI Smart Recommendations</span></li>
              <li><span className="text-gray-500">Secure Direct Contact</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400">
          <p>© {new Date().getFullYear()} HireJob Inc. All rights reserved.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Built with modern technology and <FiHeart className="text-red-500 w-3 h-3" />
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
