import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Star, CheckCircle, Folder, ClipboardList } from 'lucide-react';
import { DashboardFilters } from '@/hooks/useDashboardFilters';

interface FilterDropdownProps {
  filters: DashboardFilters;
  onFilterChange: (key: keyof DashboardFilters, value: boolean) => void;
  workCounts?: {
    myWork: number;
    totalWork: number;
    projects: number;
    workOrders: number;
  };
}

export function FilterDropdown({ filters, onFilterChange, workCounts }: FilterDropdownProps) {
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuCheckboxItem
          checked={filters.showMyWorkOnly}
          onCheckedChange={(checked) => onFilterChange('showMyWorkOnly', checked)}
        >
          <Star className="h-4 w-4 mr-2" />
          My Work Only
          {workCounts && (
            <Badge variant="outline" className="ml-auto">
              {filters.showMyWorkOnly ? workCounts.myWork : workCounts.totalWork}
            </Badge>
          )}
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters.hideCompleted}
          onCheckedChange={(checked) => onFilterChange('hideCompleted', checked)}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Hide Completed
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Work Types</DropdownMenuLabel>
        
        <DropdownMenuCheckboxItem
          checked={filters.showProjects}
          onCheckedChange={(checked) => onFilterChange('showProjects', checked)}
        >
          <Folder className="h-4 w-4 mr-2" />
          Projects
          {workCounts && (
            <Badge variant="outline" className="ml-auto">
              {workCounts.projects}
            </Badge>
          )}
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters.showWorkOrders}
          onCheckedChange={(checked) => onFilterChange('showWorkOrders', checked)}
        >
          <ClipboardList className="h-4 w-4 mr-2" />
          Work Orders
          {workCounts && (
            <Badge variant="outline" className="ml-auto">
              {workCounts.workOrders}
            </Badge>
          )}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}