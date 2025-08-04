import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export const useOrganizationWorkOrders = () => {
  const { user, userOrganizations } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();

  return useQuery({
    queryKey: ['organization-work-orders', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user found');

      let query = supabase.from('work_orders').select(`
        *,
        organization:organizations(*),
        assigned_organization:organizations!work_orders_assigned_organization_id_fkey(*),
        trade:trades(*),
        creator:profiles!work_orders_created_by_fkey(*)
      `);

      // Organization-based filtering
      if (isAdmin() || isEmployee()) {
        // Internal users see all work orders
        query = query.order('created_at', { ascending: false });
      } else if (isPartner()) {
        // Partners see only their organization's work orders
        const orgIds = userOrganizations?.map(org => org.organization_id) || [];
        
        if (orgIds.length > 0) {
          query = query.in('organization_id', orgIds);
        } else {
          // No organizations, return empty
          return [];
        }
      } else if (isSubcontractor()) {
        // Subcontractors see only assigned work orders
        const orgIds = userOrganizations?.map(org => org.organization_id) || [];
        
        if (orgIds.length > 0) {
          query = query.in('assigned_organization_id', orgIds);
        } else {
          // No organizations, return empty
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};