import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RecentlyClockedWorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  last_clocked: string;
}

export const useRecentlyClockedWorkOrders = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['recently-clocked-work-orders', profile?.id],
    queryFn: async (): Promise<RecentlyClockedWorkOrder[]> => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('employee_reports')
        .select(`
          work_order_id,
          created_at,
          work_orders (
            id,
            work_order_number,
            title
          )
        `)
        .eq('employee_user_id', profile.id)
        .not('work_order_id', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get unique work orders (most recent first)
      const uniqueWorkOrders = new Map<string, RecentlyClockedWorkOrder>();
      
      data?.forEach((report) => {
        if (report.work_orders && report.work_order_id && !uniqueWorkOrders.has(report.work_order_id)) {
          uniqueWorkOrders.set(report.work_order_id, {
            id: report.work_orders.id,
            work_order_number: report.work_orders.work_order_number,
            title: report.work_orders.title,
            last_clocked: report.created_at
          });
        }
      });
      
      // Return last 3 unique work orders
      return Array.from(uniqueWorkOrders.values()).slice(0, 3);
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};