import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import JobSearch from '../components/jobs/JobSearch';
import JobFilter from '../components/jobs/JobFilter';
import JobCard from '../components/jobs/JobCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { jobService } from '../services/job.service';
import type { Job } from '../types';
import { FiBriefcase } from 'react-icons/fi';

export const JobsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Sync state with query parameters
  useEffect(() => {
    setKeyword(searchParams.get('keyword') || '');
    setLocation(searchParams.get('location') || '');
    setType(searchParams.get('type') || '');
    setPage(0);
  }, [searchParams]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await jobService.searchJobs({
        keyword: keyword || undefined,
        location: location || undefined,
        type: type || undefined,
        page,
        size: 9,
      });
      setJobs(res.content || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Error fetching jobs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [keyword, location, type, page]);

  const handleSearch = (params: { keyword: string; location: string; type: string }) => {
    const nextParams = new URLSearchParams();
    if (params.keyword) nextParams.set('keyword', params.keyword);
    if (params.location) nextParams.set('location', params.location);
    if (params.type) nextParams.set('type', params.type);
    setSearchParams(nextParams);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.category) set.add(j.category);
    });
    return Array.from(set);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (!selectedCategory) return jobs;
    return jobs.filter((j) => j.category === selectedCategory);
  }, [jobs, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Explore Jobs & Gigs</h1>
        <p className="text-sm text-gray-500 mt-1">Search temporary gigs or permanent roles in your area</p>
        <div className="mt-6">
          <JobSearch
            initialKeyword={keyword}
            initialLocation={location}
            initialType={type}
            onSearch={handleSearch}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Filter Sidebar */}
        <div className="lg:col-span-1">
          <JobFilter
            selectedType={type}
            onTypeChange={(newType) => {
              setType(newType);
              const p = new URLSearchParams(searchParams);
              if (newType) p.set('type', newType);
              else p.delete('type');
              setSearchParams(p);
            }}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onReset={() => {
              setSelectedCategory('');
              setType('');
              setKeyword('');
              setLocation('');
              setSearchParams(new URLSearchParams());
            }}
          />
        </div>

        {/* Right Job Cards Grid */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <LoadingSpinner size="lg" className="py-20" />
          ) : filteredJobs.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    className="px-4 py-2 border rounded-lg text-sm bg-white disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 px-2">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 border rounded-lg text-sm bg-white disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 p-8">
              <FiBriefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-700">No matching jobs found</h3>
              <p className="text-sm text-gray-500 mt-1">
                Try loosening your search filters or searching a broader location.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
