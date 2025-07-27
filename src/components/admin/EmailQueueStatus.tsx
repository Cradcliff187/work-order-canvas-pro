import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, Clock, Mail, Loader2, RefreshCw, Trash2, RotateCcw, ChevronDown, TrendingUp, Activity } from 'lucide-react';
import { useEmailQueueStats } from '@/hooks/useEmailQueueStats';
import { useProcessingHistory } from '@/hooks/useProcessingHistory';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Progress } from '@/components/ui/progress';

interface ConfirmationState {
  action: 'clear' | 'retry' | null;
  count: number;
  retention?: number;
}

export function EmailQueueStatus() {
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({ action: null, count: 0 });
  const [isCountingEmails, setIsCountingEmails] = useState(false);
  const operationInProgress = useRef(false);
  
  const {
    stats,
    isLoading,
    error,
    refetch,
    processQueue,
    isProcessing,
    lastProcessResult,
    clearProcessedEmails,
    isClearingEmails,
    retryFailedEmails,
    isRetryingFailed,
    getCountableEmails
  } = useEmailQueueStats();

  const {
    data: processingHistory,
    isLoading: isLoadingHistory,
    error: historyError
  } = useProcessingHistory();

  // Validation helper
  const validateRetentionDays = (days: number): boolean => {
    return days >= 1 && days <= 365;
  };

  // Prevent concurrent operations
  const isAnyOperationInProgress = isProcessing || isClearingEmails || isRetryingFailed || operationInProgress.current;

  // Get queue status badge based on current state
  const getQueueStatusBadge = () => {
    if (isProcessing) {
      return { variant: "default" as const, text: "Processing", pulse: true };
    }
    if (stats?.failed_emails && stats.failed_emails > 0) {
      return { variant: "destructive" as const, text: "Failed", pulse: true };
    }
    if (stats?.pending_emails && stats.pending_emails > 0) {
      return { variant: "secondary" as const, text: "Pending", pulse: true };
    }
    if (stats?.total_emails === 0) {
      return { variant: "outline" as const, text: "Idle", pulse: false };
    }
    return { variant: "outline" as const, text: "Idle", pulse: false };
  };


  const handleClearEmails = useCallback(async (retentionDays: number) => {
    if (isAnyOperationInProgress) return;
    
    // Validation
    if (!validateRetentionDays(retentionDays)) {
      toast({
        variant: "destructive",
        title: "Invalid retention period",
        description: "Retention period must be between 1 and 365 days",
      });
      return;
    }

    operationInProgress.current = true;
    setIsCountingEmails(true);
    
    try {
      const count = await getCountableEmails('clear', retentionDays);
      setConfirmationState({ 
        action: 'clear', 
        count, 
        retention: retentionDays 
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to count emails",
        description: "Unable to estimate the number of emails to clear",
      });
    } finally {
      setIsCountingEmails(false);
      operationInProgress.current = false;
    }
  }, [getCountableEmails, isAnyOperationInProgress]);

  const handleRetryFailed = useCallback(async () => {
    if (isAnyOperationInProgress) return;
    
    operationInProgress.current = true;
    setIsCountingEmails(true);
    
    try {
      const count = await getCountableEmails('retry');
      setConfirmationState({ 
        action: 'retry', 
        count 
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to count failed emails",
        description: "Unable to estimate the number of emails to retry",
      });
    } finally {
      setIsCountingEmails(false);
      operationInProgress.current = false;
    }
  }, [getCountableEmails, isAnyOperationInProgress]);

  const handleConfirm = useCallback(() => {
    if (isAnyOperationInProgress) return;
    
    operationInProgress.current = true;
    
    if (confirmationState.action === 'clear' && confirmationState.retention) {
      clearProcessedEmails(confirmationState.retention);
    } else if (confirmationState.action === 'retry') {
      retryFailedEmails();
    }
    
    setConfirmationState({ action: null, count: 0 });
    // operationInProgress.current will be reset by mutation completion
  }, [confirmationState, clearProcessedEmails, retryFailedEmails, isAnyOperationInProgress]);

  // Reset operation lock when mutations complete
  React.useEffect(() => {
    if (!isProcessing && !isClearingEmails && !isRetryingFailed) {
      operationInProgress.current = false;
    }
  }, [isProcessing, isClearingEmails, isRetryingFailed]);

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load email queue statistics';
    const isNetworkError = errorMessage.includes('network') || errorMessage.includes('fetch');
    
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-destructive space-y-3">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>
                {isNetworkError 
                  ? 'Network error - please check your connection' 
                  : 'Failed to load email queue statistics'}
              </span>
            </div>
            {isNetworkError && (
              <p className="text-sm text-muted-foreground text-center">
                This could be due to a temporary network issue. Please try again.
              </p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()} 
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Queue Status
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {!isLoading && stats && (
                <Badge 
                  variant={getQueueStatusBadge().variant}
                  className={getQueueStatusBadge().pulse ? 'animate-pulse' : ''}
                >
                  {getQueueStatusBadge().text}
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Monitor and manage the email processing queue
          </CardDescription>
          
          {/* Health Score Section */}
          {!isLoading && stats && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">System Health Score</span>
                </div>
                <div className="text-right">
                  {stats.total_emails > 0 ? (
                    <>
                      <div className={`text-lg font-bold ${
                        Math.round((stats.sent_emails / stats.total_emails) * 100) >= 95 ? 'text-green-600' :
                        Math.round((stats.sent_emails / stats.total_emails) * 100) >= 80 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {Math.round((stats.sent_emails / stats.total_emails) * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Delivery Rate</div>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-bold text-muted-foreground">N/A</div>
                      <div className="text-xs text-muted-foreground">No Data</div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Queue Depth Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Queue Depth</span>
                  <span className="text-muted-foreground">
                    {stats.pending_emails} pending
                  </span>
                </div>
                <Progress 
                  value={stats.total_emails > 0 ? (stats.pending_emails / Math.max(stats.total_emails, 10)) * 100 : 0}
                  className={`h-2 ${
                    stats.pending_emails === 0 ? 'bg-green-100' :
                    stats.pending_emails <= 10 ? 'bg-green-100' :
                    stats.pending_emails <= 50 ? 'bg-orange-100' : 'bg-red-100'
                  }`}
                />
              </div>
            </div>
          )}
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Queue Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pending Emails */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">
                {stats?.pending_emails || 0}
              </div>
            )}
          </div>

          {/* Sent Emails */}
          <div className="space-y-2">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm font-medium">Sent</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {stats?.sent_emails || 0}
              </div>
            )}
          </div>

          {/* Failed Emails */}
          <div className="space-y-2">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm font-medium">Failed</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {stats?.failed_emails || 0}
              </div>
            )}
          </div>

          {/* Total Emails */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Mail className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm font-medium">Total</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.total_emails || 0}
              </div>
            )}
          </div>
        </div>

        {/* Last Processed Info */}
        <div className="border-t pt-4">
          <div className="text-sm">
            <span className="font-medium">Last processed: </span>
            {isLoading ? (
              <Skeleton className="inline-block h-4 w-32" />
            ) : stats?.last_processed ? (
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(stats.last_processed), { addSuffix: true })}
              </span>
            ) : (
              <span className="text-muted-foreground">Never</span>
            )}
          </div>
        </div>

        {/* Automated Processing Info */}
        <div className="border-t pt-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Automated processing runs every 5 minutes via pg_cron</span>
          </div>
        </div>

        {/* 24-Hour Stats */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>24h Delivery Rate</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : stats?.total_emails > 0 ? (
                <div className="text-lg font-semibold text-green-600 mt-1">
                  {Math.round((stats.sent_emails / stats.total_emails) * 100)}%
                </div>
              ) : (
                <div className="text-lg font-semibold text-muted-foreground mt-1">N/A</div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Processing Trend</span>
              </div>
              <div className="text-lg font-semibold mt-1">
                {processingHistory && processingHistory.length > 0 ? (
                  processingHistory.reduce((sum, entry) => sum + entry.processed_count, 0) > 0 ? 'Active' : 'Stable'
                ) : 'No Data'}
              </div>
            </div>
          </div>
        </div>

        {/* Processing Trend Mini-Graph */}
        <div className="border-t pt-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Processing Trend (7 days)
            </h4>
            {isLoadingHistory ? (
              <Skeleton className="h-24 w-full" />
            ) : historyError || !processingHistory || processingHistory.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded">
                No trend data available
              </div>
            ) : (
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processingHistory.slice(-7)}>
                    <XAxis 
                      dataKey="processed_at" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Line 
                      type="monotone" 
                      dataKey="processed_count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Recent Processing History */}
        <div className="border-t pt-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Processing History</h4>
            {isLoadingHistory ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : historyError ? (
              <div className="text-sm text-muted-foreground">
                Failed to load processing history
              </div>
            ) : !processingHistory || processingHistory.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No processing history available
              </div>
            ) : (
              <div className="space-y-2">
                {processingHistory.slice(0, 3).map((entry) => {
                  const duration = entry.duration_ms < 1000 
                    ? `${entry.duration_ms}ms` 
                    : `${(entry.duration_ms / 1000).toFixed(1)}s`;
                  
                  return (
                    <div key={entry.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.processed_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>{entry.processed_count}</span>
                        </div>
                        {entry.failed_count > 0 && (
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            <span>{entry.failed_count}</span>
                          </div>
                        )}
                        <span className="text-muted-foreground">{duration}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Processing Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => processQueue()}
                disabled={!stats?.pending_emails || isAnyOperationInProgress}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Process Email Queue
                    {stats?.pending_emails && stats.pending_emails > 0 && (
                      <span className="ml-2 bg-primary-foreground text-primary px-2 py-1 rounded-full text-xs">
                        {stats.pending_emails}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!stats?.pending_emails 
                ? "No pending emails to process" 
                : isAnyOperationInProgress
                ? "Another operation is in progress"
                : `Process ${stats.pending_emails} pending email${stats.pending_emails === 1 ? '' : 's'}`
              }
            </TooltipContent>
          </Tooltip>

          {/* Queue Management Actions */}
          <div className="flex gap-2">
            {/* Clear Old Emails Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      disabled={!stats?.total_emails || isAnyOperationInProgress || isCountingEmails}
                      className="flex-1"
                    >
                      {isClearingEmails || isCountingEmails ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Clear Old Emails
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  {!stats?.total_emails 
                    ? "No emails to clear" 
                    : isAnyOperationInProgress
                    ? "Another operation is in progress"
                    : "Remove old processed emails to keep the queue clean"
                  }
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={() => handleClearEmails(7)}
                  disabled={isAnyOperationInProgress}
                >
                  Clear emails older than 7 days
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleClearEmails(14)}
                  disabled={isAnyOperationInProgress}
                >
                  Clear emails older than 14 days
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleClearEmails(30)}
                  disabled={isAnyOperationInProgress}
                >
                  Clear emails older than 30 days
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Retry Failed Button */}
            {stats?.failed_emails && stats.failed_emails > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleRetryFailed}
                    disabled={isAnyOperationInProgress || isCountingEmails}
                    className="flex-1"
                  >
                    {isRetryingFailed || isCountingEmails ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Retry Failed
                    <span className="ml-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs">
                      {stats.failed_emails}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAnyOperationInProgress
                    ? "Another operation is in progress"
                    : `Reset ${stats.failed_emails} failed email${stats.failed_emails === 1 ? '' : 's'} to pending status`
                  }
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    disabled
                    className="flex-1 opacity-50"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retry Failed
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  No failed emails to retry
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Processing Results */}
        {lastProcessResult && (
          <div className="border-t pt-4">
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
                  Processed {formatDistanceToNow(new Date(lastProcessResult.processed_at), { addSuffix: true })}
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

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmationState.action !== null} 
        onOpenChange={() => setConfirmationState({ action: null, count: 0 })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmationState.action === 'clear' ? 'Clear Old Emails' : 'Retry Failed Emails'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationState.action === 'clear' 
                ? confirmationState.count > 0
                  ? `This will permanently delete ${confirmationState.count} emails older than ${confirmationState.retention} days. This action cannot be undone.`
                  : `No emails found older than ${confirmationState.retention} days to delete.`
                : confirmationState.count > 0
                ? `This will reset ${confirmationState.count} failed emails to pending status and attempt to process them again.`
                : 'No failed emails found that can be retried.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAnyOperationInProgress}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={confirmationState.count === 0 || isAnyOperationInProgress}
              className={confirmationState.action === 'clear' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {isAnyOperationInProgress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {confirmationState.action === 'clear' ? 'Deleting...' : 'Retrying...'}
                </>
              ) : (
                confirmationState.action === 'clear' ? 'Delete Emails' : 'Retry Emails'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </Card>
    </TooltipProvider>
  );
}