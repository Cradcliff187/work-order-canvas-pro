import React, { useEffect, useMemo, useState } from 'react';
import { useUnifiedInboxOverview } from '@/hooks/messaging/useUnifiedInboxOverview';
import { Button } from '@/components/ui/button';
import { NewDirectMessageDialog } from '@/components/messaging/NewDirectMessageDialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Link, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ResponsiveMessagingLayout } from '@/components/messaging/ResponsiveMessagingLayout';
import { Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
const DirectMessagesPage: React.FC = () => {
  const { data: conversations = [], isLoading } = useUnifiedInboxOverview();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'direct' | 'work_order'>('all');
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = usePermissions();
  const { isAdmin: isAdminFn, isEmployee: isEmployeeFn, isPartner: isPartnerFn, isSubcontractor: isSubcontractorFn } = useUserProfile();
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
      let base = '';
      if (isAdminFn() || isEmployeeFn()) {
        base = '/admin';
      } else if (isPartnerFn()) {
        base = '/partner';
      } else if (isSubcontractorFn()) {
        base = '/subcontractor';
      }
      navigate(`${base}/work-orders/${woId}`);
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

  const isMobile = useIsMobile();

  // Filter component for reuse
  const filterComponent = (
    <ToggleGroup
      type="single"
      value={filter}
      onValueChange={(v) => v && setFilter(v as 'all' | 'direct' | 'work_order')}
      aria-label="Filter conversations"
      className="w-full"
    >
      <ToggleGroupItem value="all" aria-label="All conversations" className="flex-1">
        All ({counts.all})
      </ToggleGroupItem>
      <ToggleGroupItem value="direct" aria-label="Direct messages" className="flex-1">
        Direct ({counts.direct})
      </ToggleGroupItem>
      <ToggleGroupItem value="work_order" aria-label="Work order threads" className="flex-1">
        Work Orders ({counts.work_order})
      </ToggleGroupItem>
    </ToggleGroup>
  );

  return (
    <main className={isMobile ? "h-screen flex flex-col" : "container mx-auto py-6"}>
      {!isMobile && (
        <>
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
            <Button size="sm" onClick={() => setIsNewOpen(true)}>
              New message
            </Button>
          </div>
        </>
      )}

      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <h1 className="text-xl font-semibold">Messages</h1>
          <Button 
            size="sm" 
            onClick={() => setIsNewOpen(true)}
            className="h-9 w-9 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className={isMobile ? "flex-1 overflow-hidden" : "h-[calc(100vh-200px)]"}>
        <ResponsiveMessagingLayout
          conversations={filteredConversations}
          selectedId={selectedId}
          onSelectionChange={handleSelect}
          isLoading={isLoading}
          emptyLabel={filter === 'direct' ? 'No direct messages yet' : filter === 'work_order' ? 'No work order messages yet' : 'No conversations yet'}
          filterComponent={filterComponent}
        />
      </div>

      <NewDirectMessageDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        onCreated={(id) => setSelectedId(id)}
      />
    </main>
  );
};

export default DirectMessagesPage;
