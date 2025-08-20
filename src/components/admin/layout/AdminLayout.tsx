
import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { QuickActionsBar } from '@/components/employee/QuickActionsBar';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { isEmployee } = usePermissions();
  const isMobile = useIsMobile();
  
  // Use full-width layout for all admin pages to maximize screen space utilization
  const maxWidthClass = 'max-w-full';
  const contentPaddingClass = 'p-4 md:p-6';
  
  // Show quick actions for employees on mobile
  const showQuickActions = isEmployee && isMobile;
  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-background text-foreground border border-border rounded-md px-3 py-2 shadow outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background z-50"
      >
        Skip to main content
      </a>
      <div className="min-h-svh flex w-full bg-background">
        {!showQuickActions && <AdminSidebar />}
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with single toggle - matches SubcontractorLayout structure */}
          <header role="banner" className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
            {!showQuickActions && <SidebarTrigger />}
            <div className="flex-1" />
          </header>

          {/* Main content with consistent container and padding */}
          <main id="main-content" role="main" tabIndex={-1} className={`flex-1 overflow-auto ${showQuickActions ? 'pb-[80px]' : 'pb-20 md:pb-0'}`}>
            <div className={`container mx-auto ${contentPaddingClass} ${maxWidthClass}`}>
              {children}
            </div>
          </main>
        </div>
        
        {/* Quick Actions Bar for Employees on Mobile */}
        {showQuickActions && <QuickActionsBar />}
      </div>
    </SidebarProvider>
  );
}
