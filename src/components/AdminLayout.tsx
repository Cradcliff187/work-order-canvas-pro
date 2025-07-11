import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  Users,
  Building2,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  Wrench,
  Mail,
  Activity
} from 'lucide-react';

const sidebarItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: BarChart3 },
  { title: 'Work Orders', url: '/admin/work-orders', icon: FileText },
  { title: 'Reports', url: '/admin/reports', icon: ClipboardList },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Organizations', url: '/admin/organizations', icon: Building2 },
  { title: 'Employees', url: '/admin/employees', icon: Users },
  { title: 'Email Templates', url: '/admin/email-templates', icon: Mail },
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
  { title: 'System Health', url: '/admin/system-health', icon: Activity },
  { title: 'Dev Tools', url: '/dev-tools', icon: Wrench },
];

function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const collapsed = state === 'collapsed';
  
  const isAdmin = profile?.user_type === 'admin';

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
              <p className="text-xs text-sidebar-foreground/60">Admin Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                // Hide admin-only items for employees
                const adminOnlyItems = ['Users', 'Organizations', 'Employees', 'Settings', 'System Health', 'Dev Tools'];
                if (!isAdmin && adminOnlyItems.includes(item.title)) {
                  return null;
                }
                
                return (
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
                );
              })}
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
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
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
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
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

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with toggle */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-background px-4">
            <SidebarTrigger className="lg:hidden">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;