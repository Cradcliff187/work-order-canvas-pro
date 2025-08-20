import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DashboardFilters } from '@/hooks/useDashboardFilters';
import { Check, X } from 'lucide-react';

interface FilterChipsProps {
  filters: DashboardFilters;
  onFilterChange: (key: keyof DashboardFilters, value: boolean) => void;
  workCounts?: {
    myWork: number;
    available: number;
    projects: number;
    workOrders: number;
  };
}

export function FilterChips({ filters, onFilterChange, workCounts }: FilterChipsProps) {
  const chipData = [
    {
      key: 'showMyWorkOnly' as keyof DashboardFilters,
      label: 'My Work',
      count: workCounts?.myWork,
      active: filters.showMyWorkOnly,
    },
    {
      key: 'showProjects' as keyof DashboardFilters,
      label: 'Projects',
      count: workCounts?.projects,
      active: filters.showProjects,
    },
    {
      key: 'showWorkOrders' as keyof DashboardFilters,
      label: 'Work Orders',
      count: workCounts?.workOrders,
      active: filters.showWorkOrders,
    },
    {
      key: 'hideCompleted' as keyof DashboardFilters,
      label: 'Hide Completed',
      active: filters.hideCompleted,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {chipData.map(({ key, label, count, active }) => (
        <Badge
          key={key}
          variant={active ? "default" : "secondary"}
          className="cursor-pointer transition-all duration-200 hover:scale-105 select-none"
          onClick={() => onFilterChange(key, !active)}
        >
          <span className="flex items-center gap-1">
            {active ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3 opacity-50" />
            )}
            {label}
            {count !== undefined && (
              <span className="ml-1 text-xs opacity-75">({count})</span>
            )}
          </span>
        </Badge>
      ))}
    </div>
  );
}