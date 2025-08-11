
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
        .from('unified_messages' as any)
        .insert({ conversation_id: conversationId, message })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      // Refresh the conversation thread and overview counters
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations-overview'] });
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
