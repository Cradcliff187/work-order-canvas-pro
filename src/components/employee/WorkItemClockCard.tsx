import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Building2, MapPin, User } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { RecentClockItem } from '@/hooks/useRecentlyClocked';
import { cn } from '@/lib/utils';
import { useLocation } from '@/hooks/useLocation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

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
  const { onFieldSave } = useHapticFeedback();
  const { calculateDistance, currentLocation } = useLocation();
  
  const handleClick = () => {
    if (isLoading) return;
    onFieldSave();
    
    if (item.type === 'work_order') {
      onClockIn(item.id, undefined);
    } else {
      onClockIn(undefined, item.id);
    }
  };

  // Calculate distance if location is available  
  const distance = React.useMemo(() => {
    if (currentLocation && (item as any).location) {
      const itemLocation = (item as any).location;
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        itemLocation.latitude || 0,
        itemLocation.longitude || 0
      );
      return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
    }
    return null;
  }, [currentLocation, item, calculateDistance]);

  // Generate assignee avatar for optional assigneeName
  const getAssigneeAvatar = (name?: string) => {
    if (!name) return null;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
    const colorIndex = name.charCodeAt(0) % colors.length;
    
    return (
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white', colors[colorIndex])}>
        {initials}
      </div>
    );
  };

  const assigneeName = (item as any).assigneeName;

  const getTypeConfig = () => {
    if (item.type === 'work_order') {
      return {
        icon: FileText,
        label: 'WO',
        prefix: 'WO-',
        bgColor: 'bg-blue-50 hover:bg-blue-100',
        textColor: 'text-blue-600',
        borderColor: 'border-l-blue-500'
      };
    }
    return {
      icon: Building2,
      label: 'PRJ',
      prefix: 'PRJ-',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      textColor: 'text-purple-600',
      borderColor: 'border-l-purple-500'
    };
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.02] border-l-4 hover:border-l-primary group",
        config.borderColor,
        "bg-gradient-to-br from-background via-background to-muted/30",
        "hover:from-primary/5 hover:via-primary/3 hover:to-primary/5",
        isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-lg p-2.5 transition-all duration-200 group-hover:scale-110", 
              config.bgColor
            )}>
              <Icon className={cn("h-5 w-5", config.textColor)} />
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs font-medium group-hover:border-primary/30 transition-colors"
              >
                {config.label}
              </Badge>
              {assigneeName && getAssigneeAvatar(assigneeName)}
            </div>
          </div>
          {isLoading && (
            <Clock className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>

        <div className="space-y-3">
          <div className="font-semibold text-sm text-muted-foreground group-hover:text-primary transition-colors">
            {config.prefix}{item.number}
          </div>
          <h4 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-primary/90 transition-colors">
            {item.title}
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(item.lastClocked), { addSuffix: true })}
                </span>
              </div>
              
              {distance && (
                <div className="flex items-center gap-1 text-primary/70">
                  <MapPin className="h-3 w-3" />
                  <span>{distance}</span>
                </div>
              )}
            </div>
            
            {assigneeName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="truncate max-w-20">{assigneeName}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};