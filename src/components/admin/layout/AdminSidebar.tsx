
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useApprovalQueue } from '@/hooks/useApprovalQueue';
import { useBranding } from '@/hooks/useBranding';
import { useIsMobile } from '@/hooks/use-mobile';
import { sidebarItems, sidebarSections, adminOnlyItems, employeeAccessItems } from './sidebarConfig';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useMigrationContext } from '@/components/MigrationWrapper';
import { useEnhancedPermissions } from '@/hooks/useEnhancedPermissions';
import { useOrganizationNavigation } from '@/hooks/useOrganizationNavigation';

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile } = useAuth();
  const { permissions, migrationFlags } = useMigrationContext();
  const enhancedPermissions = useEnhancedPermissions();
  const organizationNavItems = useOrganizationNavigation();
  const { totalCount } = useApprovalQueue();
  const { assets } = useBranding();
  const isMobile = useIsMobile();
  const collapsed = state === 'collapsed';
  
  // Use enhanced permissions when available, fallback to bridge
  const isAdmin = migrationFlags.useOrganizationPermissions ? 
    enhancedPermissions.isAdmin : permissions.isAdmin;
  const isEmployee = migrationFlags.useOrganizationPermissions ? 
    enhancedPermissions.isEmployee : permissions.isEmployee;

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
                  tooltip={collapsed ? item.title : undefined}
                >
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.title}</span>
                        {item.title === 'Approval Center' && totalCount > 0 && (
                          <Badge variant="secondary" className="h-5 text-[10px] px-1.5 ml-2">
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
    <TooltipProvider>
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
              <p className="text-xs text-sidebar-foreground/60 ml-2">Admin Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {migrationFlags.useOrganizationNavigation ? (
          // Organization-based navigation
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {organizationNavItems.filter(item => item.visible).map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive(item.path)}
                      className={isActive(item.path) ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}
                      tooltip={collapsed ? item.label : undefined}
                    >
                      <Link to={item.path} className="flex items-center gap-2">
                        <span className="flex-1">{item.label}</span>
                        {item.label === 'Approval Center' && totalCount > 0 && (
                          <Badge variant="secondary" className="h-5 text-[10px] px-1.5 ml-2">
                            {totalCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          // Legacy navigation
          <>
            {renderSidebarSection('Operations', sidebarSections.OPERATIONS)}
            {renderSidebarSection('Financial', sidebarSections.FINANCIAL)}
            {renderSidebarSection('Management', sidebarSections.MANAGEMENT)}
            {renderSidebarSection('Insights', sidebarSections.INSIGHTS)}
            {renderSidebarSection('System', sidebarSections.SYSTEM)}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-3">
          <UserProfileDropdown collapsed={collapsed} />
        </div>
      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  );
}
