import React, { ReactNode, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInvoiceDrafts } from "@/hooks/useInvoiceDrafts";
import { SubcontractorSidebar } from "@/components/subcontractor/SubcontractorSidebar";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { Plus, Home, ClipboardList, Receipt, User, MessageSquare } from "lucide-react";
import { useOrganizationNavigation } from '@/hooks/useOrganizationNavigation';

interface SubcontractorLayoutProps {
  children: ReactNode;
}

export const SubcontractorLayout = React.memo(function SubcontractorLayout({ children }: SubcontractorLayoutProps) {
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const { draftCount } = useInvoiceDrafts();
  const organizationNavItems = useOrganizationNavigation();

  // Stable icon mapping
  const iconMap = useMemo(() => ({
    'Dashboard': Home,
    'Work Orders': ClipboardList,
    'Reports': ClipboardList,
    'Submit Report': Plus,
    'Subcontractor Invoices': Receipt,
    'Profile': User,
  }), []);

  // Memoize navigation items to prevent re-renders
  const subcontractorNavItems = useMemo(() => {
    const base = organizationNavItems
      .filter(item => item.visible)
      .map(item => ({
        id: item.path.split('/').pop() || item.label.toLowerCase().replace(' ', '-'),
        label: item.label === 'Submit Report' ? 'Submit' : item.label,
        icon: iconMap[item.label as keyof typeof iconMap] || ClipboardList,
        path: item.path,
        badge: item.label === 'Subcontractor Invoices' ? draftCount : undefined
      }));
    return [
      ...base,
      { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' }
    ];
  }, [organizationNavItems, iconMap, draftCount]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Modern Sidebar */}
        <SubcontractorSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          {isMobile ? (
            <StandardHeader />
          ) : (
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
              <SidebarTrigger />
              <div className="flex-1" />
            </header>
          )}

          {/* Main Content */}
          <main className={`flex-1 overflow-auto ${isMobile ? 'pb-20' : ''}`}>
            <div className="container mx-auto p-4 md:p-6 max-w-full">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav navItems={subcontractorNavItems} />}
      </div>
    </SidebarProvider>
  );
});
