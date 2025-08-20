
import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import FloatingClockWidget from '@/components/employee/FloatingClockWidget';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart3, FileText, Receipt, MessageSquare } from 'lucide-react';

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
  
  // Show mobile navigation for employees on mobile
  const showMobileNav = isEmployee && isMobile;
  
  // Employee navigation items for mobile
  const employeeNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/employee/dashboard' },
    { id: 'time-reports', label: 'Reports', icon: FileText, path: '/employee/time-reports' },
    { id: 'receipts', label: 'Receipts', icon: Receipt, path: '/employee/receipts' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/employee/messages' },
  ];
  
  // Adjust padding for mobile navigation and floating clock widget
  const mainPaddingClass = showMobileNav 
    ? 'pb-[100px]' // Space for MobileBottomNav and FloatingClockWidget
    : isEmployee && isMobile 
      ? 'pb-[100px]' // Space for FloatingClockWidget only
      : 'pb-20 md:pb-0'; // Default padding
  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-background text-foreground border border-border rounded-md px-3 py-2 shadow outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background z-50"
      >
        Skip to main content
      </a>
      <div className="min-h-svh flex w-full bg-background">
        {!showMobileNav && <AdminSidebar />}
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with single toggle - matches SubcontractorLayout structure */}
          <header role="banner" className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
            {!showMobileNav && <SidebarTrigger />}
            <div className="flex-1" />
          </header>

          {/* Main content with consistent container and padding */}
          <main id="main-content" role="main" tabIndex={-1} className={`flex-1 overflow-auto ${mainPaddingClass}`}>
            <div className={`container mx-auto ${contentPaddingClass} ${maxWidthClass}`}>
              {children}
            </div>
          </main>
        </div>
        
        {/* Mobile Navigation for Employees */}
        {showMobileNav && <MobileBottomNav navItems={employeeNavItems} />}
        
        {/* Floating Clock Widget for Employees */}
        {isEmployee && <FloatingClockWidget />}
      </div>
    </SidebarProvider>
  );
}
