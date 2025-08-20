import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, ClipboardList, Clock, Eye } from 'lucide-react';
import { WorkItem } from '@/hooks/useAllWorkItems';
import { AssignmentBadge } from './AssignmentBadge';
import { cn } from '@/lib/utils';

interface WorkProjectCardProps {
  workItem: WorkItem;
  onClockIn: (workOrderId?: string, projectId?: string) => void;
  onViewDetails: (id: string) => void;
  isDisabled?: boolean;
  variant?: 'assigned' | 'available';
  className?: string;
}

export const WorkProjectCard: React.FC<WorkProjectCardProps> = ({
  workItem,
  onClockIn,
  onViewDetails,
  isDisabled = false,
  variant = 'available',
  className
}) => {
  const handleClockIn = () => {
    if (workItem.type === 'work_order') {
      onClockIn(workItem.id);
    } else {
      onClockIn(undefined, workItem.id);
    }
  };

  const getIcon = () => {
    return workItem.type === 'project' 
      ? <Briefcase className="h-4 w-4" />
      : <ClipboardList className="h-4 w-4" />;
  };

  const getNumber = () => {
    const prefix = workItem.type === 'project' ? 'PRJ' : 'WO';
    return `${prefix}-${workItem.number}`;
  };

  const isAssigned = variant === 'assigned';

  return (
    <Card 
      className={cn(
        "w-full max-w-full overflow-hidden transition-all cursor-pointer",
        isAssigned 
          ? "bg-gradient-to-r from-success/5 to-success/10 border-success/30 hover:shadow-md" 
          : "opacity-90 hover:opacity-100 border-border/50 hover:border-border hover:shadow-sm",
        className
      )}
      onClick={handleClockIn}
    >
      <CardContent className="p-3 sm:p-4">
        {/* Mobile Layout */}
        <div className="sm:hidden">
          <div className="flex items-start gap-3 mb-3">
            {/* Icon */}
            <div className={cn(
              "rounded-full p-2 flex-shrink-0",
              isAssigned 
                ? "bg-success/20 text-success" 
                : "bg-muted text-muted-foreground"
            )}>
              {getIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header with badges */}
              <div className="flex items-center gap-1 mb-2 flex-wrap max-w-[calc(100%-2rem)] min-w-0">
                <AssignmentBadge 
                  isAssignedToMe={workItem.isAssignedToMe} 
                  assigneeName={workItem.assigneeName}
                />
                <Badge 
                  variant={workItem.type === 'project' ? "default" : (isAssigned ? "default" : "secondary")}
                  className={cn(
                    "text-[10px] px-1 py-0.5 shrink-0",
                    workItem.type === 'project' && "bg-purple-500 text-white hover:bg-purple-600"
                  )}
                >
                  <span className="xs:hidden">{workItem.type === 'work_order' ? 'W' : 'P'}</span>
                  <span className="hidden xs:inline sm:hidden">{workItem.type === 'work_order' ? 'WO' : 'PRJ'}</span>
                  <span className="hidden sm:inline">{workItem.type === 'work_order' ? 'WO' : 'PROJECT'}</span>
                </Badge>
              </div>

              {/* Title */}
              <h4 className="font-semibold text-sm leading-tight mb-1 truncate">
                {workItem.title}
              </h4>

              {/* Subtitle with number */}
              <p className="text-xs text-muted-foreground truncate">
                {getNumber()}
              </p>
            </div>
          </div>

          {/* Mobile Actions Footer */}
          <div className="flex gap-1 pt-2 border-t border-border/20">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClockIn();
              }}
              disabled={isDisabled}
              className="text-[10px] px-1.5 py-1 flex-1 min-w-0"
              variant={isAssigned ? "default" : "outline"}
            >
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              <span className="truncate">In</span>
            </Button>
            {isAssigned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(workItem.id);
                }}
                className="text-[10px] px-1.5 py-1 shrink-0"
              >
                <Eye className="h-2.5 w-2.5 mr-0.5" />
                <span className="hidden xs:inline">Info</span>
                <span className="xs:hidden">•</span>
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div className={cn(
              "rounded-full p-2 flex-shrink-0",
              isAssigned 
                ? "bg-success/20 text-success" 
                : "bg-muted text-muted-foreground"
            )}>
              {getIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header with badges */}
              <div className="flex items-center gap-1.5 mb-1 flex-wrap max-w-[calc(100%-8rem)] min-w-0">
                <AssignmentBadge 
                  isAssignedToMe={workItem.isAssignedToMe} 
                  assigneeName={workItem.assigneeName}
                />
                <Badge 
                  variant={workItem.type === 'project' ? "default" : (isAssigned ? "default" : "secondary")}
                  className={cn(
                    "text-xs shrink-0",
                    workItem.type === 'project' && "bg-purple-500 text-white hover:bg-purple-600"
                  )}
                >
                  {workItem.type === 'work_order' ? 'WO' : 'PROJECT'}
                </Badge>
                <Badge 
                  variant="success" 
                  className="text-xs shrink-0"
                >
                  Active
                </Badge>
              </div>

              {/* Title */}
              <h4 className="font-semibold text-sm leading-tight mb-1 truncate">
                {workItem.title}
              </h4>

              {/* Subtitle with number */}
              <p className="text-xs text-muted-foreground mb-2 truncate">
                {getNumber()}
              </p>

              {/* Status */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{isAssigned ? 'Ready for work' : 'Available'}</span>
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="flex flex-col gap-2 ml-2 shrink-0 min-w-0">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClockIn();
              }}
              disabled={isDisabled}
              className="text-xs px-2 py-1 min-w-[72px]"
              variant={isAssigned ? "default" : "outline"}
            >
              <Clock className="h-3 w-3 mr-1" />
              <span className="truncate">{isAssigned ? 'Clock In' : 'Jump In'}</span>
            </Button>
            {isAssigned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(workItem.id);
                }}
                className="text-xs px-2 py-1 min-w-[72px]"
              >
                <Eye className="h-3 w-3 mr-1" />
                <span className="truncate">Details</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};