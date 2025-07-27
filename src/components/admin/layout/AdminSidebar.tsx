
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import { useAuth } from '@/contexts/AuthContext';
import { useApprovalQueue } from '@/hooks/useApprovalQueue';
import { WorkOrderPortalLogo } from '@/components/ui/WorkOrderPortalLogo';
import { sidebarItems, sidebarSections, adminOnlyItems, employeeAccessItems } from './sidebarConfig';
import { UserProfileDropdown } from './UserProfileDropdown';

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile } = useAuth();
  const { totalCount } = useApprovalQueue();
  const collapsed = state === 'collapsed';
  
  const isAdmin = profile?.user_type === 'admin';
  const isEmployee = profile?.is_employee === true;

  const isActive = (path: string) => location.pathname === path;

  const getFilteredItemsForSection = (sectionItems: string[]) => {
    return sidebarItems.filter((item) => {
      if (!sectionItems.includes(item.title)) return false;
      
      // Hide admin-only items for employees
      if (!isAdmin && adminOnlyItems.includes(item.title)) {
        return false;
      }
      
      // For employees, only show employee-accessible items
      if (isEmployee && !isAdmin && !employeeAccessItems.includes(item.title)) {
        return false;
      }
      
      return true;
    });
  };

  const renderSidebarSection = (sectionTitle: string, sectionItems: string[]) => {
    const filteredItems = getFilteredItemsForSection(sectionItems);
    
    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup key={sectionTitle}>
        <SidebarGroupLabel>{sectionTitle}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredItems.map((item) => (
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
                        {item.title === 'Approval Center' && totalCount > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {totalCount}
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
    );
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2">
          {collapsed ? (
            <WorkOrderPortalLogo size="sm" iconOnly className="mx-auto" />
          ) : (
            <div className="flex flex-col gap-1">
              <WorkOrderPortalLogo size="md" />
              <p className="text-xs text-sidebar-foreground/60 ml-11">Admin Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderSidebarSection('Operations', sidebarSections.OPERATIONS)}
        {renderSidebarSection('Financial', sidebarSections.FINANCIAL)}
        {renderSidebarSection('Management', sidebarSections.MANAGEMENT)}
        {renderSidebarSection('Insights', sidebarSections.INSIGHTS)}
        {renderSidebarSection('System', sidebarSections.SYSTEM)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-3">
          <UserProfileDropdown collapsed={collapsed} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
