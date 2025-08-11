import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ConversationSummary } from '@/hooks/messaging/useConversationsOverview';

interface WorkOrderThreadRow {
  work_order_id: string;
  title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  updated_at: string | null;
  organization_id: string | null;
}

export function useUnifiedInboxOverview() {
  return useQuery({
    queryKey: ['unified-inbox-overview'],
    queryFn: async (): Promise<ConversationSummary[]> => {
      // Run both RPCs in parallel
      const [convRes, woRes] = await Promise.all([
        supabase.rpc('get_conversations_overview', {}),
        supabase.rpc('get_work_order_threads_overview', {}),
      ]);

      if (convRes.error) {
        console.error('[useUnifiedInboxOverview] conversations RPC error:', convRes.error);
        throw convRes.error;
      }
      if (woRes.error) {
        console.error('[useUnifiedInboxOverview] work order threads RPC error:', woRes.error);
        throw woRes.error;
      }

      const convRows = (convRes.data || []) as any[];
      const convoSummaries: ConversationSummary[] = convRows.map((row) => ({
        id: row.conversation_id ?? row.id,
        title: row.title ?? null,
        conversation_type: row.conversation_type,
        last_message: row.last_message ?? null,
        last_message_at: row.last_message_at ?? null,
        unread_count: row.unread_count ?? 0,
        updated_at: row.updated_at ?? row.last_message_at ?? null,
        other_user_id: row.other_user_id ?? null,
        organization_id: row.organization_id ?? null,
      }));

      const woRows = (woRes.data || []) as WorkOrderThreadRow[];
      const woSummaries: ConversationSummary[] = woRows.map((row) => ({
        // Prefix to distinguish in UI selection handling
        id: `wo:${row.work_order_id}`,
        title: row.title ?? 'Work Order',
        conversation_type: 'work_order' as any,
        last_message: row.last_message ?? null,
        last_message_at: row.last_message_at ?? row.updated_at ?? null,
        unread_count: row.unread_count ?? 0,
        updated_at: row.updated_at ?? row.last_message_at ?? null,
        organization_id: row.organization_id ?? null,
      }));

      const combined = [...convoSummaries, ...woSummaries];
      combined.sort((a, b) => {
        const ad = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bd = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bd - ad;
      });

      return combined;
    },
    staleTime: 15_000,
  });
}
