import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export function useUnreadMessageCounts(workOrderIds: string[]) {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();

  // Set up real-time subscriptions for instant badge updates
  useEffect(() => {
    if (!workOrderIds.length || !profile?.id) {
      return;
    }

    // Subscribe to new messages across all work orders
    const messagesChannel = supabase
      .channel('work-order-messages-subscription')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'work_order_messages'
      }, (payload) => {
        // Only invalidate if the new message is for a tracked work order
        if (workOrderIds.includes(payload.new.work_order_id)) {
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
  }, [workOrderIds, profile?.id, queryClient]);

  return useQuery({
    queryKey: ['unread-message-counts', workOrderIds, profile?.id],
    queryFn: async () => {
      if (!workOrderIds.length || !profile?.id || !profile?.user_type) {
        return {};
      }

      // Use optimized SQL function for single-query performance
      const { data, error } = await supabase.rpc('get_unread_message_counts', {
        p_work_order_ids: workOrderIds,
        p_user_id: profile.id,
        p_user_type: profile.user_type
      });

      if (error) throw error;

      // Transform result to Record<string, number> format for backward compatibility
      const unreadCounts: Record<string, number> = {};
      
      data?.forEach((row: { work_order_id: string; unread_count: number }) => {
        unreadCounts[row.work_order_id] = Number(row.unread_count);
      });

      return unreadCounts;
    },
    enabled: !!workOrderIds.length && !!profile?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}