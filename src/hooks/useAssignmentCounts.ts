import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AssignmentCounts {
  workOrders: number;
  projects: number;
  total: number;
}

export function useAssignmentCounts() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['assignment-counts', profile?.id],
    queryFn: async (): Promise<AssignmentCounts> => {
      if (!profile?.id) {
        return { workOrders: 0, projects: 0, total: 0 };
      }

      // Get work order assignments count
      const { count: workOrderCount, error: woError } = await supabase
        .from('work_order_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', profile.id);

      if (woError) throw woError;

      // Get project assignments count
      const { count: projectCount, error: projError } = await supabase
        .from('project_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', profile.id);

      if (projError) throw projError;

      const workOrders = workOrderCount || 0;
      const projects = projectCount || 0;

      return {
        workOrders,
        projects,
        total: workOrders + projects,
      };
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}