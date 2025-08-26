import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Input } from '@/components/ui/input';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllAssignees } from '@/hooks/useEmployeesForAssignment';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';

interface FilterConfig {
  statusOptions?: { value: string; label: string }[];
  showPriority?: boolean;
  showCompleted?: boolean;
  showSubmittedBy?: boolean;
  showWorkOrder?: boolean;
  searchPlaceholder?: string;
  searchStorageKey?: string;
  completedByLabel?: string;
}

interface WorkOrderFiltersV2Props {
  filters: any;
  searchTerm: string;
  onFiltersChange: (filters: any) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
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
  filters, 
  searchTerm, 
  onFiltersChange, 
  onSearchChange, 
  onClearFilters,
  config = {}
}: WorkOrderFiltersV2Props) {
  const {
    statusOptions = defaultWorkOrderStatusOptions,
    showPriority = false,
    showCompleted = true,
    showSubmittedBy = false,
    showWorkOrder = false,
    searchPlaceholder = "Search work orders, locations, or descriptions...",
    searchStorageKey = "admin-work-orders-search",
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

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    const baseCount = Object.values(filters).filter(value => 
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    ).length + (searchTerm ? 1 : 0);
    return baseCount;
  }, [filters, searchTerm]);

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
  const handleFilterChange = (key: string, value: string[]) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleStringFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    if (filters.date_range !== undefined) {
      // Handle reports date_range format
      onFiltersChange({
        ...filters,
        date_range: {
          ...filters.date_range,
          from: date ? format(date, 'yyyy-MM-dd') : undefined
        }
      });
    } else {
      // Handle work orders date_from format
      onFiltersChange({
        ...filters,
        date_from: date ? format(date, 'yyyy-MM-dd') : undefined
      });
    }
    setDateFromOpen(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (filters.date_range !== undefined) {
      // Handle reports date_range format
      onFiltersChange({
        ...filters,
        date_range: {
          ...filters.date_range,
          to: date ? format(date, 'yyyy-MM-dd') : undefined
        }
      });
    } else {
      // Handle work orders date_to format
      onFiltersChange({
        ...filters,
        date_to: date ? format(date, 'yyyy-MM-dd') : undefined
      });
    }
    setDateToOpen(false);
  };

  const handleLocationTextSubmit = () => {
    if (locationTextInput.trim()) {
      const locationKey = filters.location_filter !== undefined ? 'location_filter' : 'location';
      const current = filters[locationKey] || [];
      const currentArray = Array.isArray(current) ? current : [current].filter(Boolean);
      if (!currentArray.includes(locationTextInput.trim())) {
        handleFilterChange(locationKey, [...currentArray, locationTextInput.trim()]);
      }
      setLocationTextInput('');
    }
  };

  // Search slot component
  const searchSlot = (
    <SmartSearchInput
      placeholder={searchPlaceholder}
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      onSearchSubmit={onSearchChange}
      storageKey={searchStorageKey}
      aria-label="Search"
      className="w-full"
    />
  );

  // Essential filters (always visible in sections)
  const essentialFilters = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Status</label>
        <MultiSelectFilter
          placeholder="Select status"
          options={statusOptions}
          selectedValues={filters.status || []}
          onSelectionChange={(values) => handleFilterChange('status', values)}
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Organization</label>
        <MultiSelectFilter
          placeholder="Select organization"
          options={organizationOptions}
          selectedValues={filters.partner_organization_ids || []}
          onSelectionChange={(values) => handleFilterChange('partner_organization_ids', values)}
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Date Range</label>
        <div className="space-y-2">
          <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal w-full h-10">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {(filters.date_from || filters.date_range?.from) ? 
                  format(new Date(filters.date_from || filters.date_range?.from), 'MMM dd, yyyy') : 'From date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={(filters.date_from || filters.date_range?.from) ? 
                  new Date(filters.date_from || filters.date_range?.from) : undefined}
                onSelect={handleDateFromChange}
                disabled={(date) =>
                  date > new Date() || date < new Date('1900-01-01')
                }
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal w-full h-10">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {(filters.date_to || filters.date_range?.to) ? 
                  format(new Date(filters.date_to || filters.date_range?.to), 'MMM dd, yyyy') : 'To date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={(filters.date_to || filters.date_range?.to) ? 
                  new Date(filters.date_to || filters.date_range?.to) : undefined}
                onSelect={handleDateToChange}
                disabled={(date) =>
                  date > new Date() || date < new Date('1900-01-01')
                }
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          {(filters.date_from || filters.date_to || filters.date_range?.from || filters.date_range?.to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (filters.date_range !== undefined) {
                  onFiltersChange({
                    ...filters,
                    date_range: undefined
                  });
                } else {
                  onFiltersChange({
                    ...filters,
                    date_from: undefined,
                    date_to: undefined
                  });
                }
              }}
              className="w-full h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Date Range
            </Button>
          )}
        </div>
      </div>
    </>
  );

  // Advanced filters (collapsible in sections)
  const advancedFilters = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Trade</label>
        <MultiSelectFilter
          placeholder="Select trade"
          options={tradeOptions}
          selectedValues={filters.trade_id || filters.trade_ids || []}
          onSelectionChange={(values) => handleFilterChange(filters.trade_id !== undefined ? 'trade_id' : 'trade_ids', values)}
          className="h-10"
        />
      </div>

      {showPriority && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Priority</label>
          <MultiSelectFilter
            placeholder="Select priority"
            options={priorityOptions}
            selectedValues={filters.priority || []}
            onSelectionChange={(values) => handleFilterChange('priority', values)}
            className="h-10"
          />
        </div>
      )}

      {showCompleted && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">{completedByLabel}</label>
          <MultiSelectFilter
            placeholder="Select assignee type"
            options={completedByOptions}
            selectedValues={filters.completed_by || filters.subcontractor_organization_ids || []}
            onSelectionChange={(values) => handleFilterChange(filters.completed_by !== undefined ? 'completed_by' : 'subcontractor_organization_ids', values)}
            className="h-10"
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Location</label>
        <div className="space-y-2">
          <MultiSelectFilter
            placeholder="Select location"
            options={locationOptions}
            selectedValues={filters.location_filter || (filters.location ? [filters.location] : []) || []}
            onSelectionChange={(values) => handleFilterChange(filters.location_filter !== undefined ? 'location_filter' : 'location', values)}
            className="h-10"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Add custom location"
              value={locationTextInput}
              onChange={(e) => setLocationTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLocationTextSubmit();
                }
              }}
              className="flex-1 h-10"
            />
            <Button 
              onClick={handleLocationTextSubmit}
              size="sm" 
              variant="outline"
              disabled={!locationTextInput.trim()}
              className="h-10 px-3"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {showSubmittedBy && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Submitted By</label>
          <Input
            placeholder="Name or email..."
            value={filters.submitted_by || ''}
            onChange={(e) => handleStringFilterChange('submitted_by', e.target.value)}
            className="h-10"
          />
        </div>
      )}

      {showWorkOrder && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Work Order</label>
          <Input
            placeholder="Work order number or details..."
            value={filters.work_order || ''}
            onChange={(e) => handleStringFilterChange('work_order', e.target.value)}
            className="h-10"
          />
        </div>
      )}
    </>
  );

  return (
    <AdminFilterBar
      title="Filters"
      filterCount={activeFilterCount}
      onClear={onClearFilters}
      searchSlot={searchSlot}
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