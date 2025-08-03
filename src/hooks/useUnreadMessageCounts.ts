import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

// Hook to get assigned work order IDs for employees
function useEmployeeAssignedWorkOrders(profileId: string | undefined, isEmployee: boolean) {
  return useQuery({
    queryKey: ['employee-assigned-work-orders', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('work_order_assignments')
        .select('work_order_id')
        .eq('assigned_to', profileId);
      
      if (error) throw error;
      return data.map(assignment => assignment.work_order_id);
    },
    enabled: !!profileId && isEmployee,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUnreadMessageCounts(workOrderIds: string[]) {
  const { profile, isEmployee, isAdmin } = useUserProfile();
  const queryClient = useQueryClient();
  
  // For employees (not admins), get their assigned work orders
  const isEmployeeNotAdmin = isEmployee() && !isAdmin();
  const { data: assignedWorkOrderIds = [] } = useEmployeeAssignedWorkOrders(
    profile?.id, 
    isEmployeeNotAdmin
  );
  
  // Filter work order IDs based on user role
  const filteredWorkOrderIds = isEmployeeNotAdmin 
    ? workOrderIds.filter(id => assignedWorkOrderIds.includes(id))
    : workOrderIds;

  // Set up real-time subscriptions for instant badge updates
  useEffect(() => {
    if (!filteredWorkOrderIds.length || !profile?.id) {
      return;
    }

    // Subscribe to new messages across filtered work orders
    const messagesChannel = supabase
      .channel('work-order-messages-subscription')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'work_order_messages'
      }, (payload) => {
        // Only invalidate if the new message is for a tracked work order
        if (filteredWorkOrderIds.includes(payload.new.work_order_id)) {
          queryClient.invalidateQueries({ 
            queryKey: ['unread-message-counts'] 
          });
        }
      })
      .subscribe();

    // Subscribe to read receipt changes for current user
    const readReceiptsChannel = supabase
      .channel('message-read-receipts-subscription')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        queryClient.invalidateQueries({ 
          queryKey: ['unread-message-counts'] 
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        queryClient.invalidateQueries({ 
          queryKey: ['unread-message-counts'] 
        });
      })
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readReceiptsChannel);
    };
  }, [filteredWorkOrderIds, profile?.id, queryClient]);

  return useQuery({
    queryKey: ['unread-message-counts', filteredWorkOrderIds, profile?.id],
    queryFn: async () => {
      if (!filteredWorkOrderIds.length || !profile?.id) {
        return {};
      }

      // Use the database function (no parameters needed - uses auth context)
      const { data, error } = await supabase.rpc('get_unread_message_counts');

      if (error) throw error;

      // Transform result to Record<string, number> format for backward compatibility
      const unreadCounts: Record<string, number> = {};
      
      if (data && Array.isArray(data)) {
        data.forEach((row: { work_order_id: string; unread_count: number }) => {
          // Only include counts for filtered work orders we're tracking
          if (filteredWorkOrderIds.includes(row.work_order_id)) {
            unreadCounts[row.work_order_id] = Number(row.unread_count);
          }
        });
      }

      return unreadCounts;
    },
    enabled: !!filteredWorkOrderIds.length && !!profile?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}