// Core filter configuration types for the unified filter system

export interface Option {
  value: string;
  label: string;
}

export interface BaseFilterConfig {
  label?: string;
  placeholder?: string;
  className?: string;
}

export interface SearchFilterConfig extends BaseFilterConfig {
  type: 'search';
  storageKey?: string;
  suggestions?: string[];
  debounceMs?: number;
}

export interface SingleSelectFilterConfig extends BaseFilterConfig {
  type: 'single-select';
  options: Option[] | (() => Promise<Option[]>);
  emptyLabel?: string;
}

export interface MultiSelectFilterConfig extends BaseFilterConfig {
  type: 'multi-select';
  options: Option[] | (() => Promise<Option[]>);
  maxDisplayCount?: number;
  searchable?: boolean;
}

export interface DateRangeFilterConfig extends BaseFilterConfig {
  type: 'date-range';
  presets?: Array<{
    label: string;
    value: { from: Date; to: Date };
  }>;
  allowCustomRange?: boolean;
}

export interface BooleanFilterConfig extends BaseFilterConfig {
  type: 'boolean';
  icon?: React.ComponentType<any>;
  variant?: 'outline' | 'default';
}

export interface OrganizationFilterConfig extends BaseFilterConfig {
  type: 'organization';
  organizationType?: 'partner' | 'subcontractor';
  allowClear?: boolean;
}

export type FilterConfig = 
  | SearchFilterConfig
  | SingleSelectFilterConfig  
  | MultiSelectFilterConfig
  | DateRangeFilterConfig
  | BooleanFilterConfig
  | OrganizationFilterConfig;

export interface FilterSection {
  title: string;
  filters: Record<string, FilterConfig>;
}

export interface UnifiedFilterConfig {
  search?: SearchFilterConfig;
  filters?: Record<string, FilterConfig>;
  sections?: {
    essential?: FilterSection;
    advanced?: FilterSection;
  };
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export type FilterValue = 
  | string 
  | string[] 
  | boolean 
  | DateRange 
  | null 
  | undefined;

export type FilterValues = Record<string, FilterValue>;