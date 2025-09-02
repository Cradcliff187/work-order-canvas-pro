
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
import { useSubmittedCounts } from '@/hooks/useSubmittedCounts';
import { useBranding } from '@/hooks/useBranding';
import { useIsMobile } from '@/hooks/use-mobile';
import { sidebarItems, sidebarSections, adminOnlyItems, employeeAccessItems } from './sidebarConfig';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOrganizationNavigation } from '@/hooks/useOrganizationNavigation';

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile } = useAuth();
  const userProfile = useUserProfile();
  const organizationNavItems = useOrganizationNavigation();
  const { data: submittedCounts } = useSubmittedCounts();
  const { assets } = useBranding();
  const isMobile = useIsMobile();
  const collapsed = state === 'collapsed';
  
  // Use stable organization-based permissions
  const isAdmin = userProfile.isAdmin();
  const isEmployee = userProfile.isEmployee();

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
                        {item.title === 'Reports' && submittedCounts && submittedCounts.reportsCount > 0 && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 h-5 text-[10px] px-1.5 ml-2">
                            {submittedCounts.reportsCount}
                          </Badge>
                        )}
                        {item.title === 'Subcontractor Bills' && submittedCounts && submittedCounts.invoicesCount > 0 && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 h-5 text-[10px] px-1.5 ml-2">
                            {submittedCounts.invoicesCount}
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
                Admin Portal
              </p>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Render all sections from sidebarConfig */}
          {renderSidebarSection('OPERATIONS', sidebarSections.OPERATIONS)}
          {renderSidebarSection('FINANCIAL', sidebarSections.FINANCIAL)}
          {renderSidebarSection('MANAGEMENT', sidebarSections.MANAGEMENT)}
          {renderSidebarSection('INSIGHTS', sidebarSections.INSIGHTS)}
          {renderSidebarSection('SYSTEM', sidebarSections.SYSTEM)}
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
