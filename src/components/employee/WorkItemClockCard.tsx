import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Building2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { RecentClockItem } from '@/hooks/useRecentlyClocked';
import { cn } from '@/lib/utils';

interface WorkItemClockCardProps {
  item: RecentClockItem;
  onClockIn: (workOrderId?: string, projectId?: string) => void;
  isLoading: boolean;
}

export const WorkItemClockCard: React.FC<WorkItemClockCardProps> = ({
  item,
  onClockIn,
  isLoading
}) => {
  const handleClick = () => {
    if (isLoading) return;
    
    if (item.type === 'work_order') {
      onClockIn(item.id, undefined);
    } else {
      onClockIn(undefined, item.id);
    }
  };

  const getTypeConfig = () => {
    if (item.type === 'work_order') {
      return {
        icon: FileText,
        label: 'WO',
        prefix: 'WO-'
      };
    }
    return {
      icon: Building2,
      label: 'PRJ',
      prefix: 'PRJ-'
    };
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg border-2",
        "bg-gradient-to-br from-background via-background to-muted/30",
        "hover:from-primary/5 hover:via-primary/3 hover:to-primary/5",
        "hover:border-primary/40 active:scale-[0.98]",
        isLoading && "opacity-70 cursor-not-allowed"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <Badge 
              variant="secondary" 
              className="text-xs font-medium bg-muted/50"
            >
              {config.label}
            </Badge>
          </div>
          {isLoading && (
            <Clock className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>

        <div className="space-y-2">
          <div className="font-semibold text-sm text-muted-foreground">
            {config.prefix}{item.number}
          </div>
          <h4 className="font-bold text-base leading-tight line-clamp-2">
            {item.title}
          </h4>
          <div className="text-xs text-muted-foreground pt-1">
            Last worked: {formatDistanceToNow(new Date(item.lastClocked), { addSuffix: true })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};