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
  Receipt,
  CreditCard,
  Wallet,
  TrendingUp,
  MailCheck,
  DollarSign,
  MessageSquare,
  FolderKanban
} from 'lucide-react';

export interface SidebarItem {
  title: string;
  url: string;
  icon: typeof Gauge;
}

export const sidebarItems: SidebarItem[] = [
  { title: 'Admin Dashboard', url: '/admin/dashboard', icon: Gauge },
  { title: 'Employee Dashboard', url: '/employee/dashboard', icon: HardHat },
  { title: 'Billing Dashboard', url: '/admin/billing-dashboard', icon: DollarSign },
  { title: 'Work Orders', url: '/admin/work-orders', icon: ClipboardList },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Reports', url: '/admin/reports', icon: FileBarChart },
  { title: 'Time Reports', url: '/employee/time-reports', icon: Timer },
  { title: 'Receipts', url: '/employee/receipts', icon: Receipt },
  { title: 'Finance Receipts', url: '/admin/finance/receipts', icon: Wallet },
  { title: 'Subcontractor Bills', url: '/admin/invoices', icon: FileText },
  { title: 'Partner Invoices', url: '/admin/partner-billing/select-reports', icon: CreditCard },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Organizations', url: '/admin/organizations', icon: Building2 },
  { title: 'Partner Locations', url: '/admin/partner-locations', icon: MapPin },
  { title: 'Employees', url: '/admin/employees', icon: HardHat },
  { title: 'Projects', url: '/admin/projects', icon: FolderKanban },
  { title: 'Email Templates', url: '/admin/email-templates', icon: Mail },
  { title: 'Analytics', url: '/admin/analytics', icon: TrendingUp },
  { title: 'Settings', url: '/admin/profile', icon: Settings },
  { title: 'System Health', url: '/admin/system-health', icon: Activity },
  { title: 'Email Testing', url: '/admin/test-email', icon: MailCheck },
];

export const sidebarSections = {
  OPERATIONS: ['Admin Dashboard', 'Employee Dashboard', 'Work Orders', 'Messages', 'Reports', 'Time Reports'],
  FINANCIAL: ['Billing Dashboard', 'Receipts', 'Finance Receipts', 'Subcontractor Bills', 'Partner Invoices'],
  MANAGEMENT: ['Users', 'Organizations', 'Partner Locations', 'Employees', 'Projects'],
  INSIGHTS: ['Analytics', 'Email Templates'],
  SYSTEM: ['Settings', 'System Health', 'Email Testing']
};

export const adminOnlyItems = ['Admin Dashboard', 'Billing Dashboard', 'Finance Receipts', 'Users', 'Organizations', 'Partner Locations', 'Employees', 'Projects', 'Subcontractor Bills', 'Partner Invoices', 'Settings', 'System Health', 'Email Testing'];
export const employeeAccessItems = ['Employee Dashboard', 'Work Orders', 'Messages', 'Time Reports', 'Receipts'];