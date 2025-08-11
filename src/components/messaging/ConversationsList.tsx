import React from 'react';
import { ConversationSummary } from '@/hooks/messaging/useConversationsOverview';
import { cn } from '@/lib/utils';

interface ConversationsListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No conversations yet</div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            'w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-start gap-3',
            selectedId === c.id && 'bg-muted'
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{c.title || 'Direct conversation'}</span>
              {c.unread_count > 0 && (
                <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {c.unread_count}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {c.last_message || 'No messages yet'}
            </div>
            {c.last_message_at && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(c.last_message_at).toLocaleString()}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};
