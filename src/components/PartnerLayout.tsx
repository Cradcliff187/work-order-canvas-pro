import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart3,
  FileText,
  Plus,
  Settings,
  LogOut,
  Menu,
  ClipboardList,
  MapPin,
} from 'lucide-react';

const sidebarItems = [
  { title: 'Dashboard', url: '/partner/dashboard', icon: BarChart3 },
  { title: 'Submit Work Order', url: '/partner/work-orders/new', icon: Plus },
  { title: 'View Work Orders', url: '/partner/work-orders', icon: FileText },
  { title: 'Locations', url: '/partner/locations', icon: MapPin },
  { title: 'Reports', url: '/partner/reports', icon: ClipboardList },
];

function PartnerSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
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
              <p className="text-xs text-sidebar-foreground/60">Partner Portal</p>
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
                      {!collapsed && <span>{item.title}</span>}
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
                  <Link to="/partner/profile" className="flex items-center">
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
                  <Link to="/partner/profile" className="flex items-center">
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

interface PartnerLayoutProps {
  children: React.ReactNode;
}

const PartnerLayout: React.FC<PartnerLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const { data: userOrganizations } = useUserOrganizations();
  const primaryOrganization = userOrganizations?.[0];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PartnerSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">Partner Portal</span>
                {primaryOrganization && (
                  <span className="text-sm font-medium text-primary">
                    {primaryOrganization.name}
                  </span>
                )}
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
    </SidebarProvider>
  );
};

export default PartnerLayout;