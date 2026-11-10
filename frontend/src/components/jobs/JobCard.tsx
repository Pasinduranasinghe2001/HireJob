import React from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiDollarSign, FiCalendar, FiUser } from 'react-icons/fi';
import type { Job } from '../../types';

interface JobCardProps {
  job: Job;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const isTemporary = job.jobType === 'TEMPORARY';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      <div>
        {/* Optional Image or Header Bar */}
        {job.imageUrl ? (
          <div className="h-44 w-full overflow-hidden bg-gray-100">
            <img
              src={job.imageUrl.startsWith('http') ? job.imageUrl : job.imageUrl}
              alt={job.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // fallback if image fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="h-3 bg-gradient-to-r from-blue-500 to-indigo-500" />
        )}

        <div className="p-5">
          {/* Badges */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                isTemporary
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {job.jobType}
            </span>

            {job.category && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                {job.category}
              </span>
            )}
          </div>

          {/* Title */}
          <Link to={`/jobs/${job.id}`}>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {job.title}
            </h3>
          </Link>

          {/* Description snippet */}
          <p className="mt-2 text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {job.description || 'No description provided.'}
          </p>

          {/* Metadata */}
          <div className="mt-4 space-y-2 text-xs text-gray-500">
            {job.location && (
              <div className="flex items-center gap-1.5">
                <FiMapPin className="text-gray-400 shrink-0" />
                <span className="truncate">{job.location}</span>
              </div>
            )}

            {(job.salaryMin !== null || job.salaryMax !== null) && (
              <div className="flex items-center gap-1.5 font-medium text-gray-800">
                <FiDollarSign className="text-emerald-500 shrink-0" />
                <span>
                  ${job.salaryMin?.toLocaleString()}
                  {job.salaryMax ? ` - $${job.salaryMax.toLocaleString()}` : ''}
                  {isTemporary ? ' / gig' : ' / yr'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Poster details */}
      <div className="p-5 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1.5 truncate max-w-[65%]">
          <FiUser className="shrink-0" />
          <span className="truncate">{job.postedBy?.fullName || 'Employer'}</span>
        </div>
        <div className="flex items-center gap-1">
          <FiCalendar className="shrink-0" />
          <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recent'}</span>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
