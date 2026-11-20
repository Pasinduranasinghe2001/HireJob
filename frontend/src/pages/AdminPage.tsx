import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import type { ApiResponse, Job, User, PaymentRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { extractApiError } from '../utils/authHelpers';
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
  FiUserPlus,
  FiSettings,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiEdit2,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  totalPosters: number;
  totalClients: number;
  totalAdmins?: number;
  totalActiveJobs: number;
  totalPriorityJobs: number;
  totalFlaggedSpamJobs: number;
  totalApplications?: number;
  totalCompanyRevenue: number;
}

interface AdminTaskItem {
  id: number;
  jobId: number;
  jobTitle: string;
  category: string;
  providerName: string;
  applicantName: string;
  applicantEmail: string;
  message: string;
  status: string;
  createdAt: string;
}

interface PlatformSettingsData {
  siteName: string;
  supportEmail: string;
  registrationEnabled: boolean;
  requireEmailVerification: boolean;
  allowAnonymousBrowsing: boolean;
  spamFlagThreshold: number;
  priorityPrice1Day: number;
  priorityPrice3Day: number;
  priorityPrice7Day: number;
  siteAnnouncement: string;
}

interface DiagnosticsData {
  emailProvider: string;
  emailConfigured: boolean;
  googleSignInConfigured: boolean;
  passwordsProtected: boolean;
}

type AdminTab = 'overview' | 'jobs' | 'users' | 'tasks' | 'revenue' | 'settings';

