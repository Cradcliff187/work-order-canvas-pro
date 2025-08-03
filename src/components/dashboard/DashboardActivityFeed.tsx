import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  CheckCircle, 
  FileText, 
  UserCheck, 
  Activity,
  ArrowRight,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ActivityItem } from '@/hooks/usePartnerSubcontractorActivityFeed';

interface DashboardActivityFeedProps {
  activities: ActivityItem[];
  isLoading: boolean;
  error?: Error | null;
  role: 'partner' | 'subcontractor';
}

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'message':
      return MessageSquare;
    case 'status_change':
      return ArrowRight;
    case 'assignment':
      return UserCheck;
    case 'report_submitted':
    case 'report_approved':
      return FileText;
    default:
      return Activity;
  }
};

const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'message':
      return 'text-blue-600 bg-blue-100';
    case 'status_change':
      return 'text-green-600 bg-green-100';
    case 'assignment':
      return 'text-purple-600 bg-purple-100';
    case 'report_submitted':
      return 'text-orange-600 bg-orange-100';
    case 'report_approved':
      return 'text-emerald-600 bg-emerald-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const DashboardActivityFeed: React.FC<DashboardActivityFeedProps> = ({
  activities,
  isLoading,
  error,
  role
}) => {
  const navigate = useNavigate();

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/${role}/work-orders`)}
        >
          View All Work Orders
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No recent activity"
            description="Activity for your work orders will appear here when there are new messages, status changes, or assignments."
            variant="card"
          />
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-1">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                const colorClasses = getActivityColor(activity.type);
                
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                    onClick={() => handleActivityClick(activity)}
                  >
                    {/* Icon */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${colorClasses} flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header with unread indicator */}
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">
                            {activity.title}
                          </h4>
                          {activity.isUnread && (
                            <Badge variant="default" className="text-xs px-1.5 py-0.5">
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                      
                      {/* Work Order Info */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary">
                          {activity.work_order_number}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {activity.location}
                        </span>
                      </div>
                      
                      {/* Description */}
                      <div className="text-xs text-muted-foreground leading-tight">
                        {activity.description}
                      </div>
                      
                      {/* Status change indicator */}
                      {activity.type === 'status_change' && activity.old_status && activity.new_status && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.old_status}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="default" className="text-xs">
                            {activity.new_status}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};