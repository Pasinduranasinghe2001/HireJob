import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { ApiResponse, Job, User, PaymentRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  FiShield,
  FiUsers,
  FiDollarSign,
  FiAlertTriangle,
  FiTrash2,
  FiZap,
  FiLock,
  FiLayers,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  totalPosters: number;
  totalClients: number;
  totalActiveJobs: number;
  totalPriorityJobs: number;
  totalFlaggedSpamJobs: number;
  totalCompanyRevenue: number;
}

export const AdminPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'users' | 'revenue'>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [statsRes, jobsRes, usersRes, paymentsRes] = await Promise.all([
          api.get<ApiResponse<AdminStats>>('/admin/stats'),
          api.get<ApiResponse<any>>('/admin/jobs?page=0&size=50'),
          api.get<ApiResponse<User[]>>('/admin/users'),
          api.get<ApiResponse<PaymentRecord[]>>('/admin/payments'),
        ]);

        if (!ignore) {
          setStats(statsRes.data.data);
          setJobs(jobsRes.data.data?.content || []);
          setUsers(usersRes.data.data || []);
          setPayments(paymentsRes.data.data || []);
        }
      } catch {
        toast.error('Failed to load company administration data');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleJobStatus = async (jobId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    try {
      await api.put(`/admin/jobs/${jobId}/status?status=${newStatus}`);
      toast.success(`Job status changed to ${newStatus}`);
      setJobs(jobs.map((j) => (j.id === jobId ? { ...j, status: newStatus as any } : j)));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleToggleFlag = async (jobId: number, currentFlag: boolean) => {
    try {
      await api.put(`/admin/jobs/${jobId}/flag?flagged=${!currentFlag}`);
      toast.success(currentFlag ? 'Flag removed' : 'Marked as spam');
      setJobs(jobs.map((j) => (j.id === jobId ? { ...j, isFlagged: !currentFlag } : j)));
    } catch {
      toast.error('Failed to update flag');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await api.delete(`/admin/jobs/${jobId}`);
      toast.success('Listing deleted');
      setJobs(jobs.filter((j) => j.id !== jobId));
    } catch {
      toast.error('Failed to delete job');
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-24" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-xl">
              <FiShield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {t('admin.dashboard')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Company management portal for listings, monetization revenue, and platform moderation.
          </p>
        </div>

        {/* Safe notice */}
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
          <FiLock className="shrink-0 text-amber-600" />
          <span>{t('admin.safeNotice')}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Marketplace Listings ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          User Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'revenue'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Company Boost Revenue ({payments.length})
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {t('admin.revenue')}
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              LKR {stats?.totalCompanyRevenue?.toLocaleString() || 0}
            </div>
            <span className="text-[11px] text-gray-400">From priority listing boosts</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl">
            <FiDollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {t('admin.users')}
            </span>
            <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {stats?.totalUsers || 0}
            </div>
            <span className="text-[11px] text-gray-400">
              {stats?.totalPosters} Posters • {stats?.totalClients} Clients
            </span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-2xl">
            <FiUsers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {t('admin.activeListings')}
            </span>
            <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {stats?.totalActiveJobs || 0}
            </div>
            <span className="text-[11px] text-amber-500 font-bold">
              {stats?.totalPriorityJobs} Promoted with Priority
            </span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-2xl">
            <FiLayers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {t('admin.spamFlagged')}
            </span>
            <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
              {stats?.totalFlaggedSpamJobs || 0}
            </div>
            <span className="text-[11px] text-gray-400">Auto-detected by ML model</span>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-2xl">
            <FiAlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Overview or Tab Views */}
      {(activeTab === 'overview' || activeTab === 'jobs') && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Marketplace Service Moderation
            </h3>
            <span className="text-xs text-gray-400">Total: {jobs.length} items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700/50 uppercase text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-4">Title & Category</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Type / Duration</th>
                  <th className="p-4">ML Spam Score</th>
                  <th className="p-4">Status / Priority</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-gray-900 dark:text-white truncate">{j.title}</div>
                      <div className="text-[11px] text-gray-400">{j.category} • {j.location}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{j.postedBy?.fullName}</div>
                      <div className="text-[11px] text-gray-400">{j.contactPhone || j.postedBy?.phone || 'No phone'}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold">{j.jobType}</span>
                      <div className="text-[11px] text-gray-400">
                        {j.durationDays ? `${j.durationDays} days` : 'Unlimited'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          (j.spamScore || 0) >= 0.5
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                        }`}
                      >
                        {((j.spamScore || 0) * 100).toFixed(0)}% Risk
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            j.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                          }`}
                        >
                          {j.status}
                        </span>
                        {j.isPriority && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-md flex items-center gap-0.5">
                            <FiZap className="w-2.5 h-2.5 fill-current" />
                            TOP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleJobStatus(j.id, j.status)}
                          className="px-2.5 py-1 text-[11px] bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-semibold transition cursor-pointer"
                        >
                          {j.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleToggleFlag(j.id, !!j.isFlagged)}
                          className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                            j.isFlagged ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 hover:text-red-500'
                          }`}
                          title="Toggle Spam Flag"
                        >
                          <FiAlertTriangle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(j.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                          title="Delete Listing"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Table */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Registered User Directory
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Admin view strictly protects user privacy (passwords remain invisible and BCrypt hashed).
              </p>
            </div>
            <span className="text-xs text-gray-400">Total: {users.length} users</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700/50 uppercase text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-4">User Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">2FA Security</th>
                  <th className="p-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="p-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
                        {u.fullName.charAt(0)}
                      </div>
                      <span>{u.fullName}</span>
                    </td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4">{u.phone || 'N/A'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.twoFactorEnabled
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                        }`}
                      >
                        {u.twoFactorEnabled ? '2FA Active' : 'Standard'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue Table */}
      {activeTab === 'revenue' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Company Priority Monetization Revenue
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Full ledger of paid priority bumps collected by HireJob company.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Total: LKR {stats?.totalCompanyRevenue?.toLocaleString() || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700/50 uppercase text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-4">Tx ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Promoted Service</th>
                  <th className="p-4">Package</th>
                  <th className="p-4">Amount (LKR)</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">{p.transactionId}</td>
                    <td className="p-4 font-semibold text-gray-900 dark:text-white">{p.userFullName}</td>
                    <td className="p-4 truncate max-w-xs">{p.jobTitle}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                        {p.packageType}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                      LKR {p.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-gray-500">{p.paymentMethod}</td>
                    <td className="p-4 text-gray-400">{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

