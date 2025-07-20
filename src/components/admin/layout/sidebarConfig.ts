
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  BarChart3,
  Settings,
  Mail,
  Clock,
  Receipt,
  User,
  Wrench,
  Heart,
  TestTube,
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
    title: 'Employees',
    url: '/admin/employees',
    icon: Users,
  },
  {
    title: 'Invoices',
    url: '/admin/invoices',
    icon: FileText,
  },
  {
    title: 'Reports',
    url: '/admin/reports',
    icon: BarChart3,
  },
  {
    title: 'Analytics',
    url: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Time Reports',
    url: '/admin/time-reports',
    icon: Clock,
  },
  {
    title: 'Receipts',
    url: '/admin/receipts',
    icon: Receipt,
  },
  {
    title: 'Profile',
    url: '/admin/profile',
    icon: User,
  },
  {
    title: 'System Health',
    url: '/admin/system-health',
    icon: Heart,
  },
  {
    title: 'Test Email',
    url: '/admin/test-email',
    icon: TestTube,
  },
  {
    title: 'Dev Tools',
    url: '/dev-tools',
    icon: Wrench,
  },
  {
    title: 'Email Templates',
    url: '/admin/email-templates',
    icon: Mail,
  },
  {
    title: 'Email Test',
    url: '/admin/email-test',
    icon: Mail,
  },
  {
    title: 'System Settings',
    url: '/admin/system-settings',
    icon: Settings,
  },
];

export const adminOnlyItems = [
  'Users',
  'Organizations',
  'System Settings',
  'Email Templates',
  'Email Test',
  'Employees',
  'Invoices',
  'System Health',
  'Test Email',
  'Dev Tools',
];

export const employeeAccessItems = [
  'Dashboard',
  'Work Orders',
  'Reports',
  'Analytics',
  'Time Reports',
  'Receipts',
  'Profile',
];
