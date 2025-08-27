import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Input } from '@/components/ui/input';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllAssignees } from '@/hooks/useEmployeesForAssignment';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';

export interface WorkOrderFiltersValue {
  search?: string;
  status?: string[];
  priority?: string[];
  organizations?: string[];
  trades?: string[];
  location_filter?: string[];
  location?: string[];
  completed_by?: string[];
  date_from?: string;
  date_to?: string;
  date_range?: {
    from?: string;
    to?: string;
  };
}

interface FilterConfig {
  statusOptions?: { value: string; label: string }[];
  showPriority?: boolean;
  showCompleted?: boolean;
  showSubmittedBy?: boolean;
  showWorkOrder?: boolean;
  completedByLabel?: string;
}

interface WorkOrderFiltersV2Props {
  value: WorkOrderFiltersValue;
  onChange: (filters: WorkOrderFiltersValue) => void;
  onClear?: () => void;
  filterCount: number;
  config?: FilterConfig;
}

const defaultWorkOrderStatusOptions = [
  { value: 'received', label: 'Received' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'estimate_needed', label: 'Estimate Needed' },
  { value: 'estimate_approved', label: 'Estimate Approved' },
];

export const defaultReportStatusOptions = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function WorkOrderFiltersV2({ 
  value,
  onChange,
  onClear,
  filterCount,
  config = {}
}: WorkOrderFiltersV2Props) {
  const {
    statusOptions = defaultWorkOrderStatusOptions,
    showPriority = false,
    showCompleted = true,
    showSubmittedBy = false,
    showWorkOrder = false,
    completedByLabel = "Completed By"
  } = config;
  const { data: organizations } = useOrganizationsForWorkOrders();
  const { data: trades } = useTrades();
  const { data: subcontractors } = useQuery({
    queryKey: ['subcontractor-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('organization_type', 'subcontractor')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
  const { employees: assignees } = useAllAssignees();
  const { data: locations } = usePartnerLocations();

  const [locationTextInput, setLocationTextInput] = useState('');

  // Date picker states
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  // Use passed filterCount instead of calculating internally

  // Prepare option arrays
  const organizationOptions = organizations?.map(org => ({
    value: org.id,
    label: org.name
  })) || [];

  const tradeOptions = trades?.map(trade => ({
    value: trade.id,
    label: trade.name
  })) || [];

  const completedByOptions = [
    { value: 'internal', label: 'Internal' },
    ...(subcontractors?.map(sub => ({
      value: sub.id,
      label: sub.name
    })) || [])
  ];

  const locationOptions = useMemo(() => {
    const allLocations = (locations || []).map(loc => loc.location_name).filter(Boolean);
    const uniqueLocations = Array.from(new Set(allLocations));
    return uniqueLocations.map(loc => ({ value: loc, label: loc }));
  }, [locations]);

  // Handle filter changes
  const handleFilterChange = (key: string, filterValue: string[]) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  };

  const handleStringFilterChange = (key: string, filterValue: string) => {
    onChange({
      ...value,
      [key]: filterValue || undefined
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    if (value.date_range !== undefined) {
      // Handle reports date_range format
      onChange({
        ...value,
        date_range: {
          ...value.date_range,
          from: date ? format(date, 'yyyy-MM-dd') : undefined
        }
      });
    } else {
      // Handle work orders date_from format
      onChange({
        ...value,
        date_from: date ? format(date, 'yyyy-MM-dd') : undefined
      });
    }
    setDateFromOpen(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (value.date_range !== undefined) {
      // Handle reports date_range format
      onChange({
        ...value,
        date_range: {
          ...value.date_range,
          to: date ? format(date, 'yyyy-MM-dd') : undefined
        }
      });
    } else {
      // Handle work orders date_to format
      onChange({
        ...value,
        date_to: date ? format(date, 'yyyy-MM-dd') : undefined
      });
    }
    setDateToOpen(false);
  };

  const handleLocationTextSubmit = () => {
    if (locationTextInput.trim()) {
      const locationKey = value.location_filter !== undefined ? 'location_filter' : 'location';
      const current = value[locationKey] || [];
      const currentArray = Array.isArray(current) ? current : [current].filter(Boolean);
      if (!currentArray.includes(locationTextInput.trim())) {
        handleFilterChange(locationKey, [...currentArray, locationTextInput.trim()]);
      }
      setLocationTextInput('');
    }
  };

  // No search slot - search moved to table controls

  // Essential filters (always visible in sections)
  const essentialFilters = (
    <>
      {/* Status Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <MultiSelectFilter
          options={statusOptions}
          selectedValues={value.status || []}
          onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
          placeholder="Filter by status..."
          className="h-10"
        />
      </div>

      {/* Organization Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Organization</label>
        <MultiSelectFilter
          options={organizationOptions}
          selectedValues={value.organizations || []}
          onSelectionChange={(filterValue) => handleFilterChange('organizations', filterValue)}
          placeholder="Filter by organization..."
          className="h-10"
        />
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date Range</label>
        <div className="flex gap-2">
          <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-start text-left font-normal h-10"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.date_from || value.date_range?.from ? format(new Date(value.date_from || value.date_range?.from), 'MMM dd, yyyy') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.date_from || value.date_range?.from ? new Date(value.date_from || value.date_range?.from) : undefined}
                onSelect={handleDateFromChange}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-start text-left font-normal h-10"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.date_to || value.date_range?.to ? format(new Date(value.date_to || value.date_range?.to), 'MMM dd, yyyy') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.date_to || value.date_range?.to ? new Date(value.date_to || value.date_range?.to) : undefined}
                onSelect={handleDateToChange}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        {(value.date_from || value.date_to || value.date_range?.from || value.date_range?.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (value.date_range !== undefined) {
                onChange({
                  ...value,
                  date_range: { from: undefined, to: undefined }
                });
              } else {
                onChange({
                  ...value,
                  date_from: undefined,
                  date_to: undefined
                });
              }
            }}
            className="h-8 px-2 lg:px-3"
          >
            <X className="h-4 w-4 mr-1" />
            Clear dates
          </Button>
        )}
      </div>
    </>
  );
  // Advanced filters (collapsible)
  const advancedFilters = (
    <>
      {/* Trades Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Trades</label>
        <MultiSelectFilter
          options={tradeOptions}
          selectedValues={value.trades || []}
          onSelectionChange={(filterValue) => handleFilterChange('trades', filterValue)}
          placeholder="Filter by trades..."
          className="h-10"
        />
      </div>

      {/* Location Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Locations</label>
        <div className="space-y-2">
          <MultiSelectFilter
            options={locationOptions}
            selectedValues={value.location_filter || value.location || []}
            onSelectionChange={(filterValue) => handleFilterChange(value.location_filter !== undefined ? 'location_filter' : 'location', filterValue)}
            placeholder="Select locations..."
            className="h-10"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Add custom location..."
              value={locationTextInput}
              onChange={(e) => setLocationTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLocationTextSubmit();
                }
              }}
              className="h-10 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLocationTextSubmit}
              disabled={!locationTextInput.trim()}
              className="h-10"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Priority Filter */}
      {showPriority && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <MultiSelectFilter
            options={priorityOptions}
            selectedValues={value.priority || []}
            onSelectionChange={(filterValue) => handleFilterChange('priority', filterValue)}
            placeholder="Filter by priority..."
            className="h-10"
          />
        </div>
      )}

      {/* Completed By Filter */}
      {showCompleted && (
        <div className="space-y-2">
          <label className="text-sm font-medium">{completedByLabel}</label>
          <MultiSelectFilter
            options={completedByOptions}
            selectedValues={value.completed_by || []}
            onSelectionChange={(filterValue) => handleFilterChange('completed_by', filterValue)}
            placeholder="Filter by completion..."
            className="h-10"
          />
        </div>
      )}
    </>
  );

  return (
    <AdminFilterBar
      title="Filters"
      filterCount={filterCount}
      onClear={onClear}
      sheetSide="bottom"
      collapsible={true}
      sections={{
        essential: essentialFilters,
        advanced: advancedFilters
      }}
    />
  );
}

export default WorkOrderFiltersV2;