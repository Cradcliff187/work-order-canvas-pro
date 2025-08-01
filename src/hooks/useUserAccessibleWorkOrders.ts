import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export function useUserAccessibleWorkOrders() {
  const { profile, isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();

  return useQuery({
    queryKey: ['user-accessible-work-orders', profile?.id, isAdmin, isEmployee, isPartner, isSubcontractor],
    queryFn: async () => {
      if (!profile?.id) {
        return [];
      }

      let query = supabase.from('work_orders').select('id');

      // Filter based on organization-based permissions
      if (isAdmin || isEmployee) {
        // Admin and employees can see all work orders
        // No additional filtering needed
      } else if (isPartner) {
        // Partners can only see work orders from their organization
        const { data: userOrgs } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', profile.id);
        
        const orgIds = userOrgs?.map(uo => uo.organization_id) || [];
        if (orgIds.length === 0) return [];
        
        query = query.in('organization_id', orgIds);
      } else if (isSubcontractor) {
        // Subcontractors can only see assigned work orders
        const { data: assignments } = await supabase
          .from('work_order_assignments')
          .select('work_order_id')
          .eq('assigned_to', profile.id);
        
        const workOrderIds = assignments?.map(a => a.work_order_id) || [];
        if (workOrderIds.length === 0) return [];
        
        query = query.in('id', workOrderIds);
      } else {
        // No specific role, return empty
        return [];
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data?.map(wo => wo.id) || [];
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}