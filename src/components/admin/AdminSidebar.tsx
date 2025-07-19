
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Settings,
  Mail,
  BarChart3,
  Wrench,
  MapPin,
} from 'lucide-react';

const AdminSidebar = () => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Work Orders',
      href: '/admin/work-orders',
      icon: FileText,
    },
    {
      title: 'Users',
      href: '/admin/users',
      icon: Users,
    },
    {
      title: 'Organizations',
      href: '/admin/organizations',
      icon: Building2,
    },
    {
      title: 'Partner Locations',
      href: '/admin/partner-locations',
      icon: MapPin,
    },
    {
      title: 'Trades',
      href: '/admin/trades',
      icon: Wrench,
    },
    {
      title: 'Reports',
      href: '/admin/reports',
      icon: BarChart3,
    },
    {
      title: 'Email Templates',
      href: '/admin/email-templates',
      icon: Mail,
    },
    {
      title: 'System Settings',
      href: '/admin/system-settings',
      icon: Settings,
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminSidebar;
