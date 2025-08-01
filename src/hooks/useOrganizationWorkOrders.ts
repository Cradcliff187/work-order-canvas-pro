import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedPermissions } from '@/hooks/useEnhancedPermissions';

export const useOrganizationWorkOrders = () => {
  const permissions = useEnhancedPermissions();

  return useQuery({
    queryKey: ['organization-work-orders', permissions.user?.id],
    queryFn: async () => {
      if (!permissions.user) throw new Error('No user found');

      let query = supabase.from('work_orders').select(`
        *,
        organization:organizations(*),
        assigned_organization:organizations!work_orders_assigned_organization_id_fkey(*),
        trade:trades(*),
        creator:profiles!work_orders_created_by_fkey(*)
      `);

      // Organization-based filtering
      if (permissions.hasInternalAccess) {
        // Internal users see all work orders
        query = query.order('created_at', { ascending: false });
      } else if (permissions.isPartner) {
        // Partners see only their organization's work orders
        const userOrganizations = permissions.user.organization_members?.map(
          (membership: any) => membership.organization_id
        ) || [];
        
        if (userOrganizations.length > 0) {
          query = query.in('organization_id', userOrganizations);
        } else {
          // No organizations, return empty
          return [];
        }
      } else if (permissions.isSubcontractor) {
        // Subcontractors see only assigned work orders
        const userOrganizations = permissions.user.organization_members?.map(
          (membership: any) => membership.organization_id
        ) || [];
        
        if (userOrganizations.length > 0) {
          query = query.in('assigned_organization_id', userOrganizations);
        } else {
          // No organizations, return empty
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!permissions.user,
  });
};