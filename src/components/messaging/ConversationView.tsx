import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { useMarkConversationRead } from '@/hooks/messaging/useMarkConversationRead';
import { Button } from '@/components/ui/button';
import { useConversationSubscription } from '@/hooks/messaging/useConversationSubscription';
import { MessageComposer } from '@/components/messaging/MessageComposer';
import { useConversationMessages } from '@/hooks/messaging/useConversationMessages';
import { useToast } from '@/hooks/use-toast';
import { useConversationPresence } from '@/hooks/messaging/useConversationPresence';

interface ConversationViewProps {
  conversationId: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const { mutate: markRead, isPending } = useMarkConversationRead();
  const { toast } = useToast();

  const {
    messages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(conversationId, 50);

  useConversationSubscription(conversationId);
  const { isOtherOnline } = useConversationPresence(conversationId);

  const listRef = useRef<HTMLDivElement>(null);

  // Refs to preserve scroll position when loading older messages
  const loadingOlderRef = useRef(false);
  const prevScrollHeightRef = useRef<number | null>(null);
  const prevScrollTopRef = useRef<number | null>(null);

  // Pending optimistic messages
  const [pending, setPending] = useState<any[]>([]);

  // Maintain scroll position when loading older messages; otherwise auto-scroll to bottom
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    if (loadingOlderRef.current && prevScrollHeightRef.current !== null && prevScrollTopRef.current !== null) {
      const heightDelta = el.scrollHeight - prevScrollHeightRef.current;
      el.scrollTop = prevScrollTopRef.current + heightDelta;
      // Reset flags after adjusting
      loadingOlderRef.current = false;
      prevScrollHeightRef.current = null;
      prevScrollTopRef.current = null;
      return;
    }

    // For new incoming messages (not older fetch), scroll to bottom
    el.scrollTop = el.scrollHeight;
  }, [messages, pending.length]);

  // Safety: if fetch finishes without changing messages, clear the loading flag
  useEffect(() => {
    if (!isFetchingNextPage && loadingOlderRef.current) {
      loadingOlderRef.current = false;
      prevScrollHeightRef.current = null;
      prevScrollTopRef.current = null;
    }
  }, [isFetchingNextPage]);

  useEffect(() => {
    if (messages?.length) {
      markRead(conversationId);
    }
  }, [conversationId, messages?.length, markRead]);

  const grouped = useMemo(() => messages, [messages]);

  const handleLoadOlder = useCallback(() => {
    const el = listRef.current;
    if (el) {
      loadingOlderRef.current = true;
      prevScrollHeightRef.current = el.scrollHeight;
      prevScrollTopRef.current = el.scrollTop;
    }
    fetchNextPage();
  }, [fetchNextPage]);

  const handleMarkReadClick = useCallback(() => {
    markRead(conversationId, {
      meta: { onError: undefined, onSettled: undefined },
      onSuccess: () => {
        toast({ title: 'Conversation marked as read' });
      },
    } as any);
  }, [markRead, conversationId, toast]);

  // Optimistic helpers
  const addPending = useCallback((text: string) => {
    const temp = {
      id: `temp-${Date.now()}`,
      message: text,
      created_at: new Date().toISOString(),
      // Optional: sender marker; purely for UI
      __optimistic: true,
    };
    setPending((prev) => [...prev, temp]);
    return temp.id as string;
  }, []);

  const removePending = useCallback((tempId?: string) => {
    if (!tempId) return;
    setPending((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-center p-2">
        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadOlder}
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
        ) : grouped.length === 0 && pending.length === 0 ? (
          <div className="text-sm text-muted-foreground">No messages yet</div>
        ) : (
          <>
            {grouped.map((m: any) => (
              <div key={m.id} className="text-sm">
                <div className="text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()}
                </div>
                <div>{m.message}</div>
              </div>
            ))}
            {pending.map((m) => (
              <div key={m.id} className="text-sm opacity-60">
                <div className="text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()} • Sending…
                </div>
                <div>{m.message}</div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="border-t p-3">
        <MessageComposer
          conversationId={conversationId}
          onOptimisticAdd={addPending}
          onClearPending={removePending}
        />
      </div>
    </div>
  );
};