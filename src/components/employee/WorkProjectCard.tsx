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
}

export const WorkProjectCard: React.FC<WorkProjectCardProps> = ({
  workItem,
  onClockIn,
  onViewDetails,
  isDisabled = false,
  variant = 'available'
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
        "transition-all cursor-pointer",
        isAssigned 
          ? "bg-gradient-to-r from-success/5 to-success/10 border-success/30 hover:shadow-md" 
          : "opacity-90 hover:opacity-100 border-border/50 hover:border-border hover:shadow-sm"
      )}
      onClick={handleClockIn}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
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
              <div className="flex items-center gap-2 mb-1">
                <AssignmentBadge 
                  isAssignedToMe={workItem.isAssignedToMe} 
                  assigneeName={workItem.assigneeName}
                  className="text-xs"
                />
                <Badge 
                  variant={isAssigned ? "default" : "secondary"}
                  className="text-xs"
                >
                  {workItem.type === 'work_order' ? 'WO' : 'PRJ'}
                </Badge>
                <Badge 
                  variant="success" 
                  className="text-xs"
                >
                  Active
                </Badge>
              </div>

              {/* Title */}
              <h4 className="font-semibold text-sm leading-tight mb-1">
                {workItem.title}
              </h4>

              {/* Subtitle with number */}
              <p className="text-xs text-muted-foreground mb-2">
                {getNumber()}
              </p>

              {/* Status */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{isAssigned ? 'Ready for work' : 'Available'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 ml-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClockIn();
              }}
              disabled={isDisabled}
              className="whitespace-nowrap"
              variant={isAssigned ? "default" : "outline"}
            >
              <Clock className="h-3 w-3 mr-1" />
              {isAssigned ? 'Clock In' : 'Jump In'}
            </Button>
            {isAssigned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(workItem.id);
                }}
                className="whitespace-nowrap"
              >
                <Eye className="h-3 w-3 mr-1" />
                Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};