import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, User, Briefcase, DollarSign, FileText, Check, X, Flag, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimeEntry } from '@/hooks/useTimeManagement';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { parseDateOnly } from '@/lib/utils/date';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobileTimeEntryCardProps {
  entry: TimeEntry;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onEdit?: (entry: TimeEntry) => void;
  onDelete?: (entryId: string) => void;
  onApprove?: (entryId: string) => void;
  onReject?: (entryId: string) => void;
  onFlag?: (entryId: string) => void;
  className?: string;
}

export function MobileTimeEntryCard({
  entry,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onFlag,
  className
}: MobileTimeEntryCardProps) {
  const { triggerHaptic } = useHapticFeedback();

  const handleApprove = () => {
    triggerHaptic({ pattern: 'success' });
    onApprove?.(entry.id);
  };

  const handleReject = () => {
    triggerHaptic({ pattern: 'error' });
    onReject?.(entry.id);
  };

  const getStatusBadge = () => {
    switch (entry.approval_status) {
      case 'approved':
        return <Badge variant="default" className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'flagged':
        return <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">Flagged</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const workItem = entry.work_order || entry.project;
  const workItemType = entry.work_order ? 'Work Order' : 'Project';
  const workItemNumber = entry.work_order?.work_order_number || entry.project?.project_number;
  const workItemTitle = entry.work_order?.title || entry.project?.name;

  const actions = [
    {
      label: 'Edit',
      icon: Edit,
      onClick: () => onEdit?.(entry),
      show: true,
    },
    {
      label: 'Approve',
      icon: Check,
      onClick: handleApprove,
      show: entry.approval_status === 'pending' && !!onApprove,
    },
    {
      label: 'Reject',
      icon: X,
      onClick: handleReject,
      variant: 'destructive' as const,
      show: entry.approval_status === 'pending' && !!onReject,
    },
    {
      label: 'Flag',
      icon: Flag,
      onClick: () => onFlag?.(entry.id),
      show: entry.approval_status !== 'flagged' && !!onFlag,
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => onDelete?.(entry.id),
      variant: 'destructive' as const,
      show: !!onDelete,
    },
  ];

  const cardContent = (
    <Card 
      className={cn(
        "transition-shadow duration-200 border-border",
        selected && "bg-muted ring-2 ring-primary",
        className
      )}
    >
      <CardContent className="p-4 min-h-[48px]">
        <div className="space-y-3">
          {/* Header with checkbox, employee, and status */}
          <div className="flex items-start justify-between gap-3">
            {onSelect && (
              <div className="flex-shrink-0 pt-1">
                <Checkbox
                  checked={selected}
                  onCheckedChange={onSelect}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-semibold text-sm truncate">
                  {entry.employee.first_name} {entry.employee.last_name}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{format(parseDateOnly(entry.report_date), 'MMM d, yyyy')}</span>
                <span>•</span>
                <span>{entry.hours_worked}h</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge()}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.filter(action => action.show).map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                        }}
                        className={action.variant === 'destructive' ? 'text-destructive' : ''}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Work item info */}
          {workItem && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Badge variant="outline" className="text-xs">{workItemType}</Badge>
                <span className="font-medium truncate">{workItemNumber}</span>
              </div>
            </div>
          )}

          {/* Work performed */}
          {entry.work_performed && (
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {entry.work_performed}
              </p>
            </div>
          )}

          {/* Cost information */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">${entry.total_labor_cost.toFixed(2)}</span>
              <span className="text-muted-foreground">
                (${entry.hourly_rate_snapshot}/hr)
              </span>
            </div>
            {entry.materials_cost && entry.materials_cost > 0 && (
              <div className="text-xs text-muted-foreground">
                +${entry.materials_cost.toFixed(2)} materials
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Add swipe functionality for approve/reject actions
  if (entry.approval_status === 'pending') {
    return (
      <SwipeableListItem
        onSwipeRight={onApprove ? () => handleApprove() : undefined}
        onSwipeLeft={onReject ? () => handleReject() : undefined}
        rightAction={onApprove ? { icon: Check, label: 'Approve', color: 'success' } : undefined}
        leftAction={onReject ? { icon: X, label: 'Reject', color: 'destructive' } : undefined}
        className={className}
      >
        {cardContent}
      </SwipeableListItem>
    );
  }

  return cardContent;
}