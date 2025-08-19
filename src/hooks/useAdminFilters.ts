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
  // Sanitize filters before saving to localStorage
  const sanitizeFilters = (filters: T): Partial<T> => {
    return Object.entries(filters).reduce((acc, [key, value]) => {
      // Check for malformed objects with _type property
      if (value && typeof value === 'object' && '_type' in value) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 Sanitizing corrupted filter: ${key}`, value);
        }
        return acc; // Skip corrupted values
      }
      
      // Skip undefined and null values - they don't need to be persisted
      if (value === undefined || value === null) {
        return acc;
      }
      
      // Keep valid values
      acc[key as keyof T] = value;
      return acc;
    }, {} as Partial<T>);
  };

  // Validate and clean filters when loading from localStorage
  const validateAndCleanFilters = (parsed: any): Partial<T> => {
    const cleaned = { ...parsed };
    
    Object.keys(cleaned).forEach(key => {
      // Remove corrupted objects with _type property
      if (cleaned[key] && typeof cleaned[key] === 'object' && '_type' in cleaned[key]) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 Removing corrupted filter during load: ${key}`, cleaned[key]);
        }
        delete cleaned[key];
      }
    });
    
    return cleaned;
  };
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
        
        // Clean any corrupted values
        const cleanedParsed = validateAndCleanFilters(parsed);
        
        if (process.env.NODE_ENV === 'development' && mountCountRef.current <= 3) {
          console.group(`📦 useAdminFilters(${storageKey})`);
          console.log('Raw from storage:', parsed);
          console.log('Cleaned filters:', cleanedParsed);
          console.log('Mount count:', mountCountRef.current);
          console.groupEnd();
        }
        return { ...initialFilters, ...cleanedParsed };
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
      // Sanitize filters before saving
      const cleanFilters = sanitizeFilters(filters);
      localStorage.setItem(storageKey, JSON.stringify(cleanFilters));
      if (process.env.NODE_ENV === 'development') {
        console.log(`💾 ${storageKey}: Saved sanitized filters to storage`, cleanFilters);
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
