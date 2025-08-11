
import React, { useEffect, useMemo, useRef } from 'react';
import { useMarkConversationRead } from '@/hooks/messaging/useMarkConversationRead';
import { Button } from '@/components/ui/button';
import { useConversationSubscription } from '@/hooks/messaging/useConversationSubscription';
import { MessageComposer } from '@/components/messaging/MessageComposer';
import { useConversationMessages } from '@/hooks/messaging/useConversationMessages';

interface ConversationViewProps {
  conversationId: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const { mutate: markRead, isPending } = useMarkConversationRead();

  const {
    messages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(conversationId, 50);

  useConversationSubscription(conversationId);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      // Always scroll to bottom when new messages arrive (not when loading older)
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages?.length) {
      markRead(conversationId);
    }
  }, [conversationId, messages?.length, markRead]);

  const grouped = useMemo(() => messages, [messages]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="font-medium">Conversation</div>
        <Button size="sm" variant="secondary" onClick={() => markRead(conversationId)} disabled={isPending}>
          Mark as read
        </Button>
      </div>

      <div className="flex items-center justify-center p-2">
        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load older messages'}
          </Button>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
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
      <div className="border-t p-3">
        <MessageComposer conversationId={conversationId} />
      </div>
    </div>
  );
};
