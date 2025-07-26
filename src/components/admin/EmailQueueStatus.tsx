import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { AlertTriangle, CheckCircle, Clock, Mail, Loader2, RefreshCw, Trash2, RotateCcw, ChevronDown } from 'lucide-react';
import { useEmailQueueStats } from '@/hooks/useEmailQueueStats';
import { formatDistanceToNow } from 'date-fns';

interface ConfirmationState {
  action: 'clear' | 'retry' | null;
  count: number;
  retention?: number;
}

export function EmailQueueStatus() {
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({ action: null, count: 0 });
  
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
    isRetryingFailed
  } = useEmailQueueStats();

  const handleClearEmails = (retentionDays: number) => {
    setConfirmationState({ 
      action: 'clear', 
      count: (stats?.sent_emails || 0) + (stats?.failed_emails || 0), 
      retention: retentionDays 
    });
  };

  const handleRetryFailed = () => {
    setConfirmationState({ 
      action: 'retry', 
      count: stats?.failed_emails || 0 
    });
  };

  const handleConfirm = () => {
    if (confirmationState.action === 'clear' && confirmationState.retention) {
      clearProcessedEmails(confirmationState.retention);
    } else if (confirmationState.action === 'retry') {
      retryFailedEmails();
    }
    setConfirmationState({ action: null, count: 0 });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>Failed to load email queue statistics</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()} 
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
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
        <CardDescription>
          Monitor and manage the email processing queue
        </CardDescription>
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

        <div className="space-y-4">
          {/* Processing Button */}
          <Button
            onClick={() => processQueue()}
            disabled={!stats?.pending_emails || isProcessing}
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

          {/* Queue Management Actions */}
          <div className="flex gap-2">
            {/* Clear Old Emails Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={!stats?.total_emails || isClearingEmails}
                  className="flex-1"
                >
                  {isClearingEmails ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Clear Old Emails
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleClearEmails(7)}>
                  Clear emails older than 7 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleClearEmails(14)}>
                  Clear emails older than 14 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleClearEmails(30)}>
                  Clear emails older than 30 days
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Retry Failed Button */}
            {stats?.failed_emails && stats.failed_emails > 0 && (
              <Button
                variant="outline"
                onClick={handleRetryFailed}
                disabled={isRetryingFailed}
                className="flex-1"
              >
                {isRetryingFailed ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Retry Failed
                <span className="ml-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs">
                  {stats.failed_emails}
                </span>
              </Button>
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
                ? `This will permanently delete approximately ${confirmationState.count} emails older than ${confirmationState.retention} days. This action cannot be undone.`
                : `This will reset ${confirmationState.count} failed emails to pending status and attempt to process them again.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmationState.action === 'clear' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmationState.action === 'clear' ? 'Delete Emails' : 'Retry Emails'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}