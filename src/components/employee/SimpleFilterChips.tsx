import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DashboardFilters } from '@/hooks/useDashboardFilters';
import { User, Briefcase, FileText } from 'lucide-react';

interface SimpleFilterChipsProps {
  filters: DashboardFilters;
  onFilterChange: (key: keyof DashboardFilters, value: boolean) => void;
  workCounts?: {
    myWork: number;
    total: number;
    projects: number;
    workOrders: number;
  };
}

export function SimpleFilterChips({ filters, onFilterChange, workCounts }: SimpleFilterChipsProps) {
  const chips = [
    {
      key: 'showMyWorkOnly' as keyof DashboardFilters,
      label: 'My Work',
      icon: User,
      count: filters.showMyWorkOnly ? workCounts?.myWork : workCounts?.total,
      active: filters.showMyWorkOnly,
    },
    {
      key: 'showProjects' as keyof DashboardFilters,
      label: 'Projects',
      icon: Briefcase,
      count: workCounts?.projects,
      active: filters.showProjects,
    },
    {
      key: 'showWorkOrders' as keyof DashboardFilters,
      label: 'Work Orders',
      icon: FileText,
      count: workCounts?.workOrders,
      active: filters.showWorkOrders,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {chips.map(({ key, label, icon: Icon, count, active }) => (
        <Badge
          key={key}
          variant={active ? "default" : "outline"}
          className="cursor-pointer transition-all duration-200 hover:scale-105 select-none px-3 py-1.5 text-sm"
          onClick={() => onFilterChange(key, !active)}
        >
          <span className="flex items-center gap-2">
            <Icon className="h-3 w-3" />
            {label}
            {count !== undefined && (
              <span className="text-xs font-medium">({count})</span>
            )}
          </span>
        </Badge>
      ))}
    </div>
  );
}