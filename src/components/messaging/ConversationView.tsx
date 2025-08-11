import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMarkConversationRead } from '@/hooks/messaging/useMarkConversationRead';
import { Button } from '@/components/ui/button';

interface ConversationViewProps {
  conversationId: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const { mutate: markRead, isPending } = useMarkConversationRead();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unified_messages' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10_000,
  });

  const grouped = useMemo(() => messages, [messages]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="font-medium">Conversation</div>
        <Button size="sm" variant="secondary" onClick={() => markRead(conversationId)} disabled={isPending}>
          Mark as read
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-sm text-muted-foreground">No messages yet</div>
        ) : (
          grouped.map((m: any) => (
            <div key={m.id} className="text-sm">
              <div className="text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleString()}
              </div>
              <div>{m.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
