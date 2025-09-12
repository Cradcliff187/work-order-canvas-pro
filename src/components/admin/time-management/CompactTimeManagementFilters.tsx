import React, { useState } from 'react';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CompactTimeManagementFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  employees: any[];
  workOrders: any[];
  projects: any[];
  filterCount: number;
}

export function CompactTimeManagementFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  employees,
  workOrders,
  projects,
  filterCount
}: CompactTimeManagementFiltersProps) {
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

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

  return (
    <AdminFilterBar
      title="Filters"
      filterCount={filterCount}
      onClear={onClearFilters}
      sheetSide="bottom"
      collapsible={true}
    >
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Employee Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Employee</label>
            <MultiSelectFilter
              options={employeeOptions}
              selectedValues={filters.employeeIds || []}
              onSelectionChange={(value) => handleFilterChange('employeeIds', value)}
              placeholder="Filter by employee..."
              className="w-full h-10"
            />
          </div>

          {/* Work Order Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Work Order</label>
            <MultiSelectFilter
              options={workOrderOptions}
              selectedValues={filters.workOrderIds || []}
              onSelectionChange={(value) => handleFilterChange('workOrderIds', value)}
              placeholder="Filter by work order..."
              className="w-full h-10"
            />
          </div>

          {/* Project Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <MultiSelectFilter
              options={projectOptions}
              selectedValues={filters.projectIds || []}
              onSelectionChange={(value) => handleFilterChange('projectIds', value)}
              placeholder="Filter by project..."
              className="w-full h-10"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
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
                    {filters.dateFrom ? format(new Date(filters.dateFrom), 'MMM d') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                    onSelect={(date) => {
                      handleFilterChange('dateFrom', date ? format(date, 'yyyy-MM-dd') : '');
                      setDateFromOpen(false);
                    }}
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
                    {filters.dateTo ? format(new Date(filters.dateTo), 'MMM d') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                    onSelect={(date) => {
                      handleFilterChange('dateTo', date ? format(date, 'yyyy-MM-dd') : '');
                      setDateToOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={filters.status || []}
              onSelectionChange={(value) => handleFilterChange('status', value)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>
        </div>
      </div>
    </AdminFilterBar>
  );
}