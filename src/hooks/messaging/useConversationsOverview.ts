
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ConversationType = 'direct' | 'organization' | 'announcement';

export interface ConversationSummary {
  id: string;
  title: string | null;
  conversation_type: ConversationType;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  updated_at: string | null;
  // Optional extras the RPC may include
  other_user_id?: string | null;
  organization_id?: string | null;
}

/**
 * Phase B5 – RPC wiring:
 * Retrieves conversations overview using the get_conversations_overview RPC.
 */
export function useConversationsOverview() {
  return useQuery({
    queryKey: ['conversations-overview'],
    queryFn: async (): Promise<ConversationSummary[]> => {
      const { data, error } = await supabase.rpc('get_conversations_overview', {});
      if (error) {
        console.error('[useConversationsOverview] RPC error:', error);
        throw error;
      }
      return (data || []) as ConversationSummary[];
    },
    staleTime: 15_000,
  });
}
