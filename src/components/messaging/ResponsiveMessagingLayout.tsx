import React, { useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MasterDetailLayout } from '@/components/work-orders/MasterDetailLayout';
import { MobileConversationsList } from './MobileConversationsList';
import { MobileConversationView } from './MobileConversationView';
import { ConversationsList } from './ConversationsList';
import { ConversationView } from './ConversationView';
import { ConversationSummary } from '@/hooks/messaging/useConversationsOverview';
import { Button } from '@/components/ui/button';
import { useMarkConversationRead } from '@/hooks/messaging/useMarkConversationRead';
import { useConversationPresence } from '@/hooks/messaging/useConversationPresence';
import { useToast } from '@/hooks/use-toast';

interface ResponsiveMessagingLayoutProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelectionChange: (id: string | null) => void;
  isLoading?: boolean;
  emptyLabel?: string;
  filterComponent?: React.ReactNode;
}

export const ResponsiveMessagingLayout: React.FC<ResponsiveMessagingLayoutProps> = ({
  conversations,
  selectedId,
  onSelectionChange,
  isLoading,
  emptyLabel,
  filterComponent,
}) => {
  const isMobile = useIsMobile();
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const { mutate: markRead, isPending } = useMarkConversationRead();
  const { isOtherOnline } = useConversationPresence(selectedId);
  const { toast } = useToast();

  // Mobile: Handle conversation selection
  const handleMobileSelect = (id: string) => {
    onSelectionChange(id);
    setShowMobileConversation(true);
  };

  // Mobile: Handle back from conversation
  const handleMobileBack = () => {
    setShowMobileConversation(false);
    onSelectionChange(null);
  };

  const handleMarkReadClick = useCallback(() => {
    if (!selectedId) return;
    markRead(selectedId, {
      meta: { onError: undefined, onSettled: undefined },
      onSuccess: () => {
        toast({ title: 'Conversation marked as read' });
      },
    } as any);
  }, [markRead, selectedId, toast]);

  // Get conversation title for mobile header
  const selectedConversation = conversations.find(c => c.id === selectedId);
  const conversationTitle = selectedConversation?.title || 'Conversation';

  const headerActions = selectedId ? (
    <>
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${isOtherOnline ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
          aria-label={isOtherOnline ? 'Other participant online' : 'Other participant offline'}
          title={isOtherOnline ? 'Online' : 'Offline'}
        />
        <span className="text-sm text-muted-foreground">
          {isOtherOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      <Button size="sm" variant="secondary" onClick={handleMarkReadClick} disabled={isPending}>
        Mark as read
      </Button>
    </>
  ) : null;

  if (isMobile) {
    // Mobile: Stack-based navigation
    if (showMobileConversation && selectedId) {
      return (
        <div className="h-full">
          <MobileConversationView
            conversationId={selectedId}
            onBack={handleMobileBack}
            title={conversationTitle}
          />
        </div>
      );
    }

    // Mobile: Conversation list
    return (
      <div className="h-full flex flex-col">
        {filterComponent && (
          <div className="border-b p-3">
            {filterComponent}
          </div>
        )}
        <div className="flex-1 overflow-auto">
          <MobileConversationsList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleMobileSelect}
            isLoading={isLoading}
            emptyLabel={emptyLabel}
          />
        </div>
      </div>
    );
  }

  // Desktop: Side-by-side layout with resizable panels
  const items = conversations.map((c) => ({ id: c.id }));

  return (
    <MasterDetailLayout
      listContent={
        <div className="flex flex-col h-full">
          {filterComponent && (
            <div className="border-b p-3">
              {filterComponent}
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <ConversationsList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={onSelectionChange}
              isLoading={isLoading}
              emptyLabel={emptyLabel}
            />
          </div>
        </div>
      }
      selectedId={selectedId}
      onSelectionChange={onSelectionChange}
      detailContent={
        selectedId ? (
          <ConversationView conversationId={selectedId} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground p-6 text-center">
            <div>
              <p className="mb-2">Select a conversation to view messages</p>
              <p className="text-sm opacity-70">Choose from the list to start chatting</p>
            </div>
          </div>
        )
      }
      isLoading={isLoading}
      items={items}
      showDetailHeader={true}
      detailTitle={selectedConversation?.title || "Conversation"}
      headerActions={headerActions}
      className="h-full"
    />
  );
};