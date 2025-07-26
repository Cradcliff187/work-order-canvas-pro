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

  return {
    stats,
    isLoading,
    error,
    refetch,
    processQueue: processQueueMutation.mutate,
    isProcessing: processQueueMutation.isPending,
    lastProcessResult: processQueueMutation.data,
    processError: processQueueMutation.error,
  };
};