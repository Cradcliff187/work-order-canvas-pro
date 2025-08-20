import React from 'react';
import { Separator } from '@/components/ui/separator';

interface CompactStatsRowProps {
  todayHours: number;
  weekHours: number;
  activeCount: number;
  isLoading?: boolean;
}

export function CompactStatsRow({ 
  todayHours, 
  weekHours, 
  activeCount, 
  isLoading = false 
}: CompactStatsRowProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Today: --h</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Week: --h</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Active: --</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg">
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
          Active: <span className="font-bold text-primary">{activeCount || 0}</span>
        </span>
      </div>
    </div>
  );
}