import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export const useOrganizationWorkOrders = () => {
  const { user, userOrganizations } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();
  const queryClient = useQueryClient();

  const query = useQuery({
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

  // Real-time subscription for organization work orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('organization-work-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_orders',
        },
        (payload) => {
          console.log('Organization work order updated via realtime:', payload);
          
          // Debounced refetch to prevent excessive API calls
          const timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: ['organization-work-orders'],
            });
          }, 500);

          return () => clearTimeout(timeoutId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_orders',
        },
        (payload) => {
          console.log('New organization work order created via realtime:', payload);
          
          const timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: ['organization-work-orders'],
            });
          }, 500);

          return () => clearTimeout(timeoutId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
};