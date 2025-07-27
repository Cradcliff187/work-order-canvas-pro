
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoiceDrafts } from '@/hooks/useInvoiceDrafts';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { useBranding } from '@/hooks/useBranding';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
  Home,
  ClipboardList,
  Receipt,
  FileText,
  History,
  Settings,
  LogOut,
} from 'lucide-react';

const sidebarItems = [
  { title: 'Dashboard', url: '/subcontractor/dashboard', icon: Home },
  { title: 'My Work Orders', url: '/subcontractor/work-orders', icon: ClipboardList, hasWorkOrderBadge: true },
  { title: 'Invoices', url: '/subcontractor/invoices', icon: Receipt },
  { title: 'Submit Invoice', url: '/subcontractor/submit-invoice', icon: FileText, hasBadge: true },
  { title: 'Report History', url: '/subcontractor/reports', icon: History },
];

export function SubcontractorSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const { draftCount } = useInvoiceDrafts();
  const { assignedWorkOrders } = useSubcontractorWorkOrders();
  const { assets } = useBranding();
  const isMobile = useIsMobile();
  const collapsed = state === 'collapsed';
  
  // Count work orders that need reports (assigned or in_progress status)
  const pendingReportsCount = assignedWorkOrders.data?.filter(
    (wo: any) => wo.status === 'assigned' || wo.status === 'in_progress'
  ).length || 0;

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2">
          {collapsed || isMobile ? (
            <div className="flex items-center justify-center w-full">
              <img 
                src={assets.logos.square} 
                alt="AKC Logo" 
                className="h-6 w-6 object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <img 
                src={assets.logos.main} 
                alt="AKC Logo" 
                className="h-8 w-auto object-contain"
              />
              <p className="text-xs text-sidebar-foreground/60 ml-2">Subcontractor Portal</p>
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
                    className={isActive(item.url) ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.hasBadge && draftCount > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {draftCount}
                            </Badge>
                          )}
                          {item.hasWorkOrderBadge && pendingReportsCount > 0 && (
                            <Badge variant="default" className="ml-2 text-xs">
                              {pendingReportsCount}
                            </Badge>
                          )}
                        </>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full p-2">
                <Avatar className={collapsed ? "h-6 w-6" : "h-8 w-8"}>
                  <AvatarFallback className="text-xs">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
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
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
