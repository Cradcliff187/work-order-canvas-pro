import {
  BarChart3,
  FileText,
  Users,
  Building2,
  ClipboardList,
  ClipboardCheck,
  Settings,
  Wrench,
  Mail,
  Activity,
  Receipt,
  Clock,
  MapPin
} from 'lucide-react';

export interface SidebarItem {
  title: string;
  url: string;
  icon: typeof BarChart3;
}

export const sidebarItems: SidebarItem[] = [
  { title: 'Admin Dashboard', url: '/admin/dashboard', icon: BarChart3 },
  { title: 'Employee Dashboard', url: '/admin/employee-dashboard', icon: BarChart3 },
  { title: 'Work Orders', url: '/admin/work-orders', icon: FileText },
  { title: 'Approval Center', url: '/admin/approvals', icon: ClipboardCheck },
  { title: 'Reports', url: '/admin/reports', icon: ClipboardList },
  { title: 'Time Reports', url: '/admin/time-reports', icon: Clock },
  { title: 'Receipts', url: '/admin/receipts', icon: Receipt },
  { title: 'Invoices', url: '/admin/invoices', icon: Receipt },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Organizations', url: '/admin/organizations', icon: Building2 },
  { title: 'Partner Locations', url: '/admin/partner-locations', icon: MapPin },
  { title: 'Employees', url: '/admin/employees', icon: Users },
  { title: 'Email Templates', url: '/admin/email-templates', icon: Mail },
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
  { title: 'System Health', url: '/admin/system-health', icon: Activity },
  { title: 'Email Testing', url: '/admin/test-email', icon: Mail },
  { title: 'Dev Tools', url: '/dev-tools', icon: Wrench },
];

export const sidebarSections = {
  OPERATIONS: ['Admin Dashboard', 'Employee Dashboard', 'Work Orders', 'Approval Center', 'Reports', 'Time Reports'],
  FINANCIAL: ['Receipts', 'Invoices'],
  MANAGEMENT: ['Users', 'Organizations', 'Partner Locations', 'Employees'],
  INSIGHTS: ['Analytics', 'Email Templates'],
  SYSTEM: ['Settings', 'System Health', 'Email Testing', 'Dev Tools']
};

export const adminOnlyItems = ['Admin Dashboard', 'Users', 'Organizations', 'Partner Locations', 'Employees', 'Invoices', 'Settings', 'System Health', 'Email Testing', 'Dev Tools'];
export const employeeAccessItems = ['Employee Dashboard', 'Work Orders', 'Approval Center', 'Time Reports', 'Receipts'];