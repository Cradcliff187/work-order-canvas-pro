import React from 'react';
import { ConversationSummary } from '@/hooks/messaging/useConversationsOverview';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users } from 'lucide-react';

interface MobileConversationsListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
}

export const MobileConversationsList: React.FC<MobileConversationsListProps> = ({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  emptyLabel,
}) => {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{emptyLabel ?? 'No conversations yet'}</p>
        <p className="text-sm text-muted-foreground mt-1">Start a new conversation to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conversation) => {
        const isWorkOrder = conversation.conversation_type === 'work_order' || conversation.id.startsWith('wo:');
        const isDirect = conversation.conversation_type === 'direct';
        
        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
              'w-full text-left p-4 hover:bg-muted/50 active:bg-muted transition-colors flex items-start gap-3',
              selectedId === conversation.id && 'bg-muted'
            )}
          >
            {/* Avatar/Icon */}
            <div className={cn(
              "flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center",
              isWorkOrder ? "bg-primary/10" : "bg-muted"
            )}>
              {isWorkOrder ? (
                <Users className="h-5 w-5 text-primary" />
              ) : (
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {conversation.title || 'Direct conversation'}
                  </h3>
                  <Badge 
                    variant={isWorkOrder ? "default" : "secondary"} 
                    className="text-xs shrink-0"
                  >
                    {isWorkOrder ? 'WO' : 'DM'}
                  </Badge>
                </div>
                
                {/* Unread count */}
                {conversation.unread_count > 0 && (
                  <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-medium">
                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                  </div>
                )}
              </div>

              {/* Last message preview */}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                {conversation.last_message || 'No messages yet'}
              </p>

              {/* Timestamp */}
              {conversation.last_message_at && (
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(conversation.last_message_at)}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Helper function to format relative time for mobile
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString();
}