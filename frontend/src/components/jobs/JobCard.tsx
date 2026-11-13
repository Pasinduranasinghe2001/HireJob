import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiCalendar, FiUser, FiPhone, FiZap, FiClock, FiHeart } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import type { Job } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useSavedServices } from '../../context/SavedServicesContext';
import ImageCarousel from '../common/ImageCarousel';
import PriorityBoostModal from './PriorityBoostModal';

interface JobCardProps {
  job: Job;
  onRefresh?: () => void;
}

function computeDaysLeft(expiresAt: string): number {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export const JobCard: React.FC<JobCardProps> = ({ job, onRefresh }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const { isSaved, toggleSave } = useSavedServices();
  const saved = isSaved(job.id);

  const isTemporary = job.jobType === 'TEMPORARY';
  const isOwner = user?.id === job.postedBy?.id;

  const phone = job.contactPhone || job.postedBy?.phone || '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const whatsappNumber = job.contactWhatsapp ? job.contactWhatsapp.replace(/[^0-9]/g, '') : cleanPhone;

  // Calculate days remaining
  let expiryText = t('job.unlimited');
  if (job.expiresAt) {
    const daysLeft = computeDaysLeft(job.expiresAt);
    if (daysLeft > 0) {
      expiryText = `${t('job.expiresIn')} ${daysLeft} ${t('job.days')}`;
    } else {
      expiryText = 'Expired';
    }
  }

  const hasImages = (job.imageUrls && job.imageUrls.length > 0) || Boolean(job.imageUrl);

  return (
    <>
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between group relative ${
          job.isPriority
            ? 'border-amber-400 dark:border-amber-500 shadow-md ring-1 ring-amber-400/40'
            : 'border-gray-100 dark:border-gray-700 shadow-xs hover:shadow-md'
        }`}
      >
        <div>
          {/* Priority banner */}
          {job.isPriority && (
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FiZap className="w-3 h-3 fill-current" />
                {t('job.featured')}
              </span>
              <span>⭐ TOP RATED</span>
            </div>
          )}

          {/* Image Carousel (Swaps automatically one by one) */}
          {hasImages ? (
            <div className="relative">
              <ImageCarousel
                images={job.imageUrls}
                singleImageUrl={job.imageUrl}
                alt={job.title}
                className="h-44 w-full"
                autoPlayInterval={3500}
              />
              {/* Remember / Save heart button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSave(job);
                }}
                className={`absolute top-2.5 left-2.5 z-20 p-2 rounded-full backdrop-blur-xs transition shadow-sm cursor-pointer ${
                  saved
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 hover:text-rose-500'
                }`}
                title={saved ? 'Remove from remembered services' : 'Remember this service (Add to saved)'}
              >
                <FiHeart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className={`h-2.5 bg-gradient-to-r ${job.isPriority ? 'from-amber-400 to-yellow-500' : 'from-blue-500 to-indigo-500'}`} />
              {/* Remember / Save heart button for posts without images */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSave(job);
                }}
                className={`absolute top-3 right-3 p-1.5 rounded-full transition shadow-xs cursor-pointer ${
                  saved
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={saved ? 'Remove from remembered services' : 'Remember this service'}
              >
                <FiHeart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
              </button>
            </div>
          )}

          <div className="p-5">
            {/* Badges */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    isTemporary
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {job.jobType}
                </span>

                {job.category && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                    {job.category}
                  </span>
                )}
              </div>

              {/* Expiry Badge */}
              <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <FiClock className="w-3 h-3" />
                <span>{expiryText}</span>
              </div>
            </div>

            {/* Title */}
            <Link to={`/jobs/${job.id}`}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                {job.title}
              </h3>
            </Link>

            {/* Description snippet */}
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
              {job.description || 'No description provided.'}
            </p>

            {/* Metadata */}
            <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              {job.location && (
                <div className="flex items-center gap-1.5">
                  <FiMapPin className="text-gray-400 shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
              )}

              {(job.salaryMin !== null || job.salaryMax !== null) && (
                <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">LKR</span>
                  <span>
                    {job.salaryMin?.toLocaleString()}
                    {job.salaryMax ? ` - ${job.salaryMax.toLocaleString()}` : ''}
                    {isTemporary ? ' / gig' : ' / mo'}
                  </span>
                </div>
              )}
            </div>

            {/* Direct Contact Buttons (Ebay/AliExpress Marketplace Style) */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold transition"
                  title="Direct Call"
                >
                  <FiPhone className="text-blue-600" />
                  <span>{t('job.call')}</span>
                </a>
              )}

              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I saw your service "${job.title}" on HireJob Sri Lanka and would like to hire you.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold transition"
                  title="Direct WhatsApp"
                >
                  <FaWhatsapp className="text-emerald-500" />
                  <span>{t('job.whatsapp')}</span>
                </a>
              )}

              <Link
                to={`/jobs/${job.id}`}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
              >
                View
              </Link>
            </div>
          </div>
        </div>

        {/* Footer / Poster details & Boost option */}
        <div className="p-4 pt-2 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5 truncate max-w-[50%]">
            <FiUser className="shrink-0" />
            <span className="truncate">{job.postedBy?.fullName || 'Employer'}</span>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && !job.isPriority && (
              <button
                onClick={() => setBoostModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <FiZap className="w-3 h-3 fill-current" />
                {t('job.promoteTop')}
              </button>
            )}
            <div className="flex items-center gap-1">
              <FiCalendar className="shrink-0" />
              <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recent'}</span>
            </div>
          </div>
        </div>
      </div>

      {boostModalOpen && (
        <PriorityBoostModal
          jobId={job.id}
          jobTitle={job.title}
          isOpen={boostModalOpen}
          onClose={() => setBoostModalOpen(false)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </>
  );
};

export default JobCard;
