import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface EmailQueueStats {
  pending_emails: number;
  sent_emails: number;
  failed_emails: number;
  total_emails: number;
  last_processed: string | null;
}

export interface ProcessQueueResult {
  success: boolean;
  processed_count: number;
  failed_count: number;
  skipped_count: number;
  processed_at: string;
  error?: string;
}

export interface ClearEmailsResult {
  success: boolean;
  deleted_count: number;
  error?: string;
}

export interface RetryEmailsResult {
  success: boolean;
  retry_count: number;
  error?: string;
}

export const useEmailQueueStats = () => {
  const queryClient = useQueryClient();
  
  const {
    data: stats,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['email_queue_stats'],
    queryFn: async (): Promise<EmailQueueStats> => {
      // Query the email_queue table directly using any type since it's not in generated types yet
      const { data, error } = await supabase
        .from('email_queue' as any)
        .select('status, processed_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const queueData = data as any[] || [];
      
      const stats = {
        total_emails: queueData.length,
        pending_emails: queueData.filter((item: any) => item.status === 'pending').length,
        sent_emails: queueData.filter((item: any) => item.status === 'sent').length,
        failed_emails: queueData.filter((item: any) => item.status === 'failed').length,
        last_processed: queueData.find((item: any) => item.processed_at)?.processed_at || null
      };

      return stats;
    },
    refetchInterval: 30000, // 30 seconds
  });

  const processQueueMutation = useMutation({
    mutationFn: async (): Promise<ProcessQueueResult> => {
      const { data, error } = await supabase.functions.invoke('process-email-queue');
      
      if (error) {
        throw new Error(error.message || 'Failed to process email queue');
      }
      
      return data as ProcessQueueResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Email Queue Processed",
          description: `Processed: ${result.processed_count}, Failed: ${result.failed_count}, Skipped: ${result.skipped_count}`,
        });
        
        // Refresh the queue statistics
        queryClient.invalidateQueries({ queryKey: ['email_queue_stats'] });
      } else {
        toast({
          variant: "destructive",
          title: "Processing Failed",
          description: result.error || "Failed to process email queue",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: error.message || "An unexpected error occurred while processing the queue",
      });
    },
  });

  const clearProcessedEmailsMutation = useMutation({
    mutationFn: async (retentionDays: number): Promise<ClearEmailsResult> => {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      
      const { count, error } = await supabase
        .from('email_queue' as any)
        .delete({ count: 'exact' })
        .in('status', ['sent', 'failed'])
        .lt('created_at', cutoffDate);

      if (error) {
        throw new Error(error.message || 'Failed to clear old emails');
      }

      return {
        success: true,
        deleted_count: count || 0
      };
    },
    onSuccess: (result) => {
      toast({
        title: "Old Emails Cleared",
        description: `Deleted ${result.deleted_count} old emails`,
      });
      queryClient.invalidateQueries({ queryKey: ['email_queue_stats'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: error.message || "Failed to clear old emails",
      });
    },
  });

  const retryFailedEmailsMutation = useMutation({
    mutationFn: async (): Promise<RetryEmailsResult> => {
      const { count, error } = await supabase
        .from('email_queue' as any)
        .update({ 
          status: 'pending', 
          error_message: null,
          next_retry_at: null
        }, { count: 'exact' })
        .eq('status', 'failed')
        .lt('retry_count', 3);

      if (error) {
        throw new Error(error.message || 'Failed to retry failed emails');
      }

      return {
        success: true,
        retry_count: count || 0
      };
    },
    onSuccess: (result) => {
      toast({
        title: "Failed Emails Retried",
        description: `Reset ${result.retry_count} failed emails to pending`,
      });
      queryClient.invalidateQueries({ queryKey: ['email_queue_stats'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Retry Failed",
        description: error.message || "Failed to retry failed emails",
      });
    },
  });

  // Function to get accurate counts before confirmation
  const getCountableEmails = async (action: 'clear' | 'retry', retentionDays?: number): Promise<number> => {
    if (action === 'clear' && retentionDays) {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      
      const { count, error } = await supabase
        .from('email_queue' as any)
        .select('*', { count: 'exact', head: true })
        .in('status', ['sent', 'failed'])
        .lt('created_at', cutoffDate);

      if (error) throw new Error('Failed to count clearable emails');
      return count || 0;
    } else if (action === 'retry') {
      const { count, error } = await supabase
        .from('email_queue' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .lt('retry_count', 3);

      if (error) throw new Error('Failed to count retryable emails');
      return count || 0;
    }
    
    return 0;
  };

  return {
    stats,
    isLoading,
    error,
    refetch,
    processQueue: processQueueMutation.mutate,
    isProcessing: processQueueMutation.isPending,
    lastProcessResult: processQueueMutation.data,
    processError: processQueueMutation.error,
    clearProcessedEmails: clearProcessedEmailsMutation.mutate,
    isClearingEmails: clearProcessedEmailsMutation.isPending,
    clearEmailsResult: clearProcessedEmailsMutation.data,
    retryFailedEmails: retryFailedEmailsMutation.mutate,
    isRetryingFailed: retryFailedEmailsMutation.isPending,
    retryEmailsResult: retryFailedEmailsMutation.data,
    getCountableEmails,
  };
};