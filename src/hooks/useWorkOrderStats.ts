
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WorkOrderStats {
  totalWorkOrders: number;
  pendingWorkOrders: number;
  activeUsers: number;
  totalOrganizations: number;
}

export const useWorkOrderStats = () => {
  return useQuery({
    queryKey: ['work-order-stats'],
    queryFn: async (): Promise<WorkOrderStats> => {
      console.log('Fetching dashboard metrics...');
      
      // Get total work orders
      const { count: totalWorkOrders } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true });

      // Get pending work orders (received status)
      const { count: pendingWorkOrders } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'received');

      // Get active users
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get total organizations
      const { count: totalOrganizations } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      console.log('Dashboard metrics fetched successfully');

      return {
        totalWorkOrders: totalWorkOrders || 0,
        pendingWorkOrders: pendingWorkOrders || 0,
        activeUsers: activeUsers || 0,
        totalOrganizations: totalOrganizations || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
