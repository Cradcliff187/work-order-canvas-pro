import React, { useState, useMemo } from 'react';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange as ReactDayPickerDateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AdminFilterBar } from './AdminFilterBar';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '../OrganizationSelector';

import type {
  FilterConfig,
  FilterValues,
  FilterValue,
  DateRange,
  UnifiedFilterConfig,
  SearchFilterConfig,
  SingleSelectFilterConfig,
  MultiSelectFilterConfig,
  DateRangeFilterConfig,
  BooleanFilterConfig,
  OrganizationFilterConfig,
  Option
} from '@/lib/filters/types';

interface UnifiedFilterBarProps {
  title: string;
  config: UnifiedFilterConfig;
  values: FilterValues;
  onChange: (key: string, value: FilterValue) => void;
  onClear: () => void;
  filterCount: number;
  className?: string;
  collapsible?: boolean;
}

// Individual filter component renderers
function SearchFilter({ 
  config, 
  value, 
  onChange 
}: { 
  config: SearchFilterConfig; 
  value: string; 
  onChange: (value: string) => void; 
}) {
  return (
    <SmartSearchInput
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onSearchSubmit={onChange}
      placeholder={config.placeholder || 'Search...'}
      storageKey={config.storageKey}
      className="w-full"
    />
  );
}

