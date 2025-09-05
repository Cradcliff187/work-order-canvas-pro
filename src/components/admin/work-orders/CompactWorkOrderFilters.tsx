import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Calendar } from '@/components/ui/calendar';
import { Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
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
  assigned_to?: string[];
  date_submitted_from?: string;
  date_submitted_to?: string;
  date_from?: string;
  date_to?: string;
  date_range?: {
    from?: string;
    to?: string;
  };
  location?: string[];
  location_filter?: string[];
}

export interface FilterConfig {
  statusOptions?: { value: string; label: string }[];
  showPriority?: boolean;
  showCompleted?: boolean;
  showSubmittedBy?: boolean;
  showWorkOrder?: boolean;
  assignedToLabel?: string;
}

export interface CompactWorkOrderFiltersProps {
  value: WorkOrderFiltersValue;
  onChange: (value: WorkOrderFiltersValue) => void;
  onClear?: () => void;
  config?: FilterConfig;
}

const defaultWorkOrderStatusOptions = [
  { value: 'received', label: 'Received' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'estimate_needed', label: 'Estimate Needed' },
  { value: 'estimate_pending_approval', label: 'Estimate Pending Approval' },
  { value: 'estimate_approved', label: 'Estimate Approved' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const CompactWorkOrderFilters: React.FC<CompactWorkOrderFiltersProps> = ({
  value,
  onChange,
  onClear,
  config = {}
}) => {
  const {
    statusOptions = defaultWorkOrderStatusOptions,
    showPriority = false,
    showCompleted = true,
    showSubmittedBy = false,
    showWorkOrder = false,
    assignedToLabel = "Assigned To"
  } = config;
  
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

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

  // Calculate active filter count
  const activeCount = useMemo(() => {
    return [
      value.status?.length,
      value.organizations?.length, 
      value.assigned_to?.length,
      value.date_submitted_from || value.date_from,
      value.date_submitted_to || value.date_to,
      value.location_filter?.length || value.location?.length,
      value.priority?.length,
      value.trades?.length
    ].filter(Boolean).length;
  }, [value]);

  // Prepare option arrays
  const organizationOptions = organizations?.map(org => ({
    value: org.id,
    label: org.name
  })) || [];

  const tradeOptions = trades?.map(trade => ({
    value: trade.id,
    label: trade.name
  })) || [];

  const assignedToOptions = [
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
      // Handle work orders date_from format (and legacy date_submitted_from)
      onChange({
        ...value,
        date_from: date ? format(date, 'yyyy-MM-dd') : undefined,
        date_submitted_from: date ? format(date, 'yyyy-MM-dd') : undefined
      });
    }
    setShowDateFrom(false);
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
      // Handle work orders date_to format (and legacy date_submitted_to)
      onChange({
        ...value,
        date_to: date ? format(date, 'yyyy-MM-dd') : undefined,
        date_submitted_to: date ? format(date, 'yyyy-MM-dd') : undefined
      });
    }
    setShowDateTo(false);
  };

  const handleApplyFilters = () => {
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    if (onClear) {
      onClear();
    }
    setIsOpen(false);
  };

  // Filter content component
  const FilterContent = () => {

    // Desktop version - unchanged
    return (
      <>
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={value.status || []}
              onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner</label>
            <MultiSelectFilter
              options={organizationOptions}
              selectedValues={value.organizations || []}
              onSelectionChange={(filterValue) => handleFilterChange('organizations', filterValue)}
              placeholder="Filter by partner..."
              className="w-full h-10"
            />
          </div>

          {/* Assigned To Filter */}
          {showCompleted && (
            <div>
              <label className="text-sm font-medium mb-2 block">{assignedToLabel}</label>
              <MultiSelectFilter
                options={assignedToOptions}
                selectedValues={value.assigned_to || []}
                onSelectionChange={(filterValue) => handleFilterChange('assigned_to', filterValue)}
                placeholder="Filter by assignment..."
                className="w-full h-10"
              />
            </div>
          )}

          {/* Date Submitted Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Submitted</label>
            <div className="grid grid-cols-2 gap-2">
              <Popover open={showDateFrom} onOpenChange={setShowDateFrom}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.date_submitted_from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_submitted_from ? format(new Date(value.date_submitted_from), "PP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={isMobile}>
                  <Calendar
                    mode="single"
                    selected={value.date_submitted_from ? new Date(value.date_submitted_from) : undefined}
                    onSelect={handleDateFromChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover open={showDateTo} onOpenChange={setShowDateTo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.date_submitted_to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_submitted_to ? format(new Date(value.date_submitted_to), "PP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={isMobile}>
                  <Calendar
                    mode="single"
                    selected={value.date_submitted_to ? new Date(value.date_submitted_to) : undefined}
                    onSelect={handleDateToChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Locations Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Locations</label>
            <MultiSelectFilter
              options={locationOptions}
              selectedValues={value.location_filter || value.location || []}
              onSelectionChange={(filterValue) => handleFilterChange(value.location_filter !== undefined ? 'location_filter' : 'location', filterValue)}
              placeholder="Select locations..."
              className="w-full h-10"
            />
          </div>

          {/* Priority Filter */}
          {showPriority && (
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <MultiSelectFilter
                options={priorityOptions}
                selectedValues={value.priority || []}
                onSelectionChange={(filterValue) => handleFilterChange('priority', filterValue)}
                placeholder="Filter by priority..."
                className="w-full h-10"
              />
            </div>
          )}

          {/* Trades Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Trades</label>
            <MultiSelectFilter
              options={tradeOptions}
              selectedValues={value.trades || []}
              onSelectionChange={(filterValue) => handleFilterChange('trades', filterValue)}
              placeholder="Filter by trades..."
              className="w-full h-10"
            />
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear
          </Button>
          <Button onClick={handleApplyFilters}>
            Apply
          </Button>
        </div>
      </>
    );
  };

  // Mobile full-screen overlay component
  const MobileFilterOverlay = () => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
          >
            ✕
          </Button>
        </div>
        
        {/* Scrollable content */}
        <div className="max-h-[calc(100vh-140px)] overflow-y-auto p-4 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={value.status || []}
              onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner</label>
            <MultiSelectFilter
              options={organizationOptions}
              selectedValues={value.organizations || []}
              onSelectionChange={(filterValue) => handleFilterChange('organizations', filterValue)}
              placeholder="Filter by partner..."
              className="w-full h-10"
            />
          </div>

          {/* Assigned To Filter */}
          {showCompleted && (
            <div>
              <label className="text-sm font-medium mb-2 block">{assignedToLabel}</label>
              <MultiSelectFilter
                options={assignedToOptions}
                selectedValues={value.assigned_to || []}
                onSelectionChange={(filterValue) => handleFilterChange('assigned_to', filterValue)}
                placeholder="Filter by assignment..."
                className="w-full h-10"
              />
            </div>
          )}

          {/* Date Submitted Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Submitted</label>
            <div className="grid grid-cols-2 gap-2">
              <Popover open={showDateFrom} onOpenChange={setShowDateFrom}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.date_submitted_from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_submitted_from ? format(new Date(value.date_submitted_from), "PP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={true}>
                  <Calendar
                    mode="single"
                    selected={value.date_submitted_from ? new Date(value.date_submitted_from) : undefined}
                    onSelect={handleDateFromChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover open={showDateTo} onOpenChange={setShowDateTo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.date_submitted_to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_submitted_to ? format(new Date(value.date_submitted_to), "PP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={true}>
                  <Calendar
                    mode="single"
                    selected={value.date_submitted_to ? new Date(value.date_submitted_to) : undefined}
                    onSelect={handleDateToChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Locations Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Locations</label>
            <MultiSelectFilter
              options={locationOptions}
              selectedValues={value.location_filter || value.location || []}
              onSelectionChange={(filterValue) => handleFilterChange(value.location_filter !== undefined ? 'location_filter' : 'location', filterValue)}
              placeholder="Select locations..."
              className="w-full h-10"
            />
          </div>

          {/* Priority Filter */}
          {showPriority && (
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <MultiSelectFilter
                options={priorityOptions}
                selectedValues={value.priority || []}
                onSelectionChange={(filterValue) => handleFilterChange('priority', filterValue)}
                placeholder="Filter by priority..."
                className="w-full h-10"
              />
            </div>
          )}

          {/* Trades Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Trades</label>
            <MultiSelectFilter
              options={tradeOptions}
              selectedValues={value.trades || []}
              onSelectionChange={(filterValue) => handleFilterChange('trades', filterValue)}
              placeholder="Filter by trades..."
              className="w-full h-10"
            />
          </div>
        </div>
        
        {/* Bottom action buttons */}
        <div className="p-4 border-t bg-background/95 backdrop-blur">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClearFilters} className="flex-1 h-12">
              Clear
            </Button>
            <Button onClick={handleApplyFilters} className="flex-1 h-12">
              Apply
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {isMobile ? (
        <>
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </Button>
          <MobileFilterOverlay />
        </>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="relative"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <FilterContent />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
};