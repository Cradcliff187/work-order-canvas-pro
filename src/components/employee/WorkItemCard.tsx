import React from 'react';
import { MapPin, Briefcase, Star, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AssignmentBadge } from './AssignmentBadge';
import { StatusDot } from './StatusDot';

interface ClockOption {
  id: string;
  type: 'work_order' | 'project';
  title: string;
  number: string;
  section: 'assigned' | 'recent' | 'available' | 'today';
  assigneeName?: string;
  hoursToday?: number;
  lastWorkedAt?: Date;
  sessionCount?: number;
  isWorkedToday?: boolean;
  isCurrentlyActive?: boolean;
}

interface WorkItemCardProps {
  option: ClockOption;
  isSelected: boolean;
  onSelect: (option: ClockOption) => void;
  className?: string;
  iconClassName?: string;
  showAssignmentBadge?: boolean;
}

export function WorkItemCard({ 
  option, 
  isSelected, 
  onSelect, 
  className,
  iconClassName,
  showAssignmentBadge = true
}: WorkItemCardProps) {
  const getIcon = () => {
    if (option.section === 'assigned') {
      return <Star className="h-4 w-4" />;
    }
    if (option.section === 'recent') {
      return <Clock className="h-4 w-4" />;
    }
    return option.type === 'project' ? <Briefcase className="h-4 w-4" /> : <MapPin className="h-4 w-4" />;
  };

  const getDisplayNumber = () => {
    const prefix = option.type === 'project' ? 'PRJ' : 'WO';
    return `[${prefix}-${option.number}]`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }
    return `${diffMins}m ago`;
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-colors border",
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:bg-accent',
        option.isWorkedToday && 'border-l-4 border-l-green-500 bg-green-50/50',
        className
      )}
      onClick={() => onSelect(option)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center relative",
            iconClassName || "bg-blue-100 text-blue-600"
          )}>
            {getIcon()}
            {option.isCurrentlyActive && (
              <StatusDot 
                status="active" 
                className="absolute -top-1 -right-1" 
                size="sm"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={cn(
                "text-sm truncate",
                option.isWorkedToday ? "font-bold" : "font-medium"
              )}>
                {getDisplayNumber()} {option.title}
              </p>
              {option.sessionCount && option.sessionCount >= 3 && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {option.hoursToday && option.hoursToday > 0 && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  option.isCurrentlyActive 
                    ? "bg-green-500 text-white" 
                    : "bg-green-100 text-green-700"
                )}>
                  {option.hoursToday.toFixed(1)} hrs today
                </span>
              )}
              {option.lastWorkedAt && (
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(option.lastWorkedAt)}
                </span>
              )}
              {showAssignmentBadge && (
                <AssignmentBadge 
                  isAssignedToMe={option.section === 'assigned'} 
                  assigneeName={option.assigneeName}
                  showIcon={false}
                  className="text-xs"
                />
              )}
            </div>
          </div>
          {isSelected && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}