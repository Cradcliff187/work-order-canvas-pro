
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBranding } from '@/hooks/useBranding';
import { StandardHeader } from '@/components/layout/StandardHeader';
import { MobileHeader } from '@/components/layout/MobileHeader';
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
  ClipboardList,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import { useOrganizationNavigation } from '@/hooks/useOrganizationNavigation';

const sidebarItems = [
  { title: 'Dashboard', url: '/partner/dashboard', icon: BarChart3 },
  { title: 'New Service Request', url: '/partner/work-orders/new', icon: Plus },
  { title: 'View Work Orders', url: '/partner/work-orders', icon: FileText },
  { title: 'Locations', url: '/partner/locations', icon: MapPin },
  { title: 'Reports', url: '/partner/reports', icon: ClipboardList },
];

function PartnerSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const { assets } = useBranding();
  const isMobile = useIsMobile();
  const collapsed = state === 'collapsed';
  const organizationNavItems = useOrganizationNavigation();
  const useOrgNavigation = true; // Always use organization navigation

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2 min-h-[3rem]">
          {collapsed || isMobile ? (
            <div className="flex items-center justify-center w-full h-8">
              <img 
                src={assets.logos.square} 
                alt="AKC Logo" 
                className="h-8 w-8 object-contain flex-shrink-0"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <img 
                src={assets.logos.main} 
                alt="AKC Logo" 
                className="h-8 w-auto object-contain"
              />
              <p className="text-xs text-sidebar-foreground/60 ml-2">AKC Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {useOrgNavigation ? (
                <>
                  {/* Organization-based navigation */}
                  {organizationNavItems.filter(item => item.visible).map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton 
                        asChild
                        isActive={isActive(item.path)}
                        className={isActive(item.path) ? "bg-sidebar-accent" : ""}
                      >
                         <Link to={item.path} className="flex items-center gap-2">
                           <item.icon className="h-4 w-4" />
                           {!collapsed && <span>{item.label}</span>}
                         </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive('/messages')}
                      className={isActive('/messages') ? "bg-sidebar-accent" : ""}
                    >
                      <Link to="/messages" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {!collapsed && <span>Messages</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : (
                // Legacy navigation
                sidebarItems.map((item) => (
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
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full p-2">
                <Avatar className={collapsed ? "h-8 w-8" : "h-8 w-8"}>
                  <AvatarFallback className="text-xs">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
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
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface PartnerLayoutProps {
  children: React.ReactNode;
}

const PartnerLayout: React.FC<PartnerLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Convert sidebar items to mobile navigation format
  const partnerNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      path: '/partner/dashboard'
    },
    {
      id: 'submit',
      label: 'Submit',
      icon: Plus,
      path: '/partner/work-orders/new'
    },
    {
      id: 'work-orders',
      label: 'Work Orders',
      icon: FileText,
      path: '/partner/work-orders'
    },
    {
      id: 'locations',
      label: 'Locations',
      icon: MapPin,
      path: '/partner/locations'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: ClipboardList,
      path: '/partner/reports'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      path: '/messages'
    }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PartnerSidebar />
        
        <div className="flex-1 flex flex-col">
          {isMobile ? <MobileHeader /> : (
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
              <SidebarTrigger />
              <div className="flex-1" />
            </header>
          )}

          <main className={`flex-1 overflow-auto ${isMobile ? 'pb-20' : ''}`}>
            <div className="mx-auto px-4 md:px-6 max-w-full lg:max-w-screen-xl">
              {children}
            </div>
          </main>
        </div>
        
        {isMobile && <MobileBottomNav navItems={partnerNavItems} />}
      </div>
    </SidebarProvider>
  );
};

export default PartnerLayout;
