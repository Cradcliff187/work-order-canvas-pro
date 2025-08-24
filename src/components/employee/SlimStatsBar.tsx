import React from 'react';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';

interface SlimStatsBarProps {
  todayHours: number;
  weekHours: number;
  assignedCount: number;
  availableCount: number;
  activeCount?: number; // For mobile compatibility
  isLoading?: boolean;
}

export function SlimStatsBar({ 
  todayHours, 
  weekHours, 
  assignedCount,
  availableCount,
  activeCount,
  isLoading = false 
}: SlimStatsBarProps) {
  const isMobile = useIsMobile();
  
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 rounded-lg ${isMobile ? 'p-3' : 'py-2 px-4'}`}>
        <div className={`flex items-center text-sm text-muted-foreground ${isMobile ? 'gap-2 sm:gap-4' : 'gap-4'}`}>
          <span>Today: --h</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Week: --h</span>
          <Separator orientation="vertical" className="h-4" />
          {isMobile ? (
            <span>Active: --</span>
          ) : (
            <>
              <span>Assigned: --</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Available: --</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg ${isMobile ? 'p-3' : 'py-2 px-4'}`}>
      <div className={`flex items-center text-sm font-medium ${isMobile ? 'gap-2 sm:gap-4' : 'gap-4'}`}>
        <span className="text-foreground">
          Today: <span className="font-bold text-primary">{todayHours ? `${todayHours}h` : '0h'}</span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-foreground">
          Week: <span className="font-bold text-primary">{weekHours ? `${weekHours}h` : '0h'}</span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        {isMobile ? (
          <span className="text-foreground">
            Active: <span className="font-bold text-primary">{activeCount || assignedCount || 0}</span>
          </span>
        ) : (
          <>
            <span className="text-foreground">
              Assigned: <span className="font-bold text-primary">{assignedCount || 0}</span>
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-foreground">
              Available: <span className="font-bold text-primary">{availableCount || 0}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}