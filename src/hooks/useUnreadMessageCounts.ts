import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export function useUnreadMessageCounts(workOrderIds: string[]) {
  const { profile } = useUserProfile();

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