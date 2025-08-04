
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApprovalQueue } from '@/hooks/useApprovalQueue';
import { useBranding } from '@/hooks/useBranding';
import { useIsMobile } from '@/hooks/use-mobile';
import { sidebarItems, sidebarSections, adminOnlyItems, employeeAccessItems } from './sidebarConfig';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOrganizationNavigation } from '@/hooks/useOrganizationNavigation';

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const userProfile = useUserProfile();
  const organizationNavItems = useOrganizationNavigation();
  const { totalCount } = useApprovalQueue();
  const { assets } = useBranding();
  const isMobile = useIsMobile();
  const collapsed = state === 'collapsed';
  
  // Use stable organization-based permissions
  const isAdmin = userProfile.isAdmin();
  const isEmployee = userProfile.isEmployee();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
              <p className="text-xs text-sidebar-foreground/60 ml-2">Admin Portal</p>
            </div>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full ${collapsed ? 'h-8 w-8 p-0' : 'justify-start h-auto p-2'}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {profile?.first_name} {profile?.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {profile?.email}
                      </span>
                    </div>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  );
}
