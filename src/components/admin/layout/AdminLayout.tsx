
import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  
  // Use wider layout for work orders pages to accommodate the data-heavy table
  const isWorkOrdersPage = location.pathname.startsWith('/admin/work-orders');
  const maxWidthClass = isWorkOrdersPage ? 'max-w-full' : 'max-w-7xl';
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with toggle */}
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>

          {/* Main content with consistent container and padding */}
          <main className="flex-1 overflow-auto">
            <div className={`container mx-auto p-4 md:p-6 ${maxWidthClass}`}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