export const AdminPage: React.FC = () => {
  const { t } = useLanguage();
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [settings, setSettings] = useState<PlatformSettingsData>({
    siteName: 'HireJob Sri Lanka',
    supportEmail: 'pasinduworkwebsite@gmail.com',
    registrationEnabled: true,
    requireEmailVerification: true,
    allowAnonymousBrowsing: true,
    spamFlagThreshold: 0.5,
    priorityPrice1Day: 500,
    priorityPrice3Day: 1200,
    priorityPrice7Day: 2500,
    siteAnnouncement: '',
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [jobSearch, setJobSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Create Company Team / User Modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ROLE_ADMIN' | 'ROLE_POSTER' | 'ROLE_CLIENT'>('ROLE_ADMIN');
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Edit User Modal (Admin can change anything except viewing/decoding password)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<User['role']>('ROLE_POSTER');
  const [editActive, setEditActive] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [statsRes, jobsRes, usersRes, paymentsRes, tasksRes, settingsRes] = await Promise.all([
        api.get<ApiResponse<AdminStats>>('/admin/stats'),
        api.get<ApiResponse<any>>('/admin/jobs?page=0&size=100'),
        api.get<ApiResponse<User[]>>('/admin/users'),
        api.get<ApiResponse<PaymentRecord[]>>('/admin/payments'),
        api.get<ApiResponse<AdminTaskItem[]>>('/admin/tasks'),
        api.get<ApiResponse<any>>('/admin/settings'),
      ]);

      setStats(statsRes.data.data);
      setJobs(jobsRes.data.data?.content || []);
      setUsers(usersRes.data.data || []);
      setPayments(paymentsRes.data.data || []);
      setTasks(tasksRes.data.data || []);
      if (settingsRes.data.data?.settings) {
        const s = settingsRes.data.data.settings;
        setSettings({
          siteName: s.siteName || 'HireJob Sri Lanka',
          supportEmail: s.supportEmail || 'pasinduworkwebsite@gmail.com',
          registrationEnabled: s.registrationEnabled ?? true,
          requireEmailVerification: s.requireEmailVerification ?? true,
          allowAnonymousBrowsing: s.allowAnonymousBrowsing ?? true,
          spamFlagThreshold: s.spamFlagThreshold ?? 0.5,
          priorityPrice1Day: Number(s.priorityPrice1Day ?? 500),
          priorityPrice3Day: Number(s.priorityPrice3Day ?? 1200),
          priorityPrice7Day: Number(s.priorityPrice7Day ?? 2500),
          siteAnnouncement: s.siteAnnouncement || '',
        });
      }
      if (settingsRes.data.data?.diagnostics) {
        setDiagnostics(settingsRes.data.data.diagnostics);
      }
    } catch {
      toast.error('Failed to load company administration data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) {
        await loadAll();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  const handleToggleJobStatus = async (jobId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    try {
      await api.put(`/admin/jobs/${jobId}/status?status=${newStatus}`);
      toast.success(`Job status changed to ${newStatus}`);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus as any } : j)));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleToggleFlag = async (jobId: number, currentFlag: boolean) => {
    try {
      await api.put(`/admin/jobs/${jobId}/flag?flagged=${!currentFlag}`);
      toast.success(currentFlag ? 'Flag removed' : 'Marked as spam');
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, isFlagged: !currentFlag } : j)));
    } catch {
      toast.error('Failed to update flag');
    }
  };

  const handleTogglePriority = async (jobId: number, currentPriority: boolean) => {
    try {
      const res = await api.put<ApiResponse<Job>>(`/admin/jobs/${jobId}/priority?priority=${!currentPriority}&days=7`);
      toast.success(!currentPriority ? 'Listing promoted to TOP Priority!' : 'Priority boost removed');
      setJobs((prev) => prev.map((j) => (j.id === jobId ? res.data.data : j)));
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    try {
      await api.delete(`/admin/jobs/${jobId}`);
      toast.success('Listing removed');
      loadAll();
    } catch (err: any) {
      toast.error(extractApiError(err, 'Failed to delete job'));
    }
  };

  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmittingTeam(true);
    try {
      const res = await api.post<ApiResponse<User>>('/admin/team', {
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
        password: newPassword,
        role: newRole,
      });
      toast.success(`Account created for ${res.data.data.fullName} (${res.data.data.role})`);
      setShowCreateUserModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      loadAll();
    } catch (err: any) {
      toast.error(extractApiError(err, 'Could not create team/user account'));
    } finally {
      setSubmittingTeam(false);
    }
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setEditFullName(u.fullName);
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setEditActive(u.active !== false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingTeam(true);
    try {
      const res = await api.put<ApiResponse<User>>(`/admin/users/${editingUser.id}`, {
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        role: editRole,
        active: editActive,
      });
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? res.data.data : u)));
      toast.success('Account updated');
      setEditingUser(null);
    } catch (err: any) {
      toast.error(extractApiError(err, 'Could not update user'));
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleQuickToggleActive = async (u: User) => {
    const nextActive = u.active === false;
    try {
      const res = await api.put<ApiResponse<User>>(`/admin/users/${u.id}`, { active: nextActive });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data.data : x)));
      toast.success(nextActive ? `${u.fullName} activated` : `${u.fullName} suspended`);
    } catch (err: any) {
      toast.error(extractApiError(err, 'Failed to change status'));
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`Remove user ${u.email}? Passwords remain encrypted and unrecoverable.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success('Account deleted');
      loadAll();
    } catch (err: any) {
      toast.error(extractApiError(err, 'Cannot delete account'));
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.put('/admin/settings', settings);
      toast.success('Platform settings saved!');
    } catch (err: any) {
      toast.error(extractApiError(err, 'Failed to save platform settings'));
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredJobs = jobs.filter(
    (j) =>
      !jobSearch.trim() ||
      j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      j.category?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      j.postedBy?.fullName?.toLowerCase().includes(jobSearch.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      !userSearch.trim() ||
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="lg" className="py-24" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-xl">
              <FiShield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                {t('admin.dashboard')}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Signed in as <strong>{currentAdmin?.email}</strong> — Manage company team, platform tasks, moderation, and settings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCreateUserModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
          >
            <FiUserPlus className="w-4 h-4" />
            <span>Create Team / User Account</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
            <FiLock className="shrink-0 text-amber-600" />
            <span>Passwords strictly encrypted &amp; hidden</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'jobs', label: `Listings (${jobs.length})` },
          { id: 'users', label: `Company Team & Users (${users.length})` },
          { id: 'tasks', label: `Task Monitor (${tasks.length})` },
          { id: 'revenue', label: `Revenue (${payments.length})` },
          { id: 'settings', label: 'Platform Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
              {stats?.totalAdmins || 0} Team • {stats?.totalPosters || 0} Posters • {stats?.totalClients || 0} Clients
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
              {stats?.totalPriorityJobs || 0} Top Priority
            </span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-2xl">
            <FiLayers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Tasks &amp; Spam Queue
            </span>
            <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {stats?.totalApplications ?? tasks.length}{' '}
              <span className="text-sm font-bold text-red-500">({stats?.totalFlaggedSpamJobs || 0} flagged)</span>
            </div>
            <span className="text-[11px] text-gray-400">Inquiries &amp; ML moderation</span>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-2xl">
            <FiAlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TAB: Overview & Jobs Moderation */}
      {(activeTab === 'overview' || activeTab === 'jobs') && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Marketplace Service Moderation
              </h3>
              <p className="text-xs text-gray-400">Approve, pause, promote, or remove service posts across Sri Lanka.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <FiSearch className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search listings..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700/50 uppercase text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-4">Title &amp; Category</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Type / Duration</th>
                  <th className="p-4">ML Spam Score</th>
                  <th className="p-4">Status / Priority</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredJobs.map((j) => (
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleTogglePriority(j.id, !!j.isPriority)}
                          className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                            j.isPriority ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-amber-600'
                          }`}
                          title={j.isPriority ? 'Remove Priority Boost' : 'Promote to Top Priority'}
                        >
                          <FiZap className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleJobStatus(j.id, j.status)}
                          className="px-2.5 py-1 text-[11px] bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-semibold transition cursor-pointer"
                        >
                          {j.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleToggleFlag(j.id, !!j.isFlagged)}
                          className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                            j.isFlagged ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-500'
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

      {/* TAB: Company Team & Users Management */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Company Team &amp; User Accounts
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Create team staff, assign roles, activate/suspend accounts. User passwords remain one-way BCrypt encrypted and unreadable.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <FiSearch className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <FiUserPlus className="w-3.5 h-3.5" />
                <span>Add Team / User</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700/50 uppercase text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-4">Name &amp; Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4">Password Privacy</th>
                  <th className="p-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredUsers.map((u) => {
                  const isActive = u.active !== false;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{u.fullName}</div>
                            <div className="text-[11px] text-gray-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{u.phone || 'N/A'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                            u.role === 'ROLE_ADMIN'
                              ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {u.role === 'ROLE_ADMIN' ? 'COMPANY ADMIN' : u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            }`}
                          >
                            {isActive ? 'Active' : 'Suspended'}
                          </span>
                          {u.emailVerified && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Verified</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                          <FiLock className="w-3 h-3" /> Protected (BCrypt)
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditUser(u)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer"
                            title="Edit Details & Role"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickToggleActive(u)}
                            disabled={u.id === currentAdmin?.id}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer disabled:opacity-40 ${
                              isActive
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === currentAdmin?.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer disabled:opacity-30"
                            title="Delete Account"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Task Monitor */}
      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FiActivity className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Marketplace Task &amp; Inquiry Monitor</h3>
                <p className="text-xs text-gray-400">Live log of customer job inquiries and task status across service providers.</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-gray-400">{tasks.length} recent tasks</span>
          </div>

          <div className="overflow-x-auto">
            {tasks.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400">
                No job applications or service inquiries recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-700/50 uppercase text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="p-4">Service / Job</th>
                    <th className="p-4">Provider</th>
                    <th className="p-4">Customer / Applicant</th>
                    <th className="p-4">Message</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-white">{task.jobTitle}</div>
                        <div className="text-[11px] text-gray-400">{task.category}</div>
                      </td>
                      <td className="p-4 font-semibold">{task.providerName}</td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{task.applicantName}</div>
                        <div className="text-[11px] text-gray-400">{task.applicantEmail}</div>
                      </td>
                      <td className="p-4 max-w-xs truncate">{task.message}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                          {task.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{new Date(task.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB: Revenue */}
      {activeTab === 'revenue' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Company Priority Monetization Revenue
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Full ledger of paid priority boosts collected by HireJob.</p>
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

      {/* TAB: Platform Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Live Integration Status */}
          {diagnostics && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Live Production Diagnostics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <div className="text-gray-400 font-semibold">Email Delivery</div>
                    <div className="font-bold text-gray-900 dark:text-white mt-0.5">{diagnostics.emailProvider}</div>
                  </div>
                  {diagnostics.emailConfigured ? (
                    <FiCheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <FiXCircle className="w-5 h-5 text-rose-500" />
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <div className="text-gray-400 font-semibold">Google OAuth Sign-In</div>
                    <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {diagnostics.googleSignInConfigured ? 'Active (GOOGLE_CLIENT_ID set)' : 'Needs GOOGLE_CLIENT_ID'}
                    </div>
                  </div>
                  {diagnostics.googleSignInConfigured ? (
                    <FiCheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <FiAlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <div className="text-gray-400 font-semibold">User Password Shield</div>
                    <div className="font-bold text-gray-900 dark:text-white mt-0.5">BCrypt (Hidden from Admin)</div>
                  </div>
                  <FiLock className="w-5 h-5 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Settings Form */}
          <form
            onSubmit={handleSaveSettings}
            className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-5"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-700">
              <FiSettings className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Company &amp; Marketplace Controls</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Platform Name
                </label>
                <input
                  type="text"
                  required
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Company Support Email
                </label>
                <input
                  type="email"
                  required
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  1-Day Boost (LKR)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.priorityPrice1Day}
                  onChange={(e) => setSettings({ ...settings, priorityPrice1Day: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  3-Day Boost (LKR)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.priorityPrice3Day}
                  onChange={(e) => setSettings({ ...settings, priorityPrice3Day: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  7-Day Boost (LKR)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.priorityPrice7Day}
                  onChange={(e) => setSettings({ ...settings, priorityPrice7Day: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Spam Risk Cutoff (0.1–1.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min={0.1}
                  max={1}
                  value={settings.spamFlagThreshold}
                  onChange={(e) => setSettings({ ...settings, spamFlagThreshold: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Site Announcement Banner (Optional)
              </label>
              <input
                type="text"
                value={settings.siteAnnouncement}
                onChange={(e) => setSettings({ ...settings, siteAnnouncement: e.target.value })}
                placeholder="e.g. Verified Sri Lankan skilled workers available nationwide"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 cursor-pointer text-xs font-semibold text-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={settings.registrationEnabled}
                  onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })}
                  className="rounded text-blue-600"
                />
                Allow New Registrations
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 cursor-pointer text-xs font-semibold text-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={settings.requireEmailVerification}
                  onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                  className="rounded text-blue-600"
                />
                Require Gmail OTP on Sign Up
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 cursor-pointer text-xs font-semibold text-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={settings.allowAnonymousBrowsing}
                  onChange={(e) => setSettings({ ...settings, allowAnonymousBrowsing: e.target.checked })}
                  className="rounded text-blue-600"
                />
                Allow Public Job Viewing
              </label>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {savingSettings ? 'Saving Settings...' : 'Save Platform Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Modal: Create Company Team or User Account */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FiUserPlus className="text-blue-600" /> Create Team / User Account
              </h3>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Password will be BCrypt-encrypted immediately upon creation and cannot be viewed again.
            </p>

            <form onSubmit={handleCreateTeamMember} className="space-y-3">
              <input
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
              />
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
              />
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (optional, e.g. 0771234567)"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
              />
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Initial Password (8+ characters)"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
              />
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Account Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
                >
                  <option value="ROLE_ADMIN">Company Team (Administrator)</option>
                  <option value="ROLE_POSTER">Service Provider (Poster)</option>
                  <option value="ROLE_CLIENT">Client / User</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingTeam ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User Details & Role */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Account: {editingUser.email}</h3>
            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Role</label>
                <select
                  value={editRole}
                  disabled={editingUser.id === currentAdmin?.id}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none disabled:opacity-50"
                >
                  <option value="ROLE_ADMIN">Company Team (Administrator)</option>
                  <option value="ROLE_POSTER">Service Provider</option>
                  <option value="ROLE_CLIENT">Client / User</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 pt-1">
                <input
                  type="checkbox"
                  disabled={editingUser.id === currentAdmin?.id}
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                />
                Account Active (uncheck to suspend access)
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  {submittingTeam ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
