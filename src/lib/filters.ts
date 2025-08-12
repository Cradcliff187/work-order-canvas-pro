// Utilities for standardized admin filters
// - isEmptyFilterValue: determines if a filter field is considered inactive
// - countActiveFilters: counts active (non-empty) fields in a filter object

export function isEmptyFilterValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (typeof v === 'boolean') return v === false; // only true counts as active
  if (typeof v === 'number') return Number.isNaN(v); // numbers are active unless NaN
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') {
    // For nested structures (e.g., date ranges), empty if all inner values are empty
    return Object.values(v as Record<string, unknown>).every(isEmptyFilterValue);
  }
  return false;
}

export function countActiveFilters<T extends Record<string, any>>(obj: T, excludeKeys?: (keyof T | string)[]): number {
  const exclude = new Set<string>((excludeKeys as string[] | undefined) ?? []);
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (exclude.has(key)) return acc;
    return acc + (isEmptyFilterValue(value) ? 0 : 1);
  }, 0);
}
