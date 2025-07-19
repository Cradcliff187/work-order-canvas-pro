
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  BarChart3,
  Settings,
  Mail,
} from 'lucide-react';

export const sidebarItems = [
  {
    title: 'Dashboard',
    url: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Work Orders',
    url: '/admin/work-orders',
    icon: FileText,
  },
  {
    title: 'Users',
    url: '/admin/users',
    icon: Users,
  },
  {
    title: 'Organizations',
    url: '/admin/organizations',
    icon: Building2,
  },
  {
    title: 'Reports',
    url: '/admin/reports',
    icon: BarChart3,
  },
  {
    title: 'Email Templates',
    url: '/admin/email-templates',
    icon: Mail,
  },
  {
    title: 'System Settings',
    url: '/admin/system-settings',
    icon: Settings,
  },
];

export const adminOnlyItems = [
  'System Settings',
  'Email Templates',
];

export const employeeAccessItems = [
  'Dashboard',
  'Work Orders',
  'Reports',
];
