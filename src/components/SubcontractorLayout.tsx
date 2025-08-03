import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInvoiceDrafts } from "@/hooks/useInvoiceDrafts";
import { SubcontractorSidebar } from "@/components/subcontractor/SubcontractorSidebar";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { Plus, Home, ClipboardList, Receipt, User } from "lucide-react";
import { useOrganizationNavigation } from '@/hooks/useOrganizationNavigation';

interface SubcontractorLayoutProps {
  children: ReactNode;
}

export function SubcontractorLayout({ children }: SubcontractorLayoutProps) {
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const { draftCount } = useInvoiceDrafts();
  const organizationNavItems = useOrganizationNavigation();
  const useOrgNavigation = true; // Always use organization navigation

  // Convert organization navigation items to mobile navigation format with icons
  const iconMap = {
    'Dashboard': Home,
    'Work Orders': ClipboardList,
    'Reports': ClipboardList,
    'Submit Report': Plus,
    'Invoices': Receipt,
  };

  const subcontractorNavItems = organizationNavItems
    .filter(item => item.visible)
    .map(item => ({
      id: item.path.split('/').pop() || item.label.toLowerCase().replace(' ', '-'),
      label: item.label === 'Submit Report' ? 'Submit' : item.label,
      icon: iconMap[item.label as keyof typeof iconMap] || ClipboardList,
      path: item.path,
      badge: item.label === 'Invoices' ? draftCount : undefined
    }));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Modern Sidebar */}
        <SubcontractorSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <StandardHeader />

          {/* Main Content */}
          <main className={`flex-1 overflow-auto ${isMobile ? 'pb-20' : ''}`}>
            <div className="container mx-auto p-4 md:p-6 max-w-screen-xl">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav navItems={subcontractorNavItems} />}
      </div>
    </SidebarProvider>
  );
}
