import React from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, BarChart, Briefcase, FileText } from 'lucide-react';
import { WorkItem } from '@/hooks/useAllWorkItems';
import { AssignmentBadge } from './AssignmentBadge';
import { StatusDot } from './StatusDot';
import { WorkItemMetrics } from '@/hooks/useWorkItemMetrics';
import { cn } from '@/lib/utils';

interface DesktopWorkCardProps {
  workItem: WorkItem;
  onViewDetails: (id: string) => void;
  variant?: 'assigned' | 'available';
  className?: string;
  metrics?: WorkItemMetrics;
}

export const DesktopWorkCard: React.FC<DesktopWorkCardProps> = ({
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
            {/* Desktop badges */}
            <div className="flex items-center gap-1 shrink-0">
              <AssignmentBadge 
                isAssignedToMe={workItem.isAssignedToMe}
                assigneeName={workItem.assigneeName}
                showIcon={false}
                className="shrink-0"
              />
              
              {/* Type badge - desktop optimized */}
              <div className="shrink-0">
                {workItem.type === 'work_order' ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-medium px-1 py-0.5">
                    <FileText className="h-2 w-2" />
                    <span>WORK ORDER</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-medium px-1 py-0.5">
                    <Briefcase className="h-2 w-2" />
                    <span>PROJECT</span>
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
              
              {/* Desktop metrics */}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                {metrics?.lastWorked && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[80px]">{metrics.lastWorked}</span>
                  </div>
                )}
                {metrics?.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[100px]">{metrics.location}</span>
                  </div>
                )}
                {metrics?.hoursLogged && (
                  <div className="flex items-center gap-1">
                    <BarChart className="h-2.5 w-2.5" />
                    <span>{metrics.hoursLogged}h</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Desktop actions */}
          <div className="flex items-center gap-1 shrink-0">
            {workItem.isAssignedToMe && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(workItem.id)}
                className="h-7 px-2 text-xs shrink-0 hover:scale-105 transition-all duration-200"
              >
                Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
};