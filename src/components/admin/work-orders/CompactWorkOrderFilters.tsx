import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Calendar } from '@/components/ui/calendar';
import { Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
  location?: string[];
  location_filter?: string[];
}

export interface FilterConfig {
  showPriority?: boolean;
  showCompleted?: boolean;
  showSubmittedBy?: boolean;
  submitLabel?: string;
  customLabels?: {
    [key: string]: string;
  };
}

export interface CompactWorkOrderFiltersProps {
  value: WorkOrderFiltersValue;
  onChange: (value: WorkOrderFiltersValue) => void;
  onClear?: () => void;
  filterCount: number;
  config?: FilterConfig;
}

const workOrderStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
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
  filterCount,
  config = {}
}) => {
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

  const handleFilterChange = (field: keyof WorkOrderFiltersValue, filterValue: string[] | string) => {
    const newValue = {
      ...value,
      [field]: filterValue,
    };
    onChange(newValue);
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {filterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {filterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] z-50" align="start" disablePortal={false}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Work Order Filters</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <MultiSelectFilter
                  options={workOrderStatusOptions}
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
              <div>
                <label className="text-sm font-medium mb-2 block">Assigned To</label>
                <MultiSelectFilter
                  options={assignedToOptions}
                  selectedValues={value.assigned_to || []}
                  onSelectionChange={(filterValue) => handleFilterChange('assigned_to', filterValue)}
                  placeholder="Filter by assignment..."
                  className="w-full h-10"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={value.date_submitted_from ? new Date(value.date_submitted_from) : undefined}
                        onSelect={(date) => {
                          handleFilterChange('date_submitted_from', date ? date.toISOString().split('T')[0] : '');
                          setShowDateFrom(false);
                        }}
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={value.date_submitted_to ? new Date(value.date_submitted_to) : undefined}
                        onSelect={(date) => {
                          handleFilterChange('date_submitted_to', date ? date.toISOString().split('T')[0] : '');
                          setShowDateTo(false);
                        }}
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
              {config.showPriority && (
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
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClearFilters}
            >
              Clear All
            </Button>
            <Button
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};