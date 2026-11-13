import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Job } from '../types';
import toast from 'react-hot-toast';

interface SavedServicesContextType {
  savedJobs: Job[];
  isSaved: (jobId: number) => boolean;
  toggleSave: (job: Job) => void;
  removeSaved: (jobId: number) => void;
  clearSaved: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const SavedServicesContext = createContext<SavedServicesContextType | undefined>(undefined);

const STORAGE_KEY = 'hirejob_saved_services';

export const SavedServicesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [savedJobs, setSavedJobs] = useState<Job[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedJobs));
    } catch (e) {
      console.error('Error saving jobs to localStorage', e);
    }
  }, [savedJobs]);

  const isSaved = (jobId: number): boolean => {
    return savedJobs.some((j) => j.id === jobId);
  };

  const toggleSave = (job: Job) => {
    setSavedJobs((prev) => {
      const exists = prev.some((j) => j.id === job.id);
      if (exists) {
        toast('Removed from saved services', { icon: '🗑️' });
        return prev.filter((j) => j.id !== job.id);
      } else {
        toast.success(`"${job.title}" saved to your remembered services!`, { icon: '❤️' });
        return [job, ...prev];
      }
    });
  };

  const removeSaved = (jobId: number) => {
    setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
    toast('Service removed', { icon: '🗑️' });
  };

  const clearSaved = () => {
    setSavedJobs([]);
    toast('Saved services cleared');
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <SavedServicesContext.Provider
      value={{
        savedJobs,
        isSaved,
        toggleSave,
        removeSaved,
        clearSaved,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </SavedServicesContext.Provider>
  );
};

export const useSavedServices = () => {
  const ctx = useContext(SavedServicesContext);
  if (!ctx) {
    throw new Error('useSavedServices must be used within SavedServicesProvider');
  }
  return ctx;
};

