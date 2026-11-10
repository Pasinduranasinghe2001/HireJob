import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobService } from '../services/job.service';
import type { Job, Review } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StarRating from '../components/common/StarRating';
import ReviewCard from '../components/reviews/ReviewCard';
import {
  FiMapPin,
  FiDollarSign,
  FiCalendar,
  FiBriefcase,
  FiUser,
  FiPhone,
  FiSend,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Application Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchJobAndReviews = async () => {
      if (!id) return;
      try {
        const jobId = parseInt(id, 10);
        const [jobData, reviewsData] = await Promise.all([
          jobService.getJobById(jobId),
          jobService.getJobReviews(jobId),
        ]);
        setJob(jobData);
        setReviews(reviewsData || []);
      } catch (err) {
        console.error('Failed to fetch job details', err);
        toast.error('Could not load job details');
      } finally {
        setLoading(false);
      }
    };
    fetchJobAndReviews();
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
      toast.success('Your application was submitted successfully!');
      setApplyModalOpen(false);
      setApplyMessage('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to post review');
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
        <h2 className="text-xl font-bold text-gray-800">Job not found</h2>
        <Link to="/jobs" className="mt-4 inline-block text-blue-600 font-medium">
          ← Back to all jobs
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === job.postedBy.id;
  const isTemporary = job.jobType === 'TEMPORARY';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link to="/jobs" className="text-sm font-semibold text-gray-500 hover:text-blue-600">
          ← Back to listings
        </Link>
      </div>

      {/* Main Job Header & Info Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {job.imageUrl && (
          <div className="w-full h-72 sm:h-96 overflow-hidden bg-gray-100">
            <img
              src={job.imageUrl}
              alt={job.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  isTemporary
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {job.jobType}
              </span>
              {job.category && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-md">
                  {job.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FiCalendar />
              <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
            {job.title}
          </h1>

          {/* Quick specs grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <FiMapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Location</p>
                <p className="text-sm font-medium text-gray-900">{job.location || 'Flexible / Remote'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FiDollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Compensation</p>
                <p className="text-sm font-semibold text-gray-900">
                  ${job.salaryMin?.toLocaleString()}
                  {job.salaryMax ? ` - $${job.salaryMax.toLocaleString()}` : ''}
                  {isTemporary ? ' / task' : ' / year'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <FiBriefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Job Status</p>
                <p className="text-sm font-semibold text-emerald-600">{job.status}</p>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-gray-900">Job Description</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
              {job.description}
            </div>
          </div>

          {/* Action Button: Apply or Contact */}
          <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            {isAuthenticated ? (
              isOwner ? (
                <div className="text-sm text-gray-500 italic">
                  You are the owner of this job posting.
                </div>
              ) : (
                <button
                  onClick={() => setApplyModalOpen(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <FiSend />
                  Apply & Contact Client
                </button>
              )
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition"
                >
                  Sign in to Apply
                </Link>
                <span className="text-xs text-gray-400">
                  You must have an account to apply or contact the poster.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Poster Details Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-gray-900">About the Employer / Poster</h3>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
            {job.postedBy?.fullName?.charAt(0).toUpperCase() || <FiUser />}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{job.postedBy?.fullName}</h4>
            <p className="text-xs text-gray-500">{job.postedBy?.email}</p>
            {job.postedBy?.phone && (
              <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                <FiPhone className="text-gray-400" /> {job.postedBy.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews & Ratings Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Reviews & Feedback</h3>
            <p className="text-xs text-gray-500 mt-0.5">Verified comments from previous jobs</p>
          </div>
        </div>

        {/* Write a review (if logged in and not owner) */}
        {isAuthenticated && !isOwner && (
          <form onSubmit={handleReviewSubmit} className="p-4 bg-gray-50 rounded-xl space-y-3">
            <h4 className="text-sm font-semibold text-gray-800">Leave a Review</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Your Rating:</span>
              <StarRating
                rating={reviewRating}
                interactive={true}
                onChange={setReviewRating}
                size={20}
              />
            </div>
            <textarea
              required
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share details about your experience working with this client or completing this job..."
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Reviews list */}
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No reviews yet for this posting.</p>
        )}
      </div>

      {/* Apply Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Apply for "{job.title}"</h3>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Message / Cover Note to Employer
                </label>
                <textarea
                  required
                  rows={4}
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Introduce yourself, your experience, and why you are a great fit for this task..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {applying ? 'Sending...' : 'Confirm Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetailPage;
