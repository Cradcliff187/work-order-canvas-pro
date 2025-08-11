import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationMessage {
  id: string;
  message: string | null;
  sender_id: string | null;
  created_at: string;
  attachment_ids?: string[] | null;
}

interface MessagesPage extends Array<ConversationMessage> {}

export function useConversationMessages(conversationId: string | null, pageSize = 50) {
  const queryKey = ['conversation-messages', conversationId];

  const infiniteQuery = useInfiniteQuery<MessagesPage>({
    queryKey,
    enabled: Boolean(conversationId),
    initialPageParam: new Date().toISOString(),
    queryFn: async ({ pageParam }) => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .rpc<any, any>('get_conversation_messages' as any, {
          p_conversation_id: conversationId,
          p_limit: pageSize,
          p_before: pageParam as string,
        });
      if (error) {
        console.error('[useConversationMessages] RPC error:', error);
        throw error;
      }
      // RPC returns DESC by created_at; keep as-is for pagination math
      return ((data as any[]) || []).map((row: any) => ({
        id: row.id,
        message: row.message ?? null,
        sender_id: row.sender_id ?? null,
        created_at: row.created_at,
        attachment_ids: row.attachment_ids ?? null,
      }));
    },
    getNextPageParam: (lastPage) => {
      // If fewer than pageSize, no more pages
      if (!lastPage || lastPage.length < pageSize) return undefined;
      // lastPage is DESC, so the oldest is the last item
      const oldest = lastPage[lastPage.length - 1];
      return oldest?.created_at || undefined;
    },
    staleTime: 10_000,
  });

  const messagesAscending: ConversationMessage[] = (infiniteQuery.data?.pages || [])
    .flat()
    // pages are DESC; reversing whole list results in ascending
    .slice()
    .reverse();

  return {
    messages: messagesAscending,
    queryKey,
    ...infiniteQuery,
  };
}
