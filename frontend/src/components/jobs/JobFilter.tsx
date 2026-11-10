import React from 'react';

interface JobFilterProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onReset: () => void;
}

export const JobFilter: React.FC<JobFilterProps> = ({
  selectedType,
  onTypeChange,
  categories,
  selectedCategory,
  onCategoryChange,
  onReset,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
        <button
          onClick={onReset}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Reset All
        </button>
      </div>

      {/* Job Type filter */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Job Type
        </label>
        <div className="space-y-2">
          {[
            { label: 'All Types', value: '' },
            { label: 'Permanent', value: 'PERMANENT' },
            { label: 'Temporary', value: 'TEMPORARY' },
          ].map((item) => (
            <label key={item.value} className="flex items-center text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="jobType"
                checked={selectedType === item.value}
                onChange={() => onTypeChange(item.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-2"
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Category
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            <label className="flex items-center text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="category"
                checked={selectedCategory === ''}
                onChange={() => onCategoryChange('')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-2"
              />
              All Categories
            </label>
            {categories.map((cat) => (
              <label key={cat} className="flex items-center text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === cat}
                  onChange={() => onCategoryChange(cat)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-2"
                />
                {cat}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobFilter;