function SingleSelectFilter({ 
  config, 
  value, 
  onChange 
}: { 
  config: SingleSelectFilterConfig; 
  value: string | null; 
  onChange: (value: string | null) => void; 
}) {
  // Handle both static and async options
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (Array.isArray(config.options)) {
      setOptions(config.options);
    } else {
      setLoading(true);
      config.options().then(setOptions).finally(() => setLoading(false));
    }
  }, [config.options]);

  return (
    <Select value={value || ''} onValueChange={(val) => onChange(val || null)}>
      <SelectTrigger className="min-w-40">
        <SelectValue placeholder={config.placeholder || 'Select...'} />
      </SelectTrigger>
      <SelectContent>
        {config.emptyLabel && (
          <SelectItem value="">{config.emptyLabel}</SelectItem>
        )}
        {loading ? (
          <SelectItem value="" disabled>Loading...</SelectItem>
        ) : (
          options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function MultiSelectFilterComponent({ 
  config, 
  value, 
  onChange 
}: { 
  config: MultiSelectFilterConfig; 
  value: string[]; 
  onChange: (value: string[]) => void; 
}) {
  // Handle both static and async options
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (Array.isArray(config.options)) {
      setOptions(config.options);
    } else {
      setLoading(true);
      config.options().then(setOptions).finally(() => setLoading(false));
    }
  }, [config.options]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading options...</div>;
  }

  return (
    <MultiSelectFilter
      options={options}
      selectedValues={value}
      onSelectionChange={onChange}
      placeholder={config.placeholder || 'Select options...'}
      maxDisplayCount={config.maxDisplayCount}
      className="min-w-48"
    />
  );
}

function DateRangeFilter({ 
  config, 
  value, 
  onChange 
}: { 
  config: DateRangeFilterConfig; 
  value: DateRange; 
  onChange: (value: DateRange) => void; 
}) {
  const formatDateRange = (range: DateRange) => {
    if (!range.from) return config.placeholder || 'Select date range';
    if (!range.to) return format(range.from, 'LLL dd, y');
    return `${format(range.from, 'LLL dd, y')} - ${format(range.to, 'LLL dd, y')}`;
  };

  const reactDayPickerRange: ReactDayPickerDateRange | undefined = useMemo(() => {
    if (!value.from && !value.to) return undefined;
    return { from: value.from, to: value.to };
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      {config.presets && (
        <Select
          value=""
          onValueChange={(presetKey) => {
            const preset = config.presets?.find(p => p.label === presetKey);
            if (preset) {
              onChange(preset.value);
            }
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Presets" />
          </SelectTrigger>
          <SelectContent>
            {config.presets.map((preset) => (
              <SelectItem key={preset.label} value={preset.label}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-60',
              !value.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value.from}
            selected={reactDayPickerRange}
            onSelect={(range) => {
              onChange({
                from: range?.from,
                to: range?.to
              });
            }}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function BooleanFilter({ 
  config, 
  value, 
  onChange 
}: { 
  config: BooleanFilterConfig; 
  value: boolean; 
  onChange: (value: boolean) => void; 
}) {
  const Icon = config.icon;
  
  return (
    <Button
      type="button"
      variant={value ? 'default' : (config.variant || 'outline')}
      onClick={() => onChange(!value)}
      className="flex items-center gap-2"
    >
      {Icon && <Icon className="h-4 w-4" />}
      {config.label || 'Toggle'}
    </Button>
  );
}

function OrganizationFilter({ 
  config, 
  value, 
  onChange 
}: { 
  config: OrganizationFilterConfig; 
  value: string | null; 
  onChange: (value: string | null) => void; 
}) {
  return (
    <OrganizationSelector
      value={value}
      onChange={onChange}
      organizationType={config.organizationType}
      placeholder={config.placeholder || 'Select organization...'}
      className="min-w-48"
    />
  );
}

// Main filter renderer
function FilterRenderer({ 
  filterKey, 
  config, 
  value, 
  onChange 
}: { 
  filterKey: string; 
  config: FilterConfig; 
  value: FilterValue; 
  onChange: (value: FilterValue) => void; 
}) {
  switch (config.type) {
    case 'search':
      return (
        <SearchFilter
          config={config}
          value={(value as string) || ''}
          onChange={onChange}
        />
      );
    case 'single-select':
      return (
        <SingleSelectFilter
          config={config}
          value={value as string | null}
          onChange={onChange}
        />
      );
    case 'multi-select':
      return (
        <MultiSelectFilterComponent
          config={config}
          value={(value as string[]) || []}
          onChange={onChange}
        />
      );
    case 'date-range':
      return (
        <DateRangeFilter
          config={config}
          value={(value as DateRange) || { from: undefined, to: undefined }}
          onChange={onChange}
        />
      );
    case 'boolean':
      return (
        <BooleanFilter
          config={config}
          value={Boolean(value)}
          onChange={onChange}
        />
      );
    case 'organization':
      return (
        <OrganizationFilter
          config={config}
          value={value as string | null}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

export function UnifiedFilterBar({
  title,
  config,
  values,
  onChange,
  onClear,
  filterCount,
  className,
  collapsible = true
}: UnifiedFilterBarProps) {
  // Render search slot if configured
  const searchSlot = config.search ? (
    <SearchFilter
      config={config.search}
      value={(values.search as string) || ''}
      onChange={(value) => onChange('search', value)}
    />
  ) : undefined;

  // Render essential filters
  const essentialFilters = config.sections?.essential ? (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-foreground">
        {config.sections.essential.title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(config.sections.essential.filters).map(([key, filterConfig]) => (
          <div key={key} className="space-y-2">
            {(filterConfig as any).label && (
              <label className="text-sm font-medium text-foreground">
                {(filterConfig as any).label}
              </label>
            )}
            <FilterRenderer
              filterKey={key}
              config={filterConfig}
              value={values[key]}
              onChange={(value) => onChange(key, value)}
            />
          </div>
        ))}
      </div>
    </div>
  ) : undefined;

  // Render advanced filters
  const advancedFilters = config.sections?.advanced ? (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-foreground">
        {config.sections.advanced.title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(config.sections.advanced.filters).map(([key, filterConfig]) => (
          <div key={key} className="space-y-2">
            {(filterConfig as any).label && (
              <label className="text-sm font-medium text-foreground">
                {(filterConfig as any).label}
              </label>
            )}
            <FilterRenderer
              filterKey={key}
              config={filterConfig}
              value={values[key]}
              onChange={(value) => onChange(key, value)}
            />
          </div>
        ))}
      </div>
    </div>
  ) : undefined;

  // Render standalone filters (not in sections)
  const standaloneFilters = config.filters ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(config.filters).map(([key, filterConfig]) => (
        <div key={key} className="space-y-2">
          {(filterConfig as any).label && (
            <label className="text-sm font-medium text-foreground">
              {(filterConfig as any).label}
            </label>
          )}
          <FilterRenderer
            filterKey={key}
            config={filterConfig}
            value={values[key]}
            onChange={(value) => onChange(key, value)}
          />
        </div>
      ))}
    </div>
  ) : undefined;

  // Combine sections for AdminFilterBar
  const sectionsForBar = essentialFilters || advancedFilters ? {
    essential: essentialFilters,
    advanced: advancedFilters
  } : undefined;

  return (
    <AdminFilterBar
      title={title}
      filterCount={filterCount}
      onClear={onClear}
      className={className}
      collapsible={collapsible}
      searchSlot={searchSlot}
      sections={sectionsForBar}
    >
      {standaloneFilters}
    </AdminFilterBar>
  );
}

export default UnifiedFilterBar;