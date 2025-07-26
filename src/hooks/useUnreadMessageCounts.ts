import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export function useUnreadMessageCounts(workOrderIds: string[]) {
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['unread-message-counts', workOrderIds, profile?.id],
    queryFn: async () => {
      if (!workOrderIds.length || !profile?.id) {
        return {};
      }

      // Build base query for messages without read receipts
      let query = supabase
        .from('work_order_messages')
        .select(`
          work_order_id,
          id
        `)
        .in('work_order_id', workOrderIds);

      // Apply role-based filtering for is_internal messages
      if (profile.user_type === 'partner') {
        // Partners only see public messages
        query = query.eq('is_internal', false);
      } else if (profile.user_type === 'subcontractor') {
        // Subcontractors only see internal messages
        query = query.eq('is_internal', true);
      }
      // Admin/Employee see all messages (no filter needed)

      const { data: messages, error: messagesError } = await query;

      if (messagesError) throw messagesError;
      if (!messages?.length) return {};

      // Get read receipts for current user for these messages
      const messageIds = messages.map(m => m.id);
      const { data: readReceipts, error: receiptsError } = await supabase
        .from('message_read_receipts')
        .select('message_id')
        .eq('user_id', profile.id)
        .in('message_id', messageIds);

      if (receiptsError) throw receiptsError;

      // Create set of read message IDs for fast lookup
      const readMessageIds = new Set(readReceipts?.map(r => r.message_id) || []);

      // Count unread messages per work order
      const unreadCounts: Record<string, number> = {};
      
      for (const message of messages) {
        if (!readMessageIds.has(message.id)) {
          const workOrderId = message.work_order_id;
          unreadCounts[workOrderId] = (unreadCounts[workOrderId] || 0) + 1;
        }
      }

      return unreadCounts;
    },
    enabled: !!workOrderIds.length && !!profile?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}