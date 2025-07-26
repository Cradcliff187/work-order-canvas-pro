import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export function useUserAccessibleWorkOrders() {
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['user-accessible-work-orders', profile?.id, profile?.user_type],
    queryFn: async () => {
      if (!profile?.id || !profile?.user_type) {
        return [];
      }

      let query = supabase.from('work_orders').select('id');

      // Filter based on user type
      switch (profile.user_type) {
        case 'admin':
        case 'employee':
          // Admin and employees can see all work orders
          break;
        
        case 'partner': {
          // Partners can only see work orders from their organization
          const { data: userOrgs } = await supabase
            .from('user_organizations')
            .select('organization_id')
            .eq('user_id', profile.id);
          
          const orgIds = userOrgs?.map(uo => uo.organization_id) || [];
          if (orgIds.length === 0) return [];
          
          query = query.in('organization_id', orgIds);
          break;
        }
        
        case 'subcontractor': {
          // Subcontractors can only see assigned work orders
          const { data: assignments } = await supabase
            .from('work_order_assignments')
            .select('work_order_id')
            .eq('assigned_to', profile.id);
          
          const workOrderIds = assignments?.map(a => a.work_order_id) || [];
          if (workOrderIds.length === 0) return [];
          
          query = query.in('id', workOrderIds);
          break;
        }
        
        default:
          return [];
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data?.map(wo => wo.id) || [];
    },
    enabled: !!profile?.id && !!profile?.user_type,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}