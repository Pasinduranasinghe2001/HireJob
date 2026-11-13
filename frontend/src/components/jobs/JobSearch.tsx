import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiSearch, FiMapPin, FiBriefcase, FiChevronDown, FiX } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';
import {
  POPULAR_SERVICES,
  SRI_LANKA_LOCATIONS,
  matchesFuzzy,
  normalizeServiceQuery,
} from '../../utils/fuzzySearch';

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
  const { t } = useLanguage();

  const [keyword, setKeyword] = useState(initialKeyword);
  const [location, setLocation] = useState(
    initialLocation && initialLocation !== 'Entire Sri Lanka (All Country)'
      ? initialLocation
      : 'Entire Sri Lanka (All Country)'
  );
  const [type, setType] = useState(initialType);

  // Dropdown states
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const serviceRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setShowServiceDropdown(false);
      }
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Services List based on user manual input (with Fuzzy / Prefix / Typo matching)
  const filteredServices = useMemo(() => {
    if (!keyword.trim()) return POPULAR_SERVICES;
    const q = keyword.trim().toLowerCase();

    return POPULAR_SERVICES.filter((svc) => {
      // 1. Check service name
      if (matchesFuzzy(q, svc.name)) return true;
      // 2. Check category
      if (matchesFuzzy(q, svc.category)) return true;
      // 3. Check keywords
      return svc.keywords.some((kw) => matchesFuzzy(q, kw));
    });
  }, [keyword]);

  // Filtered Locations List
  const filteredLocations = useMemo(() => {
    if (!location.trim() || location === 'Entire Sri Lanka (All Country)') {
      return SRI_LANKA_LOCATIONS;
    }
    const q = location.trim().toLowerCase();
    return SRI_LANKA_LOCATIONS.filter((loc) => matchesFuzzy(q, loc));
  }, [location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowServiceDropdown(false);
    setShowLocationDropdown(false);

    // Normalize keyword for common typos (e.g., celaning -> cleaning)
    const normalizedKeyword = normalizeServiceQuery(keyword);

    // If location is default "Entire Sri Lanka (All Country)", pass empty string to show all country results
    const normalizedLocation =
      location.trim() === 'Entire Sri Lanka (All Country)' || !location.trim()
        ? ''
        : location.trim();

    onSearch({
      keyword: normalizedKeyword,
      location: normalizedLocation,
      type,
    });
  };

  const handleSelectService = (serviceName: string) => {
    setKeyword(serviceName);
    setShowServiceDropdown(false);
  };

  const handleSelectLocation = (locName: string) => {
    setLocation(locName);
    setShowLocationDropdown(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-stretch gap-2 transition-colors relative"
    >
      {/* 1. Keyword / Service Combobox */}
      <div ref={serviceRef} className="flex-1 relative">
        <div
          onClick={() => setShowServiceDropdown(true)}
          className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white dark:focus-within:bg-gray-700 transition cursor-text border border-transparent focus-within:border-blue-500"
        >
          <FiSearch className="text-gray-400 dark:text-gray-300 w-5 h-5 shrink-0" />
          <input
            type="text"
            placeholder="Search services or jobs..."
            value={keyword}
            onFocus={() => setShowServiceDropdown(true)}
            onChange={(e) => {
              setKeyword(e.target.value);
              setShowServiceDropdown(true);
            }}
            className="w-full bg-transparent text-sm focus:outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 font-medium"
          />
          {keyword && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setKeyword('');
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowServiceDropdown((prev) => !prev);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Browse services list"
          >
            <FiChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Services List Dropdown */}
        {showServiceDropdown && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-72 overflow-y-auto z-40 p-2 divide-y divide-gray-100 dark:divide-gray-700/50">
            <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Scroll & select or type service</span>
              <span>{filteredServices.length} found</span>
            </div>

            <div className="pt-1 space-y-0.5">
              {filteredServices.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  No predefined service matched "{keyword}". Press Search to query custom listings.
                </div>
              ) : (
                filteredServices.map((svc) => (
                  <button
                    key={svc.name}
                    type="button"
                    onClick={() => handleSelectService(svc.category)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-blue-50 dark:hover:bg-gray-700/70 transition flex items-center justify-between group cursor-pointer"
                  >
                    <p className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {svc.name}
                    </p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {svc.category}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Location Combobox with Default Entire Country */}
      <div ref={locationRef} className="flex-1 relative">
        <div
          onClick={() => setShowLocationDropdown(true)}
          className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white dark:focus-within:bg-gray-700 transition cursor-text border border-transparent focus-within:border-blue-500"
        >
          <FiMapPin className="text-gray-400 dark:text-gray-300 w-5 h-5 shrink-0" />
          <input
            type="text"
            placeholder="Location (Default: Entire Country)"
            value={location}
            onFocus={() => setShowLocationDropdown(true)}
            onChange={(e) => {
              setLocation(e.target.value);
              setShowLocationDropdown(true);
            }}
            className="w-full bg-transparent text-sm focus:outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 font-medium"
          />
          {location && location !== 'Entire Sri Lanka (All Country)' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLocation('Entire Sri Lanka (All Country)');
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              title="Reset to Entire Country"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowLocationDropdown((prev) => !prev);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Browse locations"
          >
            <FiChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Locations List Dropdown */}
        {showLocationDropdown && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-72 overflow-y-auto z-40 p-2 divide-y divide-gray-100 dark:divide-gray-700/50">
            <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Select District or City</span>
              <span>{filteredLocations.length} locations</span>
            </div>

            <div className="pt-1 space-y-0.5">
              {filteredLocations.map((loc) => {
                const isEntireCountry = loc.includes('Entire Sri Lanka');
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleSelectLocation(loc)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition flex items-center justify-between cursor-pointer ${
                      location === loc
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/70 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <span>{loc}</span>
                    {isEntireCountry && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                        Default (All)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Job Type select */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white dark:focus-within:bg-gray-700 transition md:w-44 border border-transparent">
        <FiBriefcase className="text-gray-400 dark:text-gray-300 w-5 h-5 shrink-0" />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none text-gray-800 dark:text-gray-100 cursor-pointer font-medium"
        >
          <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            {t('search.allTypes')}
          </option>
          <option value="TEMPORARY" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            {t('search.temporary')}
          </option>
          <option value="PERMANENT" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            {t('search.permanent')}
          </option>
        </select>
      </div>

      {/* Search Submit button */}
      <button
        type="submit"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
      >
        <FiSearch className="w-4 h-4" />
        <span>{t('search.button')}</span>
      </button>
    </form>
  );
};

export default JobSearch;
