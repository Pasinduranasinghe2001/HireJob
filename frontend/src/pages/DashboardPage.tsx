import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import type { Job, ApiResponse, JobApplication } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PriorityBoostModal from '../components/jobs/PriorityBoostModal';
import {
  FiSend,
  FiPlusCircle,
  FiEye,
  FiCheck,
  FiX,
  FiZap,
  FiClock,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

function calculateDaysLeft(expiresAt?: string | null): string {
  if (!expiresAt) return 'Unlimited';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days > 0 ? `${days} days left` : 'Expired';
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications'>('jobs');

  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Boost modal state
  const [boostTarget, setBoostTarget] = useState<{ id: number; title: string } | null>(null);

  // Applicants for a specific job modal
  const [selectedJobApplications, setSelectedJobApplications] = useState<any[] | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  const [loadingApplications, setLoadingApplications] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        api.get<ApiResponse<Job[]>>('/jobs/my-jobs'),
        api.get<ApiResponse<JobApplication[]>>('/applications/my-applications'),
      ]);
      setMyJobs(jobsRes.data.data || []);
      setMyApplications(appsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          api.get<ApiResponse<Job[]>>('/jobs/my-jobs'),
          api.get<ApiResponse<JobApplication[]>>('/applications/my-applications'),
        ]);
        if (!ignore) {
          setMyJobs(jobsRes.data.data || []);
          setMyApplications(appsRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const viewApplicationsForJob = async (jobId: number, title: string) => {
    setSelectedJobTitle(title);
    setLoadingApplications(true);
    try {
      const res = await api.get<ApiResponse<any[]>>(`/applications/job/${jobId}`);
      setSelectedJobApplications(res.data.data || []);
    } catch {
      toast.error('Failed to load applicants for this job');
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleUpdateStatus = async (appId: number, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await api.put(`/applications/${appId}/status`, { status });
      toast.success(`Application marked as ${status}`);
      if (selectedJobApplications) {
        setSelectedJobApplications(
          selectedJobApplications.map((a) => (a.id === appId ? { ...a, status } : a))
        );
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-24" />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome, {user?.fullName}!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your service postings, priority visibility, and inquiries in one place.
          </p>
        </div>

        <Link
          to="/post-job"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition"
        >
          <FiPlusCircle /> {t('nav.postJob')}
        </Link>
      </div>

      {/* Stats counter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
            <img src="/logo-icon.png" alt="HireJob" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Services Posted By You</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{myJobs.length}</p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">
            <FiSend />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Inquiries & Applications</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{myApplications.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-4 px-1 text-sm font-semibold border-b-2 cursor-pointer transition ${
              activeTab === 'jobs'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            My Services & Listings ({myJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-4 px-1 text-sm font-semibold border-b-2 cursor-pointer transition ${
              activeTab === 'applications'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            My Inquiries ({myApplications.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: My Jobs */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {myJobs.length > 0 ? (
            myJobs.map((job) => {
              const expiryLabel = calculateDaysLeft(job.expiresAt);

              return (
                <div
                  key={job.id}
                  className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    job.isPriority
                      ? 'border-amber-400 dark:border-amber-500 ring-1 ring-amber-400/30'
                      : 'border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${
                          job.jobType === 'TEMPORARY'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {job.jobType}
                      </span>

                      {job.isPriority && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                          <FiZap className="w-3 h-3 fill-current" />
                          TOP PRIORITY
                        </span>
                      )}

                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <FiClock /> {expiryLabel}
                      </span>
                    </div>

                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-base font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
                    >
                      {job.title}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {job.location} • LKR {job.salaryMin?.toLocaleString()} - {job.salaryMax?.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {!job.isPriority && (
                      <button
                        onClick={() => setBoostTarget({ id: job.id, title: job.title })}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <FiZap /> {t('job.promoteTop')}
                      </button>
                    )}

                    <button
                      onClick={() => viewApplicationsForJob(job.id, job.title)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FiEye /> View Inquiries
                    </button>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
              <img src="/logo-icon.png" alt="HireJob" className="w-10 h-10 object-contain mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">You haven't posted any services yet</p>
              <Link
                to="/post-job"
                className="mt-3 inline-block px-4 py-2 bg-gradient-to-r from-[#fa9d01] to-[#f95a03] text-white rounded-lg text-xs font-semibold hover:brightness-105"
              >
                Post Your First Service
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Applications */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {myApplications.length > 0 ? (
            myApplications.map((app) => (
              <div
                key={app.id}
                className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    <Link to={`/jobs/${app.jobId}`} className="hover:text-blue-600">
                      {app.jobTitle}
                    </Link>
                  </h3>
                  <p className="text-xs text-gray-500">{app.jobLocation}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{app.message}"</p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      app.status === 'ACCEPTED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : app.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
              <FiSend className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">You haven't contacted any providers yet</p>
              <Link
                to="/jobs"
                className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Explore Services
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Priority Boost Modal */}
      {boostTarget && (
        <PriorityBoostModal
          jobId={boostTarget.id}
          jobTitle={boostTarget.title}
          isOpen={!!boostTarget}
          onClose={() => setBoostTarget(null)}
          onSuccess={() => {
            setBoostTarget(null);
            fetchDashboardData();
          }}
        />
      )}

      {/* Applicants View Modal */}
      {selectedJobApplications && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Applicants for "{selectedJobTitle}"
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedJobApplications.length} candidate(s) inquiry
                </p>
              </div>
              <button
                onClick={() => setSelectedJobApplications(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingApplications ? (
                <LoadingSpinner />
              ) : selectedJobApplications.length > 0 ? (
                selectedJobApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{app.applicant?.fullName}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {app.applicant?.email} • {app.applicant?.phone || 'No phone'}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          app.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                      "{app.message}"
                    </p>

                    {app.status === 'PENDING' && (
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'ACCEPTED')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <FiCheck /> Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'REJECTED')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <FiX /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-sm text-gray-500 italic">
                  No one has applied to this posting yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
