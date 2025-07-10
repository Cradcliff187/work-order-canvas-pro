import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ClipboardList, FileText, Home, LogOut, Menu, History, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface SubcontractorLayoutProps {
  children: ReactNode;
}

export function SubcontractorLayout({ children }: SubcontractorLayoutProps) {
  const { signOut } = useAuth();
  const { profile } = useUserProfile();
  const location = useLocation();
  const isMobile = useIsMobile();

  const navigation = [
    { name: "Dashboard", href: "/subcontractor/dashboard", icon: Home },
    { name: "My Work Orders", href: "/subcontractor/work-orders", icon: ClipboardList },
    { name: "Report History", href: "/subcontractor/reports", icon: History },
    { name: "Profile Settings", href: "/subcontractor/profile", icon: User },
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
            {item.name}
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
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col space-y-3 mt-4">
                  <NavItems />
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold">WorkOrderPro</h1>
              <span className="text-sm text-muted-foreground">| Subcontractor</span>
            </div>
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
          <div className="container py-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
}