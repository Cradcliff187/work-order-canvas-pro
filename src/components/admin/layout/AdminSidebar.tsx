
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
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/hooks/useBranding';
import { sidebarItems, adminOnlyItems, employeeAccessItems } from './sidebarConfig';
import { UserProfileDropdown } from './UserProfileDropdown';

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile } = useAuth();
  const { getProductDisplayName } = useBranding();
  const collapsed = state === 'collapsed';
  
  const isAdmin = profile?.user_type === 'admin';
  const isEmployee = profile?.is_employee === true;

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2">
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold text-sidebar-foreground">{getProductDisplayName()}</h2>
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
                if (!isAdmin && adminOnlyItems.includes(item.title)) {
                  return null;
                }
                
                // For employees, only show employee-accessible items
                if (isEmployee && !isAdmin && !employeeAccessItems.includes(item.title)) {
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
          <UserProfileDropdown collapsed={collapsed} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
