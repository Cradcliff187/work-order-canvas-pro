import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Removed employee-specific assigned work orders fetch to avoid extra queries
// The RPC get_unread_message_counts already respects RLS and user visibility.


export function useUnreadMessageCounts(
  workOrderIds: string[], 
  profile: any, 
  isEmployee: () => boolean, 
  isAdmin: () => boolean
) {
  const queryClient = useQueryClient();
  
  // Use provided work order IDs if supplied; otherwise we'll return counts for all accessible WOs
  const filteredWorkOrderIds = Array.isArray(workOrderIds) ? workOrderIds : [];

  // Set up real-time subscriptions for instant badge updates
  useEffect(() => {
    if (!profile?.id) return;

    const messagesChannel = supabase
      .channel('work-order-messages-subscription')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'work_order_messages'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['unread-message-counts'] });
      })
      .subscribe();

    const readReceiptsChannel = supabase
      .channel('message-read-receipts-subscription')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['unread-message-counts'] });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['unread-message-counts'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readReceiptsChannel);
    };
  }, [profile?.id, queryClient]);

  return useQuery({
    queryKey: ['unread-message-counts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return {};

      const { data, error } = await supabase.rpc('get_unread_message_counts');
      if (error) throw error;

      const unreadCounts: Record<string, number> = {};
      if (data && Array.isArray(data)) {
        data.forEach((row: { work_order_id: string; unread_count: number }) => {
          // If caller provided a list, filter to that list; otherwise include all
          if (!filteredWorkOrderIds.length || filteredWorkOrderIds.includes(row.work_order_id)) {
            unreadCounts[row.work_order_id] = Number(row.unread_count);
          }
        });
      }
      return unreadCounts;
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}