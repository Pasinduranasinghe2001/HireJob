import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiBriefcase, FiArrowRight } from 'react-icons/fi';
import JobSearch from '../components/jobs/JobSearch';
import JobCard from '../components/jobs/JobCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HangingLamp from '../components/common/HangingLamp';
import { jobService } from '../services/job.service';
import { useLanguage } from '../context/LanguageContext';
import type { Job } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentJobs = useCallback(async () => {
    try {
      const res = await jobService.getJobs(0, 9);
      setFeaturedJobs(res.content || []);
    } catch (err) {
      console.error('Failed to load featured jobs', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await jobService.getJobs(0, 9);
        if (!ignore) setFeaturedJobs(res.content || []);
      } catch (err) {
        console.error('Failed to load featured jobs', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSearch = ({ keyword, location, type }: { keyword: string; location: string; type: string }) => {
    const query = new URLSearchParams();
    if (keyword) query.set('keyword', keyword);
    if (location) query.set('location', location);
    if (type) query.set('type', type);
    navigate(`/jobs?${query.toString()}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-blue-50/70 dark:from-gray-900 via-indigo-50/20 dark:via-gray-850 to-white dark:to-gray-900 pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-gray-100 dark:border-gray-800 transition-colors z-20">
        {/* Interactive Hanging Ceiling Lamp (Pull Cord to toggle Dark/Light) */}
        <div className="absolute top-0 right-4 sm:right-12 md:right-20">
          <HangingLamp />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Sri Lanka's Direct Hire & Service Marketplace 🇱🇰
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
            {t('hero.title')}
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 dark:text-gray-300">
            {t('hero.subtitle')}
          </p>

          {/* Search Box in Hero */}
          <div className="pt-4 max-w-4xl mx-auto">
            <JobSearch onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Featured / Priority Marketplace Services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-md">
                TOP LISTINGS
              </span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Featured & Priority Services
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Top-ranked service providers and verified trades across Sri Lanka
            </p>
          </div>
          <Link
            to="/jobs"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800"
          >
            {t('hero.browseBtn')} <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" />
        ) : featuredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredJobs.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={fetchRecentJobs} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
            <FiBriefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">No services listed yet</h3>
            <p className="text-sm text-gray-500 mt-1">Be the first to list your service or hire workers!</p>
            <Link
              to="/post-job"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Post a Service
            </Link>
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400"
          >
            {t('hero.browseBtn')} <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How Marketplace Works */}
      <section className="bg-white dark:bg-gray-800 py-16 border-y border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              How HireJob Marketplace Works
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 font-medium">
              Connecting clients with trusted, verified local service professionals across Sri Lanka
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm">
                1
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Browse Free & Find Services</h3>
              <p className="text-sm text-gray-600 dark:text-gray-200 leading-relaxed font-normal">
                Anyone can browse without logging in. Filter by city, district, trade category, and budget.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm">
                2
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Direct WhatsApp & Calls</h3>
              <p className="text-sm text-gray-600 dark:text-gray-200 leading-relaxed font-normal">
                Connect instantly with service providers by phone or WhatsApp to agree on terms and get the job done.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm">
                3
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Post Services & Paid Priority</h3>
              <p className="text-sm text-gray-600 dark:text-gray-200 leading-relaxed font-normal">
                Sellers post multiple services with auto-delete durations or pay a priority boost to pin their post to the very top.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
