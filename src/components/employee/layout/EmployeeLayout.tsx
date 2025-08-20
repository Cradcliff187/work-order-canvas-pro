import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBranding } from '@/hooks/useBranding';
import { StandardHeader } from '@/components/layout/StandardHeader';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { UserProfileDropdown } from '@/components/admin/layout/UserProfileDropdown';
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
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  BarChart3,
  FileText,
  Receipt,
  Clock,
  MessageSquare,
} from 'lucide-react';

const sidebarItems = [
  { title: 'Dashboard', url: '/employee/dashboard', icon: BarChart3 },
  { title: 'Time Reports', url: '/employee/time-reports', icon: Clock },
  { title: 'Receipts', url: '/employee/receipts', icon: Receipt },
  { title: 'Messages', url: '/employee/messages', icon: MessageSquare },
];

function EmployeeSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const { assets } = useBranding();
  const isMobile = useIsMobile();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="relative flex items-center gap-2 px-3 py-2 min-h-[3rem]">
          <img 
            src={assets.logos.main} 
            alt="AKC Logo" 
            className={`h-8 w-auto object-contain transition-all duration-200 ${
              collapsed ? 'absolute left-1/2 transform -translate-x-1/2' : ''
            }`}
          />
          {!collapsed && (
            <p className="text-xs text-sidebar-foreground/60 ml-2 transition-opacity duration-200">
              Employee Portal
            </p>
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
          <UserProfileDropdown collapsed={collapsed} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface EmployeeLayoutProps {
  children: React.ReactNode;
}

const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  // Mobile navigation items
  const employeeNavItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/employee/dashboard' },
    { id: 'time-reports', label: 'Reports', icon: FileText, path: '/employee/time-reports' },
    { id: 'receipts', label: 'Receipts', icon: Receipt, path: '/employee/receipts' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/employee/messages' },
  ], []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <EmployeeSidebar />
        
        <div className="flex-1 flex flex-col">
          {isMobile ? <MobileHeader /> : (
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
              <SidebarTrigger />
              <div className="flex-1" />
            </header>
          )}

          <main className={`flex-1 overflow-auto ${isMobile ? 'pb-20' : ''}`}>
            <div className="mx-auto px-4 md:px-6 max-w-full lg:max-w-screen-xl py-6">
              {children}
            </div>
          </main>
        </div>
        
        {isMobile && (
          <MobileBottomNav navItems={employeeNavItems} />
        )}
      </div>
    </SidebarProvider>
  );
};

export default EmployeeLayout;