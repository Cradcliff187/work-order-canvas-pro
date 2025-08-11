
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
          // Invalidate paginated messages and overview
          queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations-overview'] });
          queryClient.invalidateQueries({ queryKey: ['unified-inbox-overview'] });

          // Simple toast for parity with work orders (may also fire on own messages)
          const preview = payload?.new?.message ? String(payload.new.message).slice(0, 100) : 'New message';
          toast({
            title: 'New message',
            description: preview,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, toast]);
}
