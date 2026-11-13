import React from 'react';
import { Link } from 'react-router-dom';
import { useSavedServices } from '../../context/SavedServicesContext';
import { FiX, FiTrash2, FiPhone, FiExternalLink, FiBriefcase, FiHeart } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

export const SavedServicesDrawer: React.FC = () => {
  const { savedJobs, isDrawerOpen, closeDrawer, removeSaved, clearSaved } = useSavedServices();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col z-10 border-l border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <FiHeart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Remembered Services</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {savedJobs.length} {savedJobs.length === 1 ? 'service' : 'services'} saved
              </p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* List of Saved Services */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedJobs.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mx-auto">
                <FiBriefcase className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                No services remembered yet
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Click the heart icon on any service listing to save and compare workers before hiring!
              </p>
            </div>
          ) : (
            savedJobs.map((job) => (
              <div
                key={job.id}
                className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex flex-col gap-2.5 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mb-1">
                      {job.category || 'Service'}
                    </span>
                    <Link
                      to={`/jobs/${job.id}`}
                      onClick={closeDrawer}
                      className="block font-semibold text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                    >
                      {job.title}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      📍 {job.location || 'Sri Lanka'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeSaved(job.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                    title="Remove from saved"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Rate & Contact actions */}
                <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900 dark:text-white">
                    {job.salaryMax ? `Rs. ${job.salaryMax.toLocaleString()}` : 'Budget on Request'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {job.contactWhatsapp && (
                      <a
                        href={`https://wa.me/${job.contactWhatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded bg-emerald-500 text-white font-medium flex items-center gap-1 hover:bg-emerald-600 transition"
                      >
                        <FaWhatsapp className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </a>
                    )}
                    {job.contactPhone && (
                      <a
                        href={`tel:${job.contactPhone}`}
                        className="px-2 py-1 rounded bg-blue-600 text-white font-medium flex items-center gap-1 hover:bg-blue-700 transition"
                      >
                        <FiPhone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    )}
                    <Link
                      to={`/jobs/${job.id}`}
                      onClick={closeDrawer}
                      className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400"
                    >
                      <FiExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {savedJobs.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-850 flex items-center justify-between">
            <button
              onClick={clearSaved}
              className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
            <Link
              to="/jobs"
              onClick={closeDrawer}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Browse More Services
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedServicesDrawer;

