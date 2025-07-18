
import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserOrganizations } from "@/hooks/useUserOrganizations";
import { Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInvoiceDrafts } from "@/hooks/useInvoiceDrafts";
import { SingleOrganizationGuard } from "@/components/SingleOrganizationGuard";
import { SubcontractorSidebar } from "@/components/subcontractor/SubcontractorSidebar";
import { Plus, Home, ClipboardList, Receipt, User } from "lucide-react";

interface SubcontractorLayoutProps {
  children: ReactNode;
}

export function SubcontractorLayout({ children }: SubcontractorLayoutProps) {
  const { signOut } = useAuth();
  const { profile } = useUserProfile();
  const { data: userOrganizations } = useUserOrganizations();
  const primaryOrg = userOrganizations?.[0];
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
      path: '/subcontractor/invoices'
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
      <div className="min-h-screen bg-background flex">
        {/* Modern Sidebar */}
        <SubcontractorSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="-ml-1" />
                
                {primaryOrg && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{primaryOrg.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{primaryOrg.organization_type}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden sm:block text-sm text-muted-foreground">
                  {profile && (
                    <span>
                      {profile.first_name} {profile.last_name}
                      {profile.company_name && (
                        <span className="block text-xs">{profile.company_name}</span>
                      )}
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className={`flex-1 ${isMobile ? 'pb-20' : ''}`}>
            <SingleOrganizationGuard userType="subcontractor">
              <div className="p-6">
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
