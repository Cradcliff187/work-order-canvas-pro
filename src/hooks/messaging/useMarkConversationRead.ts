
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Phase B5 – RPC wiring:
 * Marks a conversation as read using the mark_conversation_read RPC.
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['mark-conversation-read'],
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
      });
      if (error) {
        console.error('[useMarkConversationRead] RPC error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: (_data, conversationId) => {
      // Refresh overview and any per-conversation queries the app might use
      queryClient.invalidateQueries({ queryKey: ['conversations-overview'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      // Ensure unified inbox overview reflects unread changes immediately
      queryClient.invalidateQueries({ queryKey: ['unified-inbox-overview'] });
    },
  });
}
