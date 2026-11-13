import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSavedServices } from '../context/SavedServicesContext';
import { jobService } from '../services/job.service';
import type { Job, Review } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StarRating from '../components/common/StarRating';
import ReviewCard from '../components/reviews/ReviewCard';
import PriorityBoostModal from '../components/jobs/PriorityBoostModal';
import ImageCarousel from '../components/common/ImageCarousel';
import {
  FiMapPin,
  FiCalendar,
  FiBriefcase,
  FiUser,
  FiPhone,
  FiSend,
  FiZap,
  FiClock,
  FiEye,
  FiMail,
  FiHeart,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';

function computeDays(expiresAt: string): number {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { isSaved, toggleSave } = useSavedServices();

  const [job, setJob] = useState<Job | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [boostModalOpen, setBoostModalOpen] = useState(false);

  const saved = job ? isSaved(job.id) : false;

  // Application Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!id) return;
      try {
        const jobId = parseInt(id, 10);
        const [jobData, reviewsData] = await Promise.all([
          jobService.getJobById(jobId),
          jobService.getJobReviews(jobId),
        ]);
        if (!ignore) {
          setJob(jobData);
          setReviews(reviewsData || []);
        }
      } catch {
        toast.error('Could not load service details');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setApplying(true);
    try {
      await jobService.applyToJob({
        jobId: job.id,
        message: applyMessage,
      });
      toast.success('Your message was submitted to the provider!');
      setApplyModalOpen(false);
      setApplyMessage('');
    } catch {
      toast.error('Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setSubmittingReview(true);
    try {
      const newReview = await jobService.createReview({
        jobId: job.id,
        revieweeId: job.postedBy.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success('Review posted successfully!');
      setReviews([newReview, ...reviews]);
      setReviewComment('');
    } catch {
      toast.error('Failed to post review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-24" />;
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Service not found</h2>
        <Link to="/jobs" className="mt-4 inline-block text-blue-600 font-medium">
          ← Back to all services
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === job.postedBy.id;
  const isTemporary = job.jobType === 'TEMPORARY';

  const contactPhone = job.contactPhone || job.postedBy?.phone || '';
  const cleanPhone = contactPhone.replace(/[^0-9]/g, '');
  const whatsappNumber = job.contactWhatsapp ? job.contactWhatsapp.replace(/[^0-9]/g, '') : cleanPhone;
  const contactEmail = job.contactEmail || job.postedBy?.email || '';

  // Expiration calculation
  let expiryNotice = t('job.unlimited');
  if (job.expiresAt) {
    const daysLeft = computeDays(job.expiresAt);
    if (daysLeft > 0) {
      expiryNotice = `${t('job.expiresIn')} ${daysLeft} ${t('job.days')}`;
    } else {
      expiryNotice = 'Expired';
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/jobs"
          className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          ← Back to listings
        </Link>

        {isOwner && (
          <button
            onClick={() => setBoostModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold text-xs rounded-xl shadow-md hover:from-amber-600 hover:to-yellow-600 transition cursor-pointer"
          >
            <FiZap />
            {t('job.promoteTop')}
          </button>
        )}
      </div>

      {/* Main Service Card */}
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden ${
          job.isPriority
            ? 'border-amber-400 dark:border-amber-500 shadow-lg ring-1 ring-amber-400/30'
            : 'border-gray-100 dark:border-gray-700 shadow-sm'
        }`}
      >
        {/* Priority Banner */}
        {job.isPriority && (
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-extrabold uppercase tracking-wider px-6 py-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FiZap className="w-4 h-4 fill-current" />
              {t('job.featured')} — Top Placement Active
            </span>
            <span>⭐ TOP RATED</span>
          </div>
        )}

        {/* Images Carousel - swaps automatically one by one */}
        {((job.imageUrls && job.imageUrls.length > 0) || job.imageUrl) && (
          <div className="w-full h-72 sm:h-96 overflow-hidden bg-gray-100 dark:bg-gray-700">
            <ImageCarousel
              images={job.imageUrls}
              singleImageUrl={job.imageUrl}
              alt={job.title}
              className="w-full h-full"
              autoPlayInterval={3500}
            />
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  isTemporary
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                }`}
              >
                {job.jobType}
              </span>
              {job.category && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md">
                  {job.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <FiClock />
                <span>{expiryNotice}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiEye />
                <span>{job.viewsCount || 0} {t('job.views')}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiCalendar />
                <span>{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
            {job.title}
          </h1>

          {/* Quick specs grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <FiMapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Location</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {job.location || 'Sri Lanka / Flexible'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <span className="font-bold text-sm">LKR</span>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">{t('job.salary')}</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  LKR {job.salaryMin?.toLocaleString()}
                  {job.salaryMax ? ` - ${job.salaryMax.toLocaleString()}` : ''}
                  {isTemporary ? ' / gig' : ' / mo'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <FiBriefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Status</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.status}</p>
              </div>
            </div>
          </div>

          {/* Service Description */}
          <div className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Service Description</h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-sm">
              {job.description}
            </div>
          </div>

          {/* Direct Marketplace Contact Options (Ebay / AliExpress Customer Mode) */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              {t('job.contact')} Directly
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center gap-2"
                >
                  <FiPhone />
                  {t('job.call')} ({contactPhone})
                </a>
              )}

              {/* Save / Remember this service (Cart equivalent for service seekers) */}
              <button
                type="button"
                onClick={() => toggleSave(job)}
                className={`px-5 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-xs ${
                  saved
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                }`}
              >
                <FiHeart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                <span>{saved ? 'Saved in Remembered' : 'Remember Service (Save)'}</span>
              </button>

              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I saw your service "${job.title}" on HireJob Sri Lanka and would like to inquire.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center gap-2"
                >
                  <FaWhatsapp className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              )}

              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}?subject=HireJob Inquiry: ${encodeURIComponent(job.title)}`}
                  className="px-5 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl text-sm transition flex items-center gap-2"
                >
                  <FiMail />
                  Email Provider
                </a>
              )}

              {isAuthenticated && !isOwner && (
                <button
                  onClick={() => setApplyModalOpen(true)}
                  className="px-5 py-3 border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
                >
                  <FiSend />
                  {t('job.apply')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Provider Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">About the Service Provider</h3>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
            {job.postedBy?.fullName?.charAt(0).toUpperCase() || <FiUser />}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{job.postedBy?.fullName}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{job.postedBy?.email}</p>
            {job.postedBy?.phone && (
              <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1 mt-1">
                <FiPhone className="text-gray-400" /> {job.postedBy.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Customer Reviews & Ratings</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Verified ratings from satisfied clients</p>
        </div>

        {isAuthenticated && !isOwner && (
          <form onSubmit={handleReviewSubmit} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl space-y-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Leave a Review for this Provider</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-300">Your Rating:</span>
              <StarRating rating={reviewRating} interactive={true} onChange={setReviewRating} size={20} />
            </div>
            <textarea
              required
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience working with this service provider..."
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {submittingReview ? 'Posting...' : 'Submit Review'}
            </button>
          </form>
        )}

        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No reviews yet for this service.</p>
        )}
      </div>

      {/* Apply Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Contact "{job.title}"</h3>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Message / Inquire
                </label>
                <textarea
                  required
                  rows={4}
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Describe your project, required date, location, or questions..."
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {applying ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {boostModalOpen && (
        <PriorityBoostModal
          jobId={job.id}
          jobTitle={job.title}
          isOpen={boostModalOpen}
          onClose={() => setBoostModalOpen(false)}
          onSuccess={() => {
            setJob((prev) => (prev ? { ...prev, isPriority: true } : prev));
            setBoostModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default JobDetailPage;
