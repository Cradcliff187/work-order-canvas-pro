import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  FilterValues, 
  FilterValue, 
  UnifiedFilterConfig
} from '@/lib/filters/types';
import {
  createInitialValues,
  countActiveFilters,
  generateStorageKey,
  mergeFilterValues
} from '@/lib/filters/utils';

interface UseUnifiedFiltersOptions {
  excludeFromCount?: string[];
  debounceMs?: number;
}

export interface UseUnifiedFiltersReturn {
  values: FilterValues;
  setValues: (updates: Partial<FilterValues> | ((prev: FilterValues) => FilterValues)) => void;
  setValue: (key: string, value: FilterValue) => void;
  clearFilters: () => void;
  filterCount: number;
  hasActiveFilters: boolean;
}

export function useUnifiedFilters(
  pageKey: string,
  config: UnifiedFilterConfig,
  options: UseUnifiedFiltersOptions = {}
): UseUnifiedFiltersReturn {
  const { excludeFromCount = [], debounceMs = 500 } = options;
  
  // Create initial values from config
  const initialValues = useMemo(() => {
    const allFilters = {
      ...(config.search ? { search: config.search } : {}),
      ...(config.filters || {}),
      ...(config.sections?.essential?.filters || {}),
      ...(config.sections?.advanced?.filters || {})
    };
    return createInitialValues(allFilters);
  }, [config]);

  // Initialize state from localStorage or defaults
  const [values, setValuesState] = useState<FilterValues>(() => {
    const storageKey = generateStorageKey(pageKey);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects for date ranges
        Object.keys(parsed).forEach(key => {
          const value = parsed[key];
          if (value && typeof value === 'object' && ('from' in value || 'to' in value)) {
            if (value.from) value.from = new Date(value.from);
            if (value.to) value.to = new Date(value.to);
          }
        });
        return { ...initialValues, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    }
    return initialValues;
  });

  // Debounced localStorage persistence
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const storageKey = generateStorageKey(pageKey);
      try {
        localStorage.setItem(storageKey, JSON.stringify(values));
      } catch (error) {
        console.warn('Failed to save filters to localStorage:', error);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [values, pageKey, debounceMs]);

  // Update multiple filter values
  const setValues = useCallback((updates: Partial<FilterValues> | ((prev: FilterValues) => FilterValues)) => {
    setValuesState(prev => {
      const next = typeof updates === 'function' ? updates(prev) : mergeFilterValues(prev, updates);
      
      // Only update if values actually changed (deep equality check for performance)
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        return next;
      }
      return prev;
    });
  }, []);

  // Update single filter value
  const setValue = useCallback((key: string, value: FilterValue) => {
    setValues({ [key]: value });
  }, [setValues]);

  // Clear all filters to initial state
  const clearFilters = useCallback(() => {
    setValuesState(initialValues);
  }, [initialValues]);

  // Calculate active filter count
  const filterCount = useMemo(() => {
    return countActiveFilters(values, excludeFromCount);
  }, [values, excludeFromCount]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filterCount > 0;
  }, [filterCount]);

  return {
    values,
    setValues,
    setValue,
    clearFilters,
    filterCount,
    hasActiveFilters
  };
}