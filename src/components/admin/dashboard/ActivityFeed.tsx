import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FileText, ClipboardList, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityFeed, ActivityItem } from '@/hooks/useActivityFeed';

type FilterType = 'all' | 'work_orders' | 'reports' | 'invoices';

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'work_order_new':
    case 'work_order_status':
      return FileText;
    case 'report_new':
      return ClipboardList;
    case 'subcontractor_bill_status':
      return DollarSign;
    default:
      return Activity;
  }
};

const filterTypeMap: Record<FilterType, string[]> = {
  all: ['work_order_new', 'work_order_status', 'report_new', 'subcontractor_bill_status'],
  work_orders: ['work_order_new', 'work_order_status'],
  reports: ['report_new'],
  invoices: ['subcontractor_bill_status'],
};

export const ActivityFeed: React.FC = () => {
  const navigate = useNavigate();
  const { activities, isLoading, error } = useActivityFeed();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredActivities = activities.filter(activity =>
    filterTypeMap[activeFilter].includes(activity.type)
  );

  const handleActivityClick = (activity: ActivityItem) => {
    navigate(activity.actionUrl);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            Failed to load activity feed
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 min-h-[28px] touch-manipulation"
              onClick={() => setActiveFilter('all')}
            >
              All
            </Button>
            <Button
              variant={activeFilter === 'work_orders' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 min-h-[28px] touch-manipulation"
              onClick={() => setActiveFilter('work_orders')}
            >
              Work Orders
            </Button>
            <Button
              variant={activeFilter === 'reports' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 min-h-[28px] touch-manipulation"
              onClick={() => setActiveFilter('reports')}
            >
              Reports
            </Button>
            <Button
              variant={activeFilter === 'invoices' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 min-h-[28px] touch-manipulation"
              onClick={() => setActiveFilter('invoices')}
            >
              Invoices
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="space-y-1">
              {filteredActivities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 sm:p-4 rounded-lg hover:bg-muted/50 active:bg-muted/70 cursor-pointer transition-colors min-h-[48px] touch-manipulation"
                    onClick={() => handleActivityClick(activity)}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base leading-tight">
                        {activity.title}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1 leading-tight">
                        {activity.description}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};