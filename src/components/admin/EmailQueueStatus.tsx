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
  Calendar,
  Loader2
} from 'lucide-react';
import { useEmailQueueStats } from '@/hooks/useEmailQueueStats';
import { format } from 'date-fns';

const EmailQueueStatus: React.FC = () => {
  const { 
    stats, 
    isLoading, 
    error, 
    refetch, 
    processQueue, 
    isProcessing, 
    lastProcessResult 
  } = useEmailQueueStats();

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
              disabled={!stats?.pending_emails || isProcessing}
              onClick={() => processQueue()}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Processing...' : 'Process Email Queue'}
              {stats?.pending_emails && !isProcessing ? (
                <Badge variant="secondary" className="ml-2">
                  {stats.pending_emails}
                </Badge>
              ) : null}
            </Button>
          )}
        </div>

        {/* Process Results */}
        {lastProcessResult && (
          <div className="pt-4 border-t">
            <div className="flex items-center space-x-2 mb-3">
              {lastProcessResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {lastProcessResult.success ? 'Processing Complete' : 'Processing Failed'}
              </span>
            </div>
            
            {lastProcessResult.success ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-600">
                      {lastProcessResult.processed_count}
                    </div>
                    <div className="text-muted-foreground">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-red-600">
                      {lastProcessResult.failed_count}
                    </div>
                    <div className="text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-600">
                      {lastProcessResult.skipped_count}
                    </div>
                    <div className="text-muted-foreground">Skipped</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Processed at {format(new Date(lastProcessResult.processed_at), 'MMM d, yyyy at h:mm a')}
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-600">
                {lastProcessResult.error || 'An error occurred during processing'}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailQueueStatus;