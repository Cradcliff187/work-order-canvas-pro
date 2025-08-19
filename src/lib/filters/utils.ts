// Utilities for the unified filter system

import { FilterValue, DateRange } from './types';
import { isEmptyFilterValue as baseIsEmpty } from '../filters';

// Enhanced empty value checker for unified filters
export function isEmptyFilterValue(value: FilterValue): boolean {
  // Handle date range objects specifically
  if (value && typeof value === 'object' && 'from' in value) {
    const dateRange = value as DateRange;
    return !dateRange.from && !dateRange.to;
  }
  
  // Use existing logic for other types
  return baseIsEmpty(value);
}

// Count active filters with enhanced logic
export function countActiveFilters(
  values: Record<string, FilterValue>, 
  excludeKeys: string[] = []
): number {
  const exclude = new Set(excludeKeys);
  
  return Object.entries(values).reduce((count, [key, value]) => {
    if (exclude.has(key)) return count;
    return count + (isEmptyFilterValue(value) ? 0 : 1);
  }, 0);
}

// Create initial filter values from config
export function createInitialValues(
  filterConfig: Record<string, any>
): Record<string, FilterValue> {
  const initial: Record<string, FilterValue> = {};
  
  Object.entries(filterConfig).forEach(([key, config]) => {
    switch (config.type) {
      case 'search':
        initial[key] = '';
        break;
      case 'single-select':
        initial[key] = null;
        break;
      case 'multi-select':
        initial[key] = [];
        break;
      case 'date-range':
        initial[key] = { from: undefined, to: undefined };
        break;
      case 'boolean':
        initial[key] = false;
        break;
      case 'organization':
        initial[key] = null;
        break;
      default:
        initial[key] = null;
    }
  });
  
  return initial;
}

// Generate storage key for page-specific persistence
export function generateStorageKey(pageKey: string, suffix?: string): string {
  const base = `unified-filters-${pageKey}`;
  return suffix ? `${base}-${suffix}` : base;
}

// Deep merge filter values (useful for partial updates)
export function mergeFilterValues(
  current: Record<string, FilterValue>,
  updates: Partial<Record<string, FilterValue>>
): Record<string, FilterValue> {
  return { ...current, ...updates };
}