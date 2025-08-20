import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle, Folder, ClipboardList } from 'lucide-react';
import { DashboardFilters } from '@/hooks/useDashboardFilters';

interface FilterChipsProps {
  filters: DashboardFilters;
  onFilterChange: (key: keyof DashboardFilters, value: boolean) => void;
  workCounts?: {
    myWork: number;
    totalWork: number;
    projects: number;
    workOrders: number;
  };
}

export function FilterChips({ filters, onFilterChange, workCounts }: FilterChipsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* My Work Only Toggle */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${
            filters.showMyWorkOnly
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
          onClick={() => onFilterChange('showMyWorkOnly', !filters.showMyWorkOnly)}
        >
          <Star className="h-4 w-4" />
          My Work Only
          {workCounts && (
            <Badge variant="outline" className="ml-1">
              {filters.showMyWorkOnly ? workCounts.myWork : workCounts.totalWork}
            </Badge>
          )}
        </div>

        {/* Hide Completed Toggle */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${
            filters.hideCompleted
              ? 'bg-green-600 text-white'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
          onClick={() => onFilterChange('hideCompleted', !filters.hideCompleted)}
        >
          <CheckCircle className="h-4 w-4" />
          Hide Completed
        </div>
      </div>

      {/* Work Type Toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Show:</span>
        
        <div
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${
            filters.showProjects
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onClick={() => onFilterChange('showProjects', !filters.showProjects)}
        >
          <Folder className="h-4 w-4" />
          Projects
          {workCounts && (
            <Badge variant="outline" className="ml-1">
              {workCounts.projects}
            </Badge>
          )}
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${
            filters.showWorkOrders
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onClick={() => onFilterChange('showWorkOrders', !filters.showWorkOrders)}
        >
          <ClipboardList className="h-4 w-4" />
          Work Orders
          {workCounts && (
            <Badge variant="outline" className="ml-1">
              {workCounts.workOrders}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}