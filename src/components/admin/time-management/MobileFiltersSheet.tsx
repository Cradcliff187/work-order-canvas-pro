import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { TimeManagementFilters } from './TimeManagementFilters';
import { Employee } from '@/hooks/useTimeManagement';

interface MobileFiltersSheetProps {
  filters: {
    employeeIds: string[];
    dateFrom: string;
    dateTo: string;
    workOrderIds: string[];
    projectIds: string[];
    status: string[];
    search: string;
    page: number;
    limit: number;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  employees: Employee[];
  workOrders: any[];
  projects: any[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MobileFiltersSheet({
  filters,
  onFiltersChange,
  onClearFilters,
  employees,
  workOrders,
  projects,
  open,
  onOpenChange
}: MobileFiltersSheetProps) {
  const activeFiltersCount = [
    filters.employeeIds.length > 0,
    filters.dateFrom || filters.dateTo,
    filters.workOrderIds.length > 0,
    filters.projectIds.length > 0,
    filters.status.length > 0,
    filters.search.trim().length > 0
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onClearFilters();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <SheetTitle>Filter Time Entries</SheetTitle>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </SheetHeader>
        
        <div className="space-y-6">
          <TimeManagementFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={onClearFilters}
            employees={employees}
            workOrders={workOrders}
            projects={projects}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}