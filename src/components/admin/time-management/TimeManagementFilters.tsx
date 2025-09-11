import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { CalendarIcon, Search, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimeManagementFilters as Filters, Employee, WorkOrder, Project } from '@/hooks/useTimeManagement';
import { FilterPresetsManager } from './FilterPresetsManager';

interface TimeManagementFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  employees: Employee[];
  workOrders: WorkOrder[];
  projects: Project[];
}

export function TimeManagementFilters({
  filters,
  onFiltersChange,
  employees,
  workOrders,
  projects
}: TimeManagementFiltersProps) {
  
  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onFiltersChange({
      employeeIds: [],
      dateFrom: '',
      dateTo: '',
      workOrderIds: [],
      projectIds: [],
      status: [],
      search: '',
      page: 1,
      limit: 50
    });
  };

  const toggleArrayFilter = (key: 'employeeIds' | 'workOrderIds' | 'projectIds' | 'status', value: string) => {
    const currentValues = filters[key];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    updateFilter(key, newValues);
  };

  const getFilterCount = () => {
    return Object.values(filters).filter(value => 
      Array.isArray(value) ? value.length > 0 : value !== ''
    ).length;
  };

  return (
    <div className="space-y-4">
      {/* Filter Presets Manager */}
      <FilterPresetsManager
        currentFilters={filters}
        onLoadPreset={onFiltersChange}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Active Filters</span>
          {getFilterCount() > 0 && (
            <Badge variant="secondary">{getFilterCount()}</Badge>
          )}
        </div>
        {getFilterCount() > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Description</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search work performed..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Date From */}
        <div className="space-y-2">
          <Label>Date From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(new Date(filters.dateFrom), "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                onSelect={(date) => updateFilter('dateFrom', date ? format(date, 'yyyy-MM-dd') : '')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <Label>Date To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(new Date(filters.dateTo), "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                onSelect={(date) => updateFilter('dateTo', date ? format(date, 'yyyy-MM-dd') : '')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Employee Filter */}
        <div className="space-y-2">
          <Label>Employees</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {filters.employeeIds.length > 0 
                  ? `${filters.employeeIds.length} selected`
                  : "Select employees..."
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandEmpty>No employees found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {employees.map((employee) => (
                    <CommandItem
                      key={employee.id}
                      onSelect={() => toggleArrayFilter('employeeIds', employee.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.employeeIds.includes(employee.id)}
                          readOnly
                        />
                        <span>{employee.first_name} {employee.last_name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Work Orders and Projects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Approval Status */}
        <div className="space-y-2">
          <Label>Approval Status</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {filters.status.length > 0 
                  ? `${filters.status.length} selected`
                  : "All statuses"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
              <Command>
                <CommandGroup className="max-h-64 overflow-auto">
                  {[
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'flagged', label: 'Flagged' }
                  ].map((status) => (
                    <CommandItem
                      key={status.value}
                      onSelect={() => toggleArrayFilter('status', status.value)}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status.value)}
                          readOnly
                        />
                        <span>{status.label}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Work Orders */}
        <div className="space-y-2">
          <Label>Work Orders</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {filters.workOrderIds.length > 0 
                  ? `${filters.workOrderIds.length} selected`
                  : "Select work orders..."
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <Command>
                <CommandInput placeholder="Search work orders..." />
                <CommandEmpty>No work orders found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {workOrders.map((workOrder) => (
                    <CommandItem
                      key={workOrder.id}
                      onSelect={() => toggleArrayFilter('workOrderIds', workOrder.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.workOrderIds.includes(workOrder.id)}
                          readOnly
                        />
                        <span>{workOrder.work_order_number} - {workOrder.title}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Projects */}
        <div className="space-y-2">
          <Label>Projects</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {filters.projectIds.length > 0 
                  ? `${filters.projectIds.length} selected`
                  : "Select projects..."
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <Command>
                <CommandInput placeholder="Search projects..." />
                <CommandEmpty>No projects found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      onSelect={() => toggleArrayFilter('projectIds', project.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.projectIds.includes(project.id)}
                          readOnly
                        />
                        <span>{project.project_number} - {project.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}