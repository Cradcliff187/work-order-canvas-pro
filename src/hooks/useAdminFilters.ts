import { useCallback, useEffect, useMemo, useState } from 'react';
import { countActiveFilters } from '@/lib/filters';

interface UseAdminFiltersOptions<T> {
  excludeKeys?: (keyof T)[];
}

export function useAdminFilters<T extends Record<string, any>>(
  storageKey: string,
  initial: T,
  options?: UseAdminFiltersOptions<T>
) {
  const [filters, setFilters] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...initial, ...saved } as T;
      }
    } catch {}
    return initial;
  });

  // Persist all filters
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {}
  }, [storageKey, filters]);

  const clearFilters = useCallback(() => setFilters(initial), [initial]);

  const filterCount = useMemo(() => {
    return countActiveFilters(filters, options?.excludeKeys as string[] | undefined);
  }, [filters, options?.excludeKeys]);

  return { filters, setFilters, clearFilters, filterCount } as const;
}
