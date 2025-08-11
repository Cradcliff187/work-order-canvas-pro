import React, { useEffect, useMemo, useState } from 'react';
import { MasterDetailLayout } from '@/components/work-orders/MasterDetailLayout';
import { useConversationsOverview } from '@/hooks/messaging/useConversationsOverview';
import { ConversationsList } from '@/components/messaging/ConversationsList';
import { ConversationView } from '@/components/messaging/ConversationView';

const DirectMessagesPage: React.FC = () => {
  const { data: conversations = [], isLoading } = useConversationsOverview();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Direct Messages | WorkOrderPro';
  }, []);

  // Stable items array for keyboard nav in MasterDetailLayout
  const items = useMemo(() => conversations.map((c) => ({ id: c.id })), [conversations]);

  return (
    <main className="container mx-auto py-6">
      <h1 className="text-2xl font-semibold mb-4">Direct Messages</h1>

      <MasterDetailLayout
        listContent={
          <ConversationsList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isLoading={isLoading}
          />
        }
        selectedId={selectedId}
        onSelectionChange={setSelectedId}
        detailContent={
          selectedId ? (
            <ConversationView conversationId={selectedId} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a conversation to view messages
            </div>
          )
        }
        isLoading={isLoading}
        items={items}
      />
    </main>
  );
};

export default DirectMessagesPage;
