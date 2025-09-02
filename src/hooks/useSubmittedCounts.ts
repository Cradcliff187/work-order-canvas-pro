import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSubmittedCounts() {
  return useQuery({
    queryKey: ['submitted-counts'],
    queryFn: async () => {
      // Get submitted reports count
      const { count: reportsCount } = await supabase
        .from('work_order_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      // Get submitted bills count
      const { count: billsCount } = await supabase
        .from('subcontractor_bills')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      return {
        reportsCount: reportsCount || 0,
        billsCount: billsCount || 0
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}