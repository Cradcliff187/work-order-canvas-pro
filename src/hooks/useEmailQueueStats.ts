import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmailQueueStats {
  pending_emails: number;
  sent_emails: number;
  failed_emails: number;
  total_emails: number;
  last_processed: string | null;
}

export const useEmailQueueStats = () => {
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

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};