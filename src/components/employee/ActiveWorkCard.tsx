import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, MapPin, Eye } from 'lucide-react';
import { WorkItem } from '@/hooks/useAllWorkItems';

interface ActiveWorkCardProps {
  workItem: WorkItem;
  onClockIn: (workOrderId?: string, projectId?: string) => void;
  onViewDetails: (id: string) => void;
  isDisabled?: boolean;
}

export const ActiveWorkCard: React.FC<ActiveWorkCardProps> = ({
  workItem,
  onClockIn,
  onViewDetails,
  isDisabled = false
}) => {
  const handleClockIn = () => {
    if (workItem.type === 'work_order') {
      onClockIn(workItem.id);
    } else {
      onClockIn(undefined, workItem.id);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-success/5 to-success/10 border-success/30 hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="bg-success/20 rounded-full p-2">
              <Star className="h-4 w-4 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-success text-success-foreground">
                  ASSIGNED
                </Badge>
                <Badge variant="outline">
                  {workItem.type === 'work_order' ? 'WO' : 'PRJ'}
                </Badge>
              </div>
              <h4 className="font-semibold text-sm leading-tight mb-1">
                [{workItem.number}] {workItem.title}
              </h4>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Ready for work
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 ml-2">
            <Button
              size="sm"
              onClick={handleClockIn}
              disabled={isDisabled}
              className="whitespace-nowrap"
            >
              <Clock className="h-3 w-3 mr-1" />
              Clock In
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(workItem.id)}
              className="whitespace-nowrap"
            >
              <Eye className="h-3 w-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};