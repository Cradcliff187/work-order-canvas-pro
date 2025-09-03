import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface WorkOrderCardSkeletonProps {
  compact?: boolean;
}

export const WorkOrderCardSkeleton: React.FC<WorkOrderCardSkeletonProps> = ({ 
  compact = false 
}) => {
  return (
    <Card className="transition-all duration-200">
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start gap-3">
          {/* Checkbox skeleton */}
          <Skeleton className="w-4 h-4 rounded mt-1" />
          
          <div className={`flex-1 ${compact ? "space-y-2" : "space-y-3"}`}>
            {/* Work Order Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" /> {/* Work order number */}
                <Skeleton className="h-3 w-20" /> {/* Date */}
              </div>
              <Skeleton className="h-4 w-48" /> {/* Title */}
              <Skeleton className="h-3 w-full" /> {/* Description line 1 */}
              <Skeleton className="h-3 w-3/4" /> {/* Description line 2 */}
            </div>

            {/* Work Summary skeleton (only in non-compact mode) */}
            {!compact && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" /> {/* "Work Summary" label */}
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-16" /> {/* Hours */}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};