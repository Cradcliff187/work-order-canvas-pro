
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubcontractorBillDrafts } from '@/hooks/useSubcontractorBillDrafts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { UserProfileDropdown } from '@/components/admin/layout/UserProfileDropdown';
import {
  Home,
  ClipboardList,
  Receipt,
  FileText,
  History,
  MessageSquare,
} from 'lucide-react';
import { useOrganizationNavigation } from '@/hooks/useOrganizationNavigation';

const sidebarItems = [
  { title: 'Dashboard', url: '/subcontractor/dashboard', icon: Home },
  { title: 'My Work Orders', url: '/subcontractor/work-orders', icon: ClipboardList, hasWorkOrderBadge: true },
  { title: 'Subcontractor Invoices', url: '/subcontractor/invoices', icon: Receipt },
  { title: 'Submit Invoice', url: '/subcontractor/submit-invoice', icon: FileText, hasBadge: true },
  { title: 'Report History', url: '/subcontractor/reports', icon: History },
];

export function SubcontractorSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { userOrganizations } = useAuth();
  const { draftCount } = useSubcontractorBillDrafts();
  const { assets } = useBranding();
  const isMobile = useIsMobile();
  const collapsed = state === 'collapsed';
  const organizationNavItems = useOrganizationNavigation();

  // Get organization IDs for the query
  const organizationIds = React.useMemo(() => {
    return userOrganizations?.map(org => org.organization_id) || [];
  }, [userOrganizations]);

  // Fetch assigned work orders
  const { data: assignedWorkOrders = [] } = useQuery({
    queryKey: ['sidebar-assigned-work-orders', organizationIds],
    queryFn: async () => {
      if (organizationIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, status')
        .in('assigned_organization_id', organizationIds);

      if (error) throw error;
      return data || [];
    },
    enabled: organizationIds.length > 0,
    staleTime: 60 * 1000,
  });
  
  // Count work orders that need reports (assigned or in_progress status)
  const pendingReportsCount = assignedWorkOrders.filter(
    (wo: any) => wo.status === 'assigned' || wo.status === 'in_progress'
  ).length;

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
              AKC Portal
            </p>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Organization-based navigation */}
              {organizationNavItems.filter(item => item.visible).map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.path)}
                    className={isActive(item.path) ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}
                  >
                     <Link to={item.path} className="flex items-center gap-2">
                       <item.icon className="h-4 w-4" />
                       {!collapsed && (
                         <>
                           <span className="flex-1">{item.label}</span>
                           {item.label === 'Submit Invoice' && draftCount > 0 && (
                             <Badge variant="secondary" className="ml-2 text-xs">
                               {draftCount}
                             </Badge>
                           )}
                           {item.label === 'Work Orders' && pendingReportsCount > 0 && (
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
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={isActive('/messages')}
                  className={isActive('/messages') ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}
                >
                   <Link to="/messages" className="flex items-center gap-2">
                     <MessageSquare className="h-4 w-4" />
                     {!collapsed && <span>Messages</span>}
                   </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
