import React, { useEffect, useMemo, useState } from 'react';
import { MasterDetailLayout } from '@/components/work-orders/MasterDetailLayout';
import { useUnifiedInboxOverview } from '@/hooks/messaging/useUnifiedInboxOverview';
import { ConversationsList } from '@/components/messaging/ConversationsList';
import { ConversationView } from '@/components/messaging/ConversationView';
import { Button } from '@/components/ui/button';
import { NewDirectMessageDialog } from '@/components/messaging/NewDirectMessageDialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Link, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
const DirectMessagesPage: React.FC = () => {
  const { data: conversations = [], isLoading } = useUnifiedInboxOverview();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'direct' | 'work_order'>('all');
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = usePermissions();
  const dashboardPath = useMemo(() => {
    if (isAdmin) return '/admin/dashboard';
    if (isEmployee) return '/admin/employee-dashboard';
    if (isPartner) return '/partner/dashboard';
    if (isSubcontractor) return '/subcontractor/dashboard';
    return '/auth';
  }, [isAdmin, isEmployee, isPartner, isSubcontractor]);
  useEffect(() => {
    document.title = 'Messages | WorkOrderPro';
  }, []);

  const navigate = useNavigate();
  const handleSelect = (id: string | null) => {
    if (!id) {
      setSelectedId(null);
      return;
    }
    if (id.startsWith('wo:')) {
      const woId = id.slice(3);
      navigate(`/work-orders/${woId}`);
      return;
    }
    setSelectedId(id);
  };
  // Compute filtered view and counts
  const filteredConversations = useMemo(() => {
    if (filter === 'direct') return conversations.filter((c) => c.conversation_type === 'direct');
    if (filter === 'work_order') return conversations.filter((c) => c.conversation_type === 'work_order' || c.id.startsWith('wo:'));
    return conversations;
  }, [conversations, filter]);

  const counts = useMemo(() => {
    const direct = conversations.filter((c) => c.conversation_type === 'direct').length;
    const work_order = conversations.filter((c) => c.conversation_type === 'work_order' || c.id.startsWith('wo:')).length;
    return { all: conversations.length, direct, work_order } as const;
  }, [conversations]);

  // Stable items array for keyboard nav in MasterDetailLayout
  const items = useMemo(() => filteredConversations.map((c) => ({ id: c.id })), [filteredConversations]);

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
        <h1 className="text-2xl font-semibold">Messages</h1>
        <Button size="sm" onClick={() => setIsNewOpen(true)}>New message</Button>
      </div>

      <MasterDetailLayout
        listContent={
          <div className="flex flex-col">
            <div className="px-3 pb-2">
              <ToggleGroup
                type="single"
                value={filter}
                onValueChange={(v) => v && setFilter(v as 'all' | 'direct' | 'work_order')}
                aria-label="Filter conversations"
              >
                <ToggleGroupItem value="all" aria-label="All conversations">
                  All ({counts.all})
                </ToggleGroupItem>
                <ToggleGroupItem value="direct" aria-label="Direct messages">
                  Direct ({counts.direct})
                </ToggleGroupItem>
                <ToggleGroupItem value="work_order" aria-label="Work order threads">
                  Work Orders ({counts.work_order})
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <ConversationsList
              conversations={filteredConversations}
              selectedId={selectedId}
              onSelect={handleSelect}
              isLoading={isLoading}
              emptyLabel={filter === 'direct' ? 'No direct messages yet' : filter === 'work_order' ? 'No work order messages yet' : 'No conversations yet'}
            />
          </div>
        }
        selectedId={selectedId}
        onSelectionChange={handleSelect}
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
