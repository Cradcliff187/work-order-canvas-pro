import {
  Gauge,
  ClipboardList,
  Users,
  Building2,
  HardHat,
  ShieldCheck,
  Settings,
  Wrench,
  Mail,
  Activity,
  FileText,
  Timer,
  MapPin,
  FileBarChart,
  ReceiptText,
  TrendingUp,
  MailCheck,
  DollarSign
} from 'lucide-react';

export interface SidebarItem {
  title: string;
  url: string;
  icon: typeof Gauge;
}

export const sidebarItems: SidebarItem[] = [
  { title: 'Admin Dashboard', url: '/admin/dashboard', icon: Gauge },
  { title: 'Employee Dashboard', url: '/admin/employee-dashboard', icon: HardHat },
  { title: 'Billing Dashboard', url: '/admin/billing-dashboard', icon: DollarSign },
  { title: 'Work Orders', url: '/admin/work-orders', icon: ClipboardList },
  { title: 'Reports', url: '/admin/reports', icon: FileBarChart },
  { title: 'Time Reports', url: '/admin/time-reports', icon: Timer },
  { title: 'Receipts', url: '/admin/receipts', icon: ReceiptText },
  { title: 'Finance Receipts', url: '/admin/finance/receipts', icon: ReceiptText },
  { title: 'Invoices', url: '/admin/invoices', icon: FileText },
  { title: 'Partner Billing', url: '/admin/partner-billing/select-reports', icon: ReceiptText },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Organizations', url: '/admin/organizations', icon: Building2 },
  { title: 'Partner Locations', url: '/admin/partner-locations', icon: MapPin },
  { title: 'Employees', url: '/admin/employees', icon: HardHat },
  { title: 'Email Templates', url: '/admin/email-templates', icon: Mail },
  { title: 'Analytics', url: '/admin/analytics', icon: TrendingUp },
  { title: 'Settings', url: '/admin/profile', icon: Settings },
  { title: 'System Health', url: '/admin/system-health', icon: Activity },
  { title: 'Email Testing', url: '/admin/test-email', icon: MailCheck },
];

export const sidebarSections = {
  OPERATIONS: ['Admin Dashboard', 'Employee Dashboard', 'Work Orders', 'Reports', 'Time Reports'],
  FINANCIAL: ['Billing Dashboard', 'Receipts', 'Finance Receipts', 'Invoices', 'Partner Billing'],
  MANAGEMENT: ['Users', 'Organizations', 'Partner Locations', 'Employees'],
  INSIGHTS: ['Analytics', 'Email Templates'],
  SYSTEM: ['Settings', 'System Health', 'Email Testing']
};

export const adminOnlyItems = ['Admin Dashboard', 'Billing Dashboard', 'Finance Receipts', 'Users', 'Organizations', 'Partner Locations', 'Employees', 'Invoices', 'Partner Billing', 'Settings', 'System Health', 'Email Testing'];
export const employeeAccessItems = ['Employee Dashboard', 'Work Orders', 'Time Reports', 'Receipts'];