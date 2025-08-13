
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SendConversationMessageInput {
  conversationId: string;
  message: string;
}

export function useSendConversationMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationKey: ['send-conversation-message'],
    mutationFn: async ({ conversationId, message }: SendConversationMessageInput) => {
      const { data, error } = await supabase
        .from('work_order_messages' as any)
        .insert({ conversation_id: conversationId, message })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      console.log('[SendConversationMessage] Message sent successfully:', _data);
      // Real-time subscription will handle invalidation, so we don't need to do it here
      // This prevents double-invalidation and race conditions
    },
    onError: (error: any) => {
      console.error('[useSendConversationMessage] error:', error);
      toast({
        title: 'Failed to send message',
        description: error?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
