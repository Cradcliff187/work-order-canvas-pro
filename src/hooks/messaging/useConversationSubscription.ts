
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useConversationSubscription(conversationId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_order_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          console.log('[ConversationSubscription] New message received:', payload);
          
          // Use refetch for immediate updates instead of invalidateQueries
          const conversationQuery = queryClient.getQueryState(['conversation-messages', conversationId]);
          if (conversationQuery) {
            queryClient.refetchQueries({ queryKey: ['conversation-messages', conversationId] });
          }
          queryClient.invalidateQueries({ queryKey: ['conversations-overview'] });
          queryClient.invalidateQueries({ queryKey: ['unified-inbox-overview'] });

          const preview = payload?.new?.message ? String(payload.new.message).slice(0, 100) : 'New message';
          toast({ title: 'New message', description: preview });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_order_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          console.log('[ConversationSubscription] Message updated:', payload);
          
          // Handle edits or server-side enrichments with refetch
          const conversationQuery = queryClient.getQueryState(['conversation-messages', conversationId]);
          if (conversationQuery) {
            queryClient.refetchQueries({ queryKey: ['conversation-messages', conversationId] });
          }
          queryClient.invalidateQueries({ queryKey: ['conversations-overview'] });
          queryClient.invalidateQueries({ queryKey: ['unified-inbox-overview'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_read_receipts',
        },
        () => {
          // Unread counts can change
          queryClient.invalidateQueries({ queryKey: ['conversations-overview'] });
          queryClient.invalidateQueries({ queryKey: ['unified-inbox-overview'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, toast]);
}
