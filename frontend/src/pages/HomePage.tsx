import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiBriefcase, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import JobSearch from '../components/jobs/JobSearch';
import JobCard from '../components/jobs/JobCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { jobService } from '../services/job.service';
import type { Job } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentJobs = async () => {
      try {
        const res = await jobService.getJobs(0, 6);
        setFeaturedJobs(res.content || []);
      } catch (err) {
        console.error('Failed to load featured jobs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentJobs();
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
      <section className="relative bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Connecting Workers & Clients Directly
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Find Temporary Gigs & Permanent Jobs{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Near Your Location
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600">
            HireJob enables clients and service providers to discover nearby opportunities, post temporary tasks or permanent careers, verify ratings, and connect instantly.
          </p>

          {/* Search Box in Hero */}
          <div className="pt-4 max-w-4xl mx-auto">
            <JobSearch onSearch={handleSearch} />
          </div>

          {/* Quick stats pills */}
          <div className="pt-6 flex flex-wrap justify-center gap-6 text-xs sm:text-sm font-medium text-gray-500">
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-emerald-500" /> 100% Free to browse
            </span>
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-emerald-500" /> Direct poster contact
            </span>
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-emerald-500" /> Location-filtered results
            </span>
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Featured Opportunities</h2>
            <p className="text-sm text-gray-500 mt-1">Recently posted gigs and career roles ready for hiring</p>
          </div>
          <Link
            to="/jobs"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            View all jobs <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" />
        ) : featuredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-8">
            <FiBriefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700">No jobs posted yet</h3>
            <p className="text-sm text-gray-500 mt-1">Be the first to post a job or gig!</p>
            <Link
              to="/post-job"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Post a Job
            </Link>
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
          >
            View all jobs <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-gray-900">How HireJob Works</h2>
            <p className="text-sm text-gray-500 mt-1">Simple and streamlined connection between employers and service workers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm">
                1
              </div>
              <h3 className="font-bold text-gray-900 text-base">Create an Account</h3>
              <p className="text-sm text-gray-600">
                Sign up as an employer looking for workers or as a talent/contractor looking for temporary or permanent work.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm">
                2
              </div>
              <h3 className="font-bold text-gray-900 text-base">Post or Search</h3>
              <p className="text-sm text-gray-600">
                Post jobs with images and location coordinates, or search local jobs filtered by category and proximity.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm">
                3
              </div>
              <h3 className="font-bold text-gray-900 text-base">Accept & Review</h3>
              <p className="text-sm text-gray-600">
                Submit an application, get accepted, complete the work, and leave a genuine rating with feedback.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
