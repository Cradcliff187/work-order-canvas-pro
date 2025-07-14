import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useInvoiceDrafts } from '@/hooks/useInvoiceDrafts';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ClipboardList,
  FileText,
  Home,
  LogOut,
  History,
  User,
  Receipt,
  Menu,
  Settings,
} from 'lucide-react';

const sidebarItems = [
  { title: 'Dashboard', url: '/subcontractor/dashboard', icon: Home },
  { title: 'My Work Orders', url: '/subcontractor/work-orders', icon: ClipboardList },
  { title: 'Invoices', url: '/subcontractor/invoices', icon: Receipt },
  { title: 'Submit Invoice', url: '/subcontractor/submit-invoice', icon: FileText },
  { title: 'Report History', url: '/subcontractor/reports', icon: History },
  { title: 'Profile Settings', url: '/subcontractor/profile', icon: User },
];

function SubcontractorSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const { draftCount } = useInvoiceDrafts();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2">
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold text-sidebar-foreground">WorkOrderPro</h2>
              <p className="text-xs text-sidebar-foreground/60">Subcontractor Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.url)}
                    className={isActive(item.url) ? "bg-sidebar-accent" : ""}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span>{item.title}</span>
                          {item.title === 'Submit Invoice' && draftCount > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {draftCount}
                            </Badge>
                          )}
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-3">
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 h-auto p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-medium">{profile?.first_name} {profile?.last_name}</span>
                    <span className="text-muted-foreground capitalize">{profile?.user_type}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/subcontractor/profile" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full p-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/subcontractor/profile" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface SubcontractorLayoutProps {
  children: React.ReactNode;
}

export const SubcontractorLayout: React.FC<SubcontractorLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const { data: userOrganizations } = useUserOrganizations();
  const isMobile = useIsMobile();
  const primaryOrganization = userOrganizations?.[0];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SubcontractorSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">
                  {primaryOrganization?.name || 'Subcontractor'} Portal
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                {profile && (
                  <div className="flex flex-col">
                    <span>{profile.first_name} {profile.last_name}</span>
                    {primaryOrganization?.name && (
                      <span className="text-xs">{primaryOrganization.name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      {isMobile && (
        <MobileBottomNav navigation={sidebarItems} />
      )}
    </SidebarProvider>
  );
};