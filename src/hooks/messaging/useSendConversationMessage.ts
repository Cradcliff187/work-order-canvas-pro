
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
      // Get current user profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('work_order_messages')
        .insert({ 
          conversation_id: conversationId, 
          message,
          sender_id: profile.id
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      console.log('[SendConversationMessage] Message sent successfully:', _data);
      // Trigger immediate refetch to ensure message appears without waiting for real-time
      queryClient.refetchQueries({ queryKey: ['conversation-messages', variables.conversationId] });
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
