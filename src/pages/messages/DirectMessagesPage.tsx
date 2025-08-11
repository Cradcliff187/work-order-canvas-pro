import React, { useEffect, useMemo, useState } from 'react';
import { MasterDetailLayout } from '@/components/work-orders/MasterDetailLayout';
import { useConversationsOverview } from '@/hooks/messaging/useConversationsOverview';
import { ConversationsList } from '@/components/messaging/ConversationsList';
import { ConversationView } from '@/components/messaging/ConversationView';
import { Button } from '@/components/ui/button';
import { NewDirectMessageDialog } from '@/components/messaging/NewDirectMessageDialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Link } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
const DirectMessagesPage: React.FC = () => {
  const { data: conversations = [], isLoading } = useConversationsOverview();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = usePermissions();
  const dashboardPath = useMemo(() => {
    if (isAdmin) return '/admin/dashboard';
    if (isEmployee) return '/admin/employee-dashboard';
    if (isPartner) return '/partner/dashboard';
    if (isSubcontractor) return '/subcontractor/dashboard';
    return '/auth';
  }, [isAdmin, isEmployee, isPartner, isSubcontractor]);
  useEffect(() => {
    document.title = 'Direct Messages | WorkOrderPro';
  }, []);

  // Stable items array for keyboard nav in MasterDetailLayout
  const items = useMemo(() => conversations.map((c) => ({ id: c.id })), [conversations]);

  return (
    <main className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={dashboardPath}>Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Messages</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Direct Messages</h1>
        <Button size="sm" onClick={() => setIsNewOpen(true)}>New message</Button>
      </div>

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
        showDetailHeader={false}
      />

      <NewDirectMessageDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        onCreated={(id) => setSelectedId(id)}
      />
    </main>
  );
};

export default DirectMessagesPage;
