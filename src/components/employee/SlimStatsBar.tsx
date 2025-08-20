import React from 'react';
import { Separator } from '@/components/ui/separator';

interface SlimStatsBarProps {
  todayHours: number;
  weekHours: number;
  assignedCount: number;
  availableCount: number;  
  isLoading?: boolean;
}

export function SlimStatsBar({ 
  todayHours, 
  weekHours, 
  assignedCount,
  availableCount,
  isLoading = false 
}: SlimStatsBarProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2 px-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Today: --h</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Week: --h</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Assigned: --</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Available: --</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-2 px-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg">
      <div className="flex items-center gap-4 text-sm font-medium">
        <span className="text-foreground">
          Today: <span className="font-bold text-primary">{todayHours || 0}h</span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-foreground">
          Week: <span className="font-bold text-primary">{weekHours || 0}h</span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-foreground">
          Assigned: <span className="font-bold text-primary">{assignedCount || 0}</span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-foreground">
          Available: <span className="font-bold text-primary">{availableCount || 0}</span>
        </span>
      </div>
    </div>
  );
}