import {
  BarChart3,
  FileText,
  Users,
  Building2,
  ClipboardList,
  Settings,
  Wrench,
  Mail,
  Activity,
  Receipt,
  Clock
} from 'lucide-react';

export interface SidebarItem {
  title: string;
  url: string;
  icon: typeof BarChart3;
}

export const sidebarItems: SidebarItem[] = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: BarChart3 },
  { title: 'Work Orders', url: '/admin/work-orders', icon: FileText },
  { title: 'Reports', url: '/admin/reports', icon: ClipboardList },
  { title: 'Time Reports', url: '/admin/time-reports', icon: Clock },
  { title: 'Invoices', url: '/admin/invoices', icon: Receipt },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Organizations', url: '/admin/organizations', icon: Building2 },
  { title: 'Employees', url: '/admin/employees', icon: Users },
  { title: 'Email Templates', url: '/admin/email-templates', icon: Mail },
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
  { title: 'System Health', url: '/admin/system-health', icon: Activity },
  { title: 'Dev Tools', url: '/dev-tools', icon: Wrench },
];

export const adminOnlyItems = ['Users', 'Organizations', 'Employees', 'Invoices', 'Settings', 'System Health', 'Dev Tools'];
export const employeeAccessItems = ['Dashboard', 'Work Orders', 'Time Reports'];