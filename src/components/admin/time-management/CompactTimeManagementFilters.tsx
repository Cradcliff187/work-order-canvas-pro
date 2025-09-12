import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Calendar } from '@/components/ui/calendar';
import { Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface TimeManagementFiltersValue {
  employeeIds?: string[];
  workOrderIds?: string[];
  projectIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
}

interface CompactTimeManagementFiltersProps {
  value: TimeManagementFiltersValue;
  onChange: (value: TimeManagementFiltersValue) => void;
  onClear?: () => void;
  employees: any[];
  workOrders: any[];
  projects: any[];
}

export const CompactTimeManagementFilters: React.FC<CompactTimeManagementFiltersProps> = ({
  value,
  onChange,
  onClear,
  employees,
  workOrders,
  projects
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  // Calculate active filter count
  const activeCount = useMemo(() => {
    return [
      value.employeeIds?.length,
      value.workOrderIds?.length,
      value.projectIds?.length,
      value.dateFrom,
      value.dateTo,
      value.status?.length,
    ].filter(Boolean).length;
  }, [value]);

  const handleFilterChange = (key: string, filterValue: any) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  };

  // Prepare option arrays
  const employeeOptions = employees.map(e => ({
    value: e.id,
    label: `${e.first_name} ${e.last_name}`
  }));

  const workOrderOptions = workOrders.map(wo => ({
    value: wo.id,
    label: wo.work_order_number
  }));

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: p.project_number
  }));

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

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
    return (
      <>
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {/* Employee Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Employee</label>
            <MultiSelectFilter
              options={employeeOptions}
              selectedValues={value.employeeIds || []}
              onSelectionChange={(filterValue) => handleFilterChange('employeeIds', filterValue)}
              placeholder="Filter by employee..."
              className="w-full h-10"
            />
          </div>

          {/* Work Order Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Work Order</label>
            <MultiSelectFilter
              options={workOrderOptions}
              selectedValues={value.workOrderIds || []}
              onSelectionChange={(filterValue) => handleFilterChange('workOrderIds', filterValue)}
              placeholder="Filter by work order..."
              className="w-full h-10"
            />
          </div>

          {/* Project Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Project</label>
            <MultiSelectFilter
              options={projectOptions}
              selectedValues={value.projectIds || []}
              onSelectionChange={(filterValue) => handleFilterChange('projectIds', filterValue)}
              placeholder="Filter by project..."
              className="w-full h-10"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.dateFrom ? format(new Date(value.dateFrom), "PP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={isMobile}>
                  <Calendar
                    mode="single"
                    selected={value.dateFrom ? new Date(value.dateFrom) : undefined}
                    onSelect={(date) => {
                      handleFilterChange('dateFrom', date ? format(date, 'yyyy-MM-dd') : '');
                      setDateFromOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.dateTo ? format(new Date(value.dateTo), "PP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={isMobile}>
                  <Calendar
                    mode="single"
                    selected={value.dateTo ? new Date(value.dateTo) : undefined}
                    onSelect={(date) => {
                      handleFilterChange('dateTo', date ? format(date, 'yyyy-MM-dd') : '');
                      setDateToOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

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
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t bg-background/95 backdrop-blur">
          <Button variant="outline" onClick={handleClearFilters} className="flex-1 h-12">
            Clear
          </Button>
          <Button onClick={handleApplyFilters} className="flex-1 h-12">
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
        <div className="max-h-[calc(100vh-140px)] overflow-y-auto p-4">
          <FilterContent />
        </div>
      </div>
    );
  };

  // Desktop version
  if (!isMobile) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative h-9 gap-2"
          >
            <Filter className="h-4 w-4" />
            Filter
            {activeCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full text-xs h-5 w-5 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-4" 
          align="start" 
          side="bottom"
          sideOffset={4}
        >
          <FilterContent />
        </PopoverContent>
      </Popover>
    );
  }

  // Mobile version
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative h-9 gap-2 flex-1 sm:flex-initial"
      >
        <Filter className="h-4 w-4" />
        Filter
        {activeCount > 0 && (
          <span className="ml-1 bg-primary text-primary-foreground rounded-full text-xs h-5 w-5 flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </Button>
      
      <MobileFilterOverlay />
    </>
  );
};