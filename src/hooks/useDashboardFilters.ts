import { useState, useEffect } from 'react';

export interface DashboardFilters {
  showMyWorkOnly: boolean;
  hideCompleted: boolean;
  showProjects: boolean;
  showWorkOrders: boolean;
}

const DEFAULT_FILTERS: DashboardFilters = {
  showMyWorkOnly: false,
  hideCompleted: true,
  showProjects: true,
  showWorkOrders: true,
};

const STORAGE_KEY = 'employee-dashboard-filters';

export function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_FILTERS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load dashboard filters from localStorage:', error);
    }
    return DEFAULT_FILTERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save dashboard filters to localStorage:', error);
    }
  }, [filters]);

  const updateFilter = (key: keyof DashboardFilters, value: boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    filters,
    updateFilter,
    resetFilters,
  };
}