import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { countActiveFilters } from '@/lib/filters';

interface UseAdminFiltersOptions<T> {
  excludeKeys?: (keyof T)[];
}

export function useAdminFilters<T extends Record<string, any>>(
  storageKey: string,
  initialFilters: T,
  options?: UseAdminFiltersOptions<T>
) {
  // Track mount count to detect excessive re-renders
  const mountCountRef = useRef(0);
  const lastLoadTimeRef = useRef(0);
  
  // Initialize from localStorage only once
  const [filters, setFiltersInternal] = useState<T>(() => {
    mountCountRef.current++;
    const now = Date.now();
    
    // Warn about excessive re-renders in development
    if (process.env.NODE_ENV === 'development') {
      if (now - lastLoadTimeRef.current < 100 && mountCountRef.current > 5) {
        console.warn(`⚠️ useAdminFilters(${storageKey}) mounted ${mountCountRef.current} times rapidly. Possible re-render loop detected.`);
      }
      lastLoadTimeRef.current = now;
    }
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (process.env.NODE_ENV === 'development' && mountCountRef.current <= 3) {
          console.group(`📦 useAdminFilters(${storageKey})`);
          console.log('Loaded from storage:', parsed);
          console.log('Mount count:', mountCountRef.current);
          console.groupEnd();
        }
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
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔒 ${storageKey}: Filters unchanged, skipping update`);
        }
        return prev;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.group(`✅ ${storageKey}: Filters updated`);
        console.log('From:', prev);
        console.log('To:', next);
        console.groupEnd();
      }
      return next;
    });
  }, [storageKey]); // Include storageKey for better logging

  // Stable clearFilters
  const clearFilters = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧹 ${storageKey}: Clearing filters`);
    }
    setFiltersInternal(initialFilters);
  }, [storageKey, JSON.stringify(initialFilters)]); // Serialize for stability

  // Save to localStorage with debounce to prevent rapid writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(filters));
      if (process.env.NODE_ENV === 'development') {
        console.log(`💾 ${storageKey}: Saved filters to storage`);
      }
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
