import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingHistoryEntry {
  id: string;
  processed_at: string;
  processed_count: number;
  failed_count: number;
  duration_ms: number;
}

export function useProcessingHistory() {
  return useQuery({
    queryKey: ['processing_history'],
    queryFn: async (): Promise<ProcessingHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('email_queue_processing_log')
        .select('id, processed_at, processed_count, failed_count, duration_ms')
        .order('processed_at', { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}