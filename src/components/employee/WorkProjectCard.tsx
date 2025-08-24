import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, BarChart, Briefcase, FileText } from 'lucide-react';
import { WorkItem } from '@/hooks/useAllWorkItems';
import { AssignmentBadge } from './AssignmentBadge';
import { StatusDot } from './StatusDot';
import { useWorkItemMetrics } from '@/hooks/useWorkItemMetrics';
import { cn } from '@/lib/utils';

interface WorkProjectCardProps {
  workItem: WorkItem;
  onViewDetails: (id: string) => void;
  variant?: 'assigned' | 'available';
  className?: string;
}

export const WorkProjectCard: React.FC<WorkProjectCardProps> = ({
  workItem,
  onViewDetails,
  variant = 'available',
  className
}) => {
  const { data: metrics } = useWorkItemMetrics(workItem.id, workItem.type);

  // Map work item status to status dot status
  const getStatusDotStatus = () => {
    if (workItem.isAssignedToMe) {
      return workItem.status === 'in_progress' ? 'in_progress' : 'active';
    }
    if (workItem.status === 'estimate_needed') return 'pending';
    return 'available';
  };

  return (
    <Card className={cn(
      "relative w-full max-w-full overflow-hidden border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 min-w-0 group",
      "shadow-sm hover:border-primary/20",
      variant === 'assigned' && "bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 shadow-md",
      className
    )}>
      {/* Status Dot */}
      <StatusDot 
        status={getStatusDotStatus()}
        className="absolute top-2 left-2 z-10"
        size="sm"
      />
      
      <CardContent className="p-3 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Left side - Work info */}
          <div className="flex items-center gap-2 min-w-0 flex-1 pl-3">
            {/* Badge container with proper constraints */}
            <div className="flex items-center gap-1 shrink-0 max-w-[70%]">
              <AssignmentBadge 
                isAssignedToMe={workItem.isAssignedToMe}
                assigneeName={workItem.assigneeName}
                showIcon={false}
                className="shrink-0"
              />
              
              {/* Type badge - ultra compact on mobile */}
              <div className="shrink-0">
                {workItem.type === 'work_order' ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-medium px-1 py-0.5 shrink-0">
                    <FileText className="h-2 w-2 hidden sm:inline" />
                    <span className="sm:hidden">WO</span>
                    <span className="hidden sm:inline">WORK ORDER</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-medium px-1 py-0.5 shrink-0">
                    <Briefcase className="h-2 w-2 hidden sm:inline" />
                    <span className="sm:hidden">PRJ</span>
                    <span className="hidden sm:inline">PROJECT</span>
                  </span>
                )}
              </div>
            </div>

            {/* Work details - with proper truncation */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground text-sm truncate">
                  {workItem.number}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {workItem.title}
              </p>
              
              {/* Mini metrics - show on larger screens */}
              <div className="hidden sm:flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
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

          {/* Right side - Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Details button - only show if assigned */}
            {workItem.isAssignedToMe && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(workItem.id)}
                className="h-7 px-2 text-xs shrink-0 hover:scale-105 transition-all duration-200 hover:shadow-sm"
              >
                <span className="hidden sm:inline">Details</span>
                <span className="sm:hidden">?</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};