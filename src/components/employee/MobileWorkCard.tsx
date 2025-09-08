import React from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Briefcase } from 'lucide-react';
import { WorkItem } from '@/hooks/useAllWorkItems';
import { AssignmentBadge } from './AssignmentBadge';
import { StatusDot } from './StatusDot';
import { WorkItemMetrics } from '@/hooks/useWorkItemMetrics';
import { cn } from '@/lib/utils';

interface MobileWorkCardProps {
  workItem: WorkItem;
  onViewDetails: (id: string) => void;
  variant?: 'assigned' | 'available';
  className?: string;
  metrics?: WorkItemMetrics;
}

export const MobileWorkCard: React.FC<MobileWorkCardProps> = ({
  workItem,
  onViewDetails,
  variant = 'available',
  className,
  metrics
}) => {
  // Map work item status to status dot status
  const getStatusDotStatus = () => {
    if (workItem.isAssignedToMe) {
      return workItem.status === 'in_progress' ? 'in_progress' : 'active';
    }
    if (workItem.status === 'estimate_needed') return 'pending';
    return 'available';
  };

  return (
    <div className={cn(
      "relative w-full border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5",
      "rounded-xl bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/20",
      variant === 'assigned' && "bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 shadow-md",
      className
    )}>
      {/* Status Dot */}
      <StatusDot 
        status={getStatusDotStatus()}
        className="absolute top-2 left-2 z-10"
        size="sm"
      />
      
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left side - Work info */}
          <div className="flex items-center gap-2 flex-1 pl-3 min-w-0">
            {/* Mobile badges */}
            <div className="flex items-center gap-1 shrink-0">
              <AssignmentBadge 
                isAssignedToMe={workItem.isAssignedToMe}
                assigneeName={workItem.assigneeName}
                showIcon={false}
                className="shrink-0"
              />
              
              {/* Type badge - mobile optimized */}
              <div className="shrink-0">
                {workItem.type === 'work_order' ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-medium px-1 py-0.5">
                    <span>WO</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-medium px-1 py-0.5">
                    <span>PRJ</span>
                  </span>
                )}
              </div>
            </div>

            {/* Work details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground text-sm truncate">
                  {workItem.number}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {workItem.title}
              </p>
            </div>
          </div>

          {/* Right side - Mobile action */}
          <div className="flex items-center shrink-0">
            {workItem.isAssignedToMe && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(workItem.id)}
                className="h-7 px-2 text-xs shrink-0 min-w-[44px] hover:scale-105 transition-all duration-200"
              >
                ?
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
};