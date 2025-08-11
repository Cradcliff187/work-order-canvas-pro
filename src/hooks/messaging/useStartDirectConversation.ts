
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StartDirectConversationInput {
  otherUserId: string;
}

interface StartDirectConversationResult {
  conversation_id: string;
}

/**
 * Phase B5 – RPC wiring:
 * Starts a direct conversation using the create_direct_conversation RPC.
 */
export function useStartDirectConversation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['start-direct-conversation'],
    mutationFn: async ({ otherUserId }: StartDirectConversationInput): Promise<StartDirectConversationResult> => {
      const { data, error } = await supabase.rpc('create_direct_conversation', {
        p_other_user_id: otherUserId,
      });
      if (error) {
        console.error('[useStartDirectConversation] RPC error:', error);
        throw error;
      }
      // The RPC may return either a string (conversation_id) or an object
      if (typeof data === 'string') {
        return { conversation_id: data };
      }
      if (data && typeof data === 'object' && 'conversation_id' in data) {
        return data as StartDirectConversationResult;
      }
      // Fallback: ensure we always return a structured result
      return { conversation_id: String(data) };
    },
    onSuccess: () => {
      // Refresh overviews so the new conversation appears immediately
      queryClient.invalidateQueries({ queryKey: ['conversations-overview'] });
      queryClient.invalidateQueries({ queryKey: ['unified-inbox-overview'] });
      toast({
        title: 'Conversation started',
        description: 'You can now message this user directly.',
      });
    },
    onError: (error: any) => {
      console.error('[useStartDirectConversation] error:', error);
      toast({
        title: 'Could not start conversation',
        description: error?.message ?? 'Please try again or contact support.',
        variant: 'destructive',
      });
    },
  });
}
