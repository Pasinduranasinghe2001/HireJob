import React, { useState } from 'react';
import { FiSearch, FiMapPin, FiBriefcase } from 'react-icons/fi';

interface JobSearchProps {
  initialKeyword?: string;
  initialLocation?: string;
  initialType?: string;
  onSearch: (params: { keyword: string; location: string; type: string }) => void;
}

export const JobSearch: React.FC<JobSearchProps> = ({
  initialKeyword = '',
  initialLocation = '',
  initialType = '',
  onSearch,
}) => {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [location, setLocation] = useState(initialLocation);
  const [type, setType] = useState(initialType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ keyword, location, type });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-3 rounded-2xl shadow-lg border border-gray-100 flex flex-col md:flex-row items-stretch gap-2"
    >
      {/* Keyword input */}
      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition">
        <FiSearch className="text-gray-400 w-5 h-5 shrink-0" />
        <input
          type="text"
          placeholder="Job title, keywords, or skills..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none text-gray-800 placeholder-gray-400"
        />
      </div>

      {/* Location input */}
      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition">
        <FiMapPin className="text-gray-400 w-5 h-5 shrink-0" />
        <input
          type="text"
          placeholder="City, state, or location..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none text-gray-800 placeholder-gray-400"
        />
      </div>

      {/* Job Type select */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition md:w-44">
        <FiBriefcase className="text-gray-400 w-5 h-5 shrink-0" />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none text-gray-800"
        >
          <option value="">All Types</option>
          <option value="TEMPORARY">Temporary</option>
          <option value="PERMANENT">Permanent</option>
        </select>
      </div>

      {/* Search button */}
      <button
        type="submit"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
      >
        <FiSearch className="w-4 h-4" />
        Search
      </button>
    </form>
  );
};

export default JobSearch;

