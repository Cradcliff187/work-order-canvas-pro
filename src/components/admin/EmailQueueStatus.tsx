import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { useEmailQueueStats } from '@/hooks/useEmailQueueStats';
import { format } from 'date-fns';

const EmailQueueStatus: React.FC = () => {
  const { stats, isLoading, error, refetch } = useEmailQueueStats();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">Unable to load queue status</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="h-5 w-5 mr-2" />
          Email Queue Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Queue Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pending */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">{stats?.pending_emails || 0}</span>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Waiting
                </Badge>
              </div>
            )}
          </div>

          {/* Sent */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sent</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">{stats?.sent_emails || 0}</span>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Success
                </Badge>
              </div>
            )}
          </div>

          {/* Failed */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Failed</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">{stats?.failed_emails || 0}</span>
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">{stats?.total_emails || 0}</span>
                <Badge variant="outline">All</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Last Processed */}
        <div className="flex items-center justify-between py-3 border-t">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Last Processed:</span>
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span className="text-sm text-muted-foreground">
                {stats?.last_processed 
                  ? format(new Date(stats.last_processed), 'MMM d, yyyy at h:mm a')
                  : 'Never'
                }
              </span>
            )}
          </div>
        </div>

        {/* Process Button */}
        <div className="pt-2">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Button 
              className="w-full" 
              disabled={!stats?.pending_emails}
            >
              <Mail className="h-4 w-4 mr-2" />
              Process Email Queue
              {stats?.pending_emails ? (
                <Badge variant="secondary" className="ml-2">
                  {stats.pending_emails}
                </Badge>
              ) : null}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailQueueStatus;