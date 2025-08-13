import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { useMarkConversationRead } from '@/hooks/messaging/useMarkConversationRead';
import { Button } from '@/components/ui/button';
import { useConversationSubscription } from '@/hooks/messaging/useConversationSubscription';
import { MessageComposer } from '@/components/messaging/MessageComposer';
import { useConversationMessages } from '@/hooks/messaging/useConversationMessages';
import { useToast } from '@/hooks/use-toast';
import { useConversationPresence } from '@/hooks/messaging/useConversationPresence';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileConversationViewProps {
  conversationId: string;
  onBack: () => void;
  title?: string;
}

export const MobileConversationView: React.FC<MobileConversationViewProps> = ({ 
  conversationId, 
  onBack,
  title = 'Conversation'
}) => {
  const { mutate: markRead } = useMarkConversationRead();
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
  const [pending, setPending] = useState<any[]>([]);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending.length]);

  useEffect(() => {
    if (messages?.length) {
      markRead(conversationId);
    }
  }, [conversationId, messages?.length, markRead]);

  const handleLoadOlder = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  // Optimistic message helpers
  const addPending = useCallback((text: string) => {
    const temp = {
      id: `temp-${Date.now()}`,
      message: text,
      created_at: new Date().toISOString(),
      sender_id: 'current-user', // Will be replaced with actual logic
      __optimistic: true,
    };
    setPending((prev) => [...prev, temp]);
    return temp.id as string;
  }, []);

  const removePending = useCallback((tempId?: string) => {
    if (!tempId) return;
    setPending((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  // Combined messages for rendering
  const allMessages = useMemo(() => {
    return [...messages, ...pending];
  }, [messages, pending]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="h-9 w-9 p-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base truncate">{title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isOtherOnline ? "bg-green-500" : "bg-muted-foreground/40"
              )}
            />
            <span>{isOtherOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Load Older Messages */}
      {hasNextPage && (
        <div className="flex justify-center p-3 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadOlder}
            disabled={isFetchingNextPage}
            className="text-xs"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load older messages'}
          </Button>
        </div>
      )}

      {/* Messages Area */}
      <div ref={listRef} className="flex-1 overflow-auto px-4 py-3">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                <div className={cn(
                  "p-3 rounded-2xl max-w-[85%]",
                  i % 2 === 0 ? "bg-muted ml-auto" : "bg-primary/10"
                )}>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {allMessages.map((message, index) => {
              const isCurrentUser = message.sender_id === 'current-user' || message.__optimistic;
              const showTimestamp = index === 0 || 
                new Date(message.created_at).getTime() - new Date(allMessages[index - 1]?.created_at).getTime() > 300000; // 5 minutes
              
              return (
                <div key={message.id}>
                  {showTimestamp && (
                    <div className="text-center mb-2">
                      <span className="text-xs text-muted-foreground bg-background px-2">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  <div className={cn(
                    "flex",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "max-w-[85%] p-3 rounded-2xl break-words",
                      isCurrentUser 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-muted rounded-bl-md",
                      message.__optimistic && "opacity-60"
                    )}>
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      {message.__optimistic && (
                        <div className="text-xs mt-1 opacity-70">Sending...</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Composer - Sticky at bottom */}
      <div className="border-t bg-card p-4 sticky bottom-0">
        <MessageComposer
          conversationId={conversationId}
          onOptimisticAdd={addPending}
          onClearPending={removePending}
        />
      </div>
    </div>
  );
};