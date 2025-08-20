import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MapPin } from 'lucide-react';
import { WorkItem } from '@/hooks/useAllWorkItems';

interface AvailableWorkCardProps {
  workItem: WorkItem;
  onJumpIn: (workOrderId?: string, projectId?: string) => void;
  isDisabled?: boolean;
}

export const AvailableWorkCard: React.FC<AvailableWorkCardProps> = ({
  workItem,
  onJumpIn,
  isDisabled = false
}) => {
  const handleJumpIn = () => {
    if (workItem.type === 'work_order') {
      onJumpIn(workItem.id);
    } else {
      onJumpIn(undefined, workItem.id);
    }
  };

  return (
    <Card className="opacity-90 hover:opacity-100 transition-all border-border/50 hover:border-border">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">
                {workItem.type === 'work_order' ? 'WO' : 'PRJ'}
              </Badge>
              {workItem.assigneeName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="truncate">{workItem.assigneeName}</span>
                </div>
              )}
            </div>
            <h4 className="font-medium text-sm leading-tight mb-1 truncate">
              [{workItem.number}] {workItem.title}
            </h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Available</span>
            </div>
          </div>
          <div className="ml-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleJumpIn}
              disabled={isDisabled}
              className="whitespace-nowrap text-xs"
            >
              Jump In
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};