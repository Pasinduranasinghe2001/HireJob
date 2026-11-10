import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Job, ApiResponse } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiBriefcase, FiSend, FiCheck, FiX, FiPlusCircle, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications'>('jobs');
  const [loading, setLoading] = useState(true);

  // Modal for viewing applications on a posted job
  const [selectedJobApplications, setSelectedJobApplications] = useState<any[] | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  const [loadingApplications, setLoadingApplications] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        api.get<ApiResponse<Job[]>>('/jobs/my-jobs'),
        api.get<ApiResponse<any[]>>('/applications/my-applications'),
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
    fetchDashboardData();
  }, []);

  const viewApplicationsForJob = async (jobId: number, title: string) => {
    setSelectedJobTitle(title);
    setLoadingApplications(true);
    try {
      const res = await api.get<ApiResponse<any[]>>(`/applications/job/${jobId}`);
      setSelectedJobApplications(res.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load applicants for this job');
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleUpdateStatus = async (appId: number, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await api.put(`/applications/${appId}/status`, { status });
      toast.success(`Application marked as ${status}`);
      // update state
      if (selectedJobApplications) {
        setSelectedJobApplications(
          selectedJobApplications.map((a) => (a.id === appId ? { ...a, status } : a))
        );
      }
    } catch (err) {
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Welcome, {user?.fullName}!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your opportunities, applicants, and job applications in one place.
          </p>
        </div>

        <Link
          to="/post-job"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition"
        >
          <FiPlusCircle /> Post New Job
        </Link>
      </div>

      {/* Stats counter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            <FiBriefcase />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Jobs Posted By You</p>
            <p className="text-2xl font-bold text-gray-900">{myJobs.length}</p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
            <FiSend />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Applications Submitted</p>
            <p className="text-2xl font-bold text-gray-900">{myApplications.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-4 px-1 text-sm font-semibold border-b-2 cursor-pointer transition ${
              activeTab === 'jobs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Job Postings ({myJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-4 px-1 text-sm font-semibold border-b-2 cursor-pointer transition ${
              activeTab === 'applications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Submitted Applications ({myApplications.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: My Jobs */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {myJobs.length > 0 ? (
            myJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${
                        job.jobType === 'TEMPORARY'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {job.jobType}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="text-base font-bold text-gray-900 hover:text-blue-600 transition"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {job.location} • ${job.salaryMin} - ${job.salaryMax}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => viewApplicationsForJob(job.id, job.title)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FiEye /> View Applicants
                  </button>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
                  >
                    View Page
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-8">
              <FiBriefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">You haven't posted any jobs yet</p>
              <Link
                to="/post-job"
                className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Post Your First Job
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
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    <Link to={`/jobs/${app.jobId}`} className="hover:text-blue-600">
                      {app.jobTitle}
                    </Link>
                  </h3>
                  <p className="text-xs text-gray-500">{app.jobLocation}</p>
                  <p className="text-xs text-gray-600 italic">"{app.message}"</p>
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
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-8">
              <FiSend className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">You haven't applied to any jobs yet</p>
              <Link
                to="/jobs"
                className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Explore Available Jobs
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Applicants View Modal */}
      {selectedJobApplications && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Applicants for "{selectedJobTitle}"
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedJobApplications.length} candidate(s) applied
                </p>
              </div>
              <button
                onClick={() => setSelectedJobApplications(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
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
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{app.applicant?.fullName}</h4>
                        <p className="text-xs text-gray-500">
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

                    <p className="text-xs text-gray-700 bg-white p-2.5 rounded-lg border border-gray-100">
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
