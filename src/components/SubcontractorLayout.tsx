import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInvoiceDrafts } from "@/hooks/useInvoiceDrafts";
import { SingleOrganizationGuard } from "@/components/SingleOrganizationGuard";
import { SubcontractorSidebar } from "@/components/subcontractor/SubcontractorSidebar";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { Plus, Home, ClipboardList, Receipt, User } from "lucide-react";

interface SubcontractorLayoutProps {
  children: ReactNode;
}

export function SubcontractorLayout({ children }: SubcontractorLayoutProps) {
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const { draftCount } = useInvoiceDrafts();

  // Convert navigation items to mobile navigation format
  const subcontractorNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/subcontractor/dashboard'
    },
    {
      id: 'work-orders',
      label: 'Work Orders',
      icon: ClipboardList,
      path: '/subcontractor/work-orders'
    },
    {
      id: 'submit',
      label: 'Submit',
      icon: Plus,
      path: '/subcontractor/submit-invoice'
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: Receipt,
      path: '/subcontractor/invoices',
      badge: draftCount
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/subcontractor/profile'
    }
  ];

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
            <SingleOrganizationGuard userType="subcontractor">
              <div className="container mx-auto p-4 md:p-6 max-w-7xl">
                {children}
              </div>
            </SingleOrganizationGuard>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav navItems={subcontractorNavItems} />}
      </div>
    </SidebarProvider>
  );
}
