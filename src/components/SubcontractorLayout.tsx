import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserOrganizations } from "@/hooks/useUserOrganizations";
import { ClipboardList, FileText, Home, LogOut, History, User, Receipt, Plus, Building2 } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInvoiceDrafts } from "@/hooks/useInvoiceDrafts";
import { SingleOrganizationGuard } from "@/components/SingleOrganizationGuard";

interface SubcontractorLayoutProps {
  children: ReactNode;
}

export function SubcontractorLayout({ children }: SubcontractorLayoutProps) {
  const { signOut } = useAuth();
  const { profile } = useUserProfile();
  const { data: userOrganizations } = useUserOrganizations();
  const primaryOrg = userOrganizations?.[0];
  const location = useLocation();
  const isMobile = useIsMobile();
  const { draftCount } = useInvoiceDrafts();

  const navigation: Array<{name: string, href: string, icon: any, badge?: number}> = [
    { name: "Dashboard", href: "/subcontractor/dashboard", icon: Home },
    { name: "My Work Orders", href: "/subcontractor/work-orders", icon: ClipboardList },
    { name: "Invoices", href: "/subcontractor/invoices", icon: Receipt },
    { 
      name: "Submit Invoice", 
      href: "/subcontractor/submit-invoice", 
      icon: FileText,
      badge: draftCount > 0 ? draftCount : undefined
    },
    { name: "Report History", href: "/subcontractor/reports", icon: History },
    { name: "Profile Settings", href: "/subcontractor/profile", icon: User },
  ];

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

  const NavItems = () => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Icon className="mr-3 h-4 w-4" />
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {item.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold">WorkOrderPro</h1>
              <span className="text-sm text-muted-foreground">| Subcontractor</span>
            </div>
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

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-muted/50 border-r">
          <nav className="flex-1 p-4">
            <div className="flex flex-col space-y-2">
              <NavItems />
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 md:ml-64 ${isMobile ? 'pb-20' : ''}`}>
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
  );
}