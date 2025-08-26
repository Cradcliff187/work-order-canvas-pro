import React, { useMemo, useState } from 'react';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface ReportFiltersValue {
  search?: string;
  status?: string[];
  date_range?: {
    from?: string;
    to?: string;
  };
  submitted_by?: string;
}

interface UnifiedReportFiltersProps {
  filters: ReportFiltersValue;
  onFiltersChange: (filters: ReportFiltersValue) => void;
  onClear: () => void;
}

const REPORT_STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export function UnifiedReportFilters({
  filters,
  onFiltersChange,
  onClear
}: UnifiedReportFiltersProps) {
  const [dateFromPopoverOpen, setDateFromPopoverOpen] = useState(false);
  const [dateToPopoverOpen, setDateToPopoverOpen] = useState(false);

  // Calculate filter count
  const filterCount = useMemo(() => {
    let count = 0;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.date_range?.from || filters.date_range?.to) count++;
    if (filters.submitted_by) count++;
    return count;
  }, [filters]);

  // Filter change handlers
  const handleArrayFilterChange = (key: keyof ReportFiltersValue, values: string[]) => {
    onFiltersChange({
      ...filters,
      [key]: values.length > 0 ? values : undefined
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    onFiltersChange({
      ...filters,
      search: search || undefined
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      date_range: {
        ...filters.date_range,
        from: date ? date.toISOString().split('T')[0] : undefined
      }
    });
    setDateFromPopoverOpen(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      date_range: {
        ...filters.date_range,
        to: date ? date.toISOString().split('T')[0] : undefined
      }
    });
    setDateToPopoverOpen(false);
  };

  const handleSubmittedByChange = (value: string) => {
    onFiltersChange({
      ...filters,
      submitted_by: value || undefined
    });
  };

  const clearDateRange = () => {
    onFiltersChange({
      ...filters,
      date_range: undefined
    });
  };

  // Essential filters
  const essentialFilters = (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <MultiSelectFilter
          options={REPORT_STATUSES}
          selectedValues={filters.status || []}
          onSelectionChange={(values) => handleArrayFilterChange('status', values)}
          placeholder="All statuses"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Date Range</label>
        <div className="flex gap-2">
          <Popover open={dateFromPopoverOpen} onOpenChange={setDateFromPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal",
                  !filters.date_range?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.date_range?.from ? (
                  format(new Date(filters.date_range.from), "MMM dd, yyyy")
                ) : (
                  <span>From date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.date_range?.from ? new Date(filters.date_range.from) : undefined}
                onSelect={handleDateFromChange}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Popover open={dateToPopoverOpen} onOpenChange={setDateToPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal",
                  !filters.date_range?.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.date_range?.to ? (
                  format(new Date(filters.date_range.to), "MMM dd, yyyy")
                ) : (
                  <span>To date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.date_range?.to ? new Date(filters.date_range.to) : undefined}
                onSelect={handleDateToChange}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {(filters.date_range?.from || filters.date_range?.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDateRange}
            className="w-full"
          >
            Clear date range
          </Button>
        )}
      </div>
    </div>
  );

  // Advanced filters
  const advancedFilters = (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Submitted By</label>
        <Input
          value={filters.submitted_by || ''}
          onChange={(e) => handleSubmittedByChange(e.target.value)}
          placeholder="Enter submitter name..."
        />
      </div>
    </div>
  );

  return (
    <AdminFilterBar
      title="Report Filters"
      filterCount={filterCount}
      onClear={onClear}
      sections={{
        essential: essentialFilters,
        advanced: advancedFilters
      }}
    />
  );
}