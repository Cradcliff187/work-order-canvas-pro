import { useState, useCallback, useMemo, useEffect } from 'react';
import { countActiveFilters } from '@/lib/filters';

interface UseAdminFiltersOptions<T> {
  excludeKeys?: (keyof T)[];
}

export function useAdminFilters<T extends Record<string, any>>(
  storageKey: string,
  initialFilters: T,
  options?: UseAdminFiltersOptions<T>
) {
  // Initialize from localStorage only once
  const [filters, setFiltersInternal] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📦 Loaded filters from storage:', storageKey, parsed);
        return { ...initialFilters, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load filters from storage:', error);
    }
    return initialFilters;
  });

  // Stable setFilters with equality check
  const setFilters = useCallback((update: T | ((prev: T) => T)) => {
    setFiltersInternal((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      
      // Deep equality check to prevent unnecessary updates
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        console.log('🔒 Filters unchanged, skipping update');
        return prev;
      }
      
      console.log('✅ Filters updated:', { from: prev, to: next });
      return next;
    });
  }, []); // Empty deps - function is stable

  // Stable clearFilters
  const clearFilters = useCallback(() => {
    console.log('🧹 Clearing filters');
    setFiltersInternal(initialFilters);
  }, [JSON.stringify(initialFilters)]); // Serialize for stability

  // Save to localStorage with debounce to prevent rapid writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(filters));
      console.log('💾 Saved filters to storage:', storageKey);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [storageKey, filters]);

  // Calculate filter count
  const filterCount = useMemo(() => {
    return countActiveFilters(filters, options?.excludeKeys as string[] | undefined);
  }, [filters, options?.excludeKeys]);

  return {
    filters,
    setFilters,
    clearFilters,
    filterCount
  } as const;
}
