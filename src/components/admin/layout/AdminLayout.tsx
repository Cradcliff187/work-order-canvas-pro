
import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  
  // Use wider layout for work orders pages to accommodate the data-heavy table
  const isWorkOrdersPage = location.pathname.startsWith('/admin/work-orders');
  const maxWidthClass = isWorkOrdersPage ? 'max-w-full' : 'max-w-screen-xl';
  const contentPaddingClass = isWorkOrdersPage ? 'p-0 md:p-6' : 'p-4 md:p-6';
  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-background text-foreground border border-border rounded-md px-3 py-2 shadow outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background z-50"
      >
        Skip to main content
      </a>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with single toggle - matches SubcontractorLayout structure */}
          <header role="banner" className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>

          {/* Main content with consistent container and padding */}
          <main id="main-content" role="main" tabIndex={-1} className="flex-1 overflow-y-auto">
            <div className={`container mx-auto ${contentPaddingClass} w-full max-w-full ${maxWidthClass}`}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
