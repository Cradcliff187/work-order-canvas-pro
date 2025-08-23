
import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminMobileNav } from './AdminMobileNav';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  
  // Use full-width layout for all admin pages to maximize screen space utilization
  const maxWidthClass = 'max-w-full';
  const contentPaddingClass = 'p-4 md:p-6';
  
  // Adjust padding for mobile navigation
  const mainPaddingClass = isMobile ? 'pb-20' : 'pb-0';
  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-background text-foreground border border-border rounded-md px-3 py-2 shadow outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background z-50"
      >
        Skip to main content
      </a>
      <div className="min-h-svh flex w-full bg-background">
        {!isMobile && <AdminSidebar />}
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with single toggle for desktop only */}
          <header role="banner" className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
            {!isMobile && <SidebarTrigger />}
            <div className="flex-1" />
          </header>

          {/* Main content with consistent container and padding */}
          <main id="main-content" role="main" tabIndex={-1} className={`flex-1 overflow-auto ${mainPaddingClass}`}>
            <div className={`container mx-auto ${contentPaddingClass} ${maxWidthClass}`}>
              {children}
            </div>
          </main>
        </div>
        
        {/* Admin Mobile Navigation */}
        {isMobile && <AdminMobileNav />}
      </div>
    </SidebarProvider>
  );
}
