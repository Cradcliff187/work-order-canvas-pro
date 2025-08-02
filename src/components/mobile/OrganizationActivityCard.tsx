import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Clock, FileText, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OrganizationActivity {
  id: string;
  type: 'report_submitted' | 'work_started' | 'work_completed' | 'message_sent';
  work_order_number: string;
  work_order_title: string;
  user_name: string;
  user_avatar?: string;
  timestamp: string;
  organization_name: string;
}

interface OrganizationActivityCardProps {
  activities: OrganizationActivity[];
  className?: string;
}

const activityConfig = {
  report_submitted: {
    icon: FileText,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    label: 'submitted a report for'
  },
  work_started: {
    icon: Clock,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    label: 'started work on'
  },
  work_completed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    label: 'completed work on'
  },
  message_sent: {
    icon: FileText,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    label: 'sent a message about'
  },
};

export function OrganizationActivityCard({ activities, className }: OrganizationActivityCardProps) {
  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No recent team activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Team Activity</h3>
        </div>
        
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => {
            const config = activityConfig[activity.type];
            const Icon = config.icon;
            
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={activity.user_avatar} />
                  <AvatarFallback className="text-xs">
                    {activity.user_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className={config.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {activity.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{activity.user_name}</span>
                    {' '}{config.label}{' '}
                    <span className="font-medium">{activity.work_order_number}</span>
                  </p>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {activities.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t">
            +{activities.length - 5} more activities
          </p>
        )}
      </CardContent>
    </Card>
  );
}