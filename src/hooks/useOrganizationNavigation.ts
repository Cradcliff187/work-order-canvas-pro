import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  Activity, BarChart3, Building2, ClipboardList, FileText, HardHat, History, Home, 
  LayoutDashboard, MapPin, Plus, Receipt, Settings, TrendingUp, User, Users, type LucideIcon
} from 'lucide-react';

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  requiredPermission?: string;
  visible: boolean;
}

export const useOrganizationNavigation = () => {
  const { isAdmin, isEmployee, isPartner, isSubcontractor, hasPermission } = useUserProfile();

  // Stable navigation items with memoized permission checks
  return useMemo(() => {

    // Organization-based navigation
    if (isAdmin()) {
      return [
        { label: 'Dashboard', path: '/admin/dashboard', icon: BarChart3, visible: true },
        { label: 'Work Orders', path: '/admin/work-orders', icon: ClipboardList, visible: hasPermission('employee') },
        { label: 'Users', path: '/admin/users', icon: Users, visible: hasPermission('admin') },
        { label: 'Organizations', path: '/admin/organizations', icon: Building2, visible: hasPermission('admin') },
        { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, visible: hasPermission('employee') },
        { label: 'System Health', path: '/admin/system-health', icon: Activity, visible: hasPermission('admin') },
      ];
    } else if (isEmployee()) {
      return [
        { label: 'Dashboard', path: '/admin/employee-dashboard', icon: Home, visible: true },
        { label: 'Work Orders', path: '/admin/work-orders', icon: ClipboardList, visible: hasPermission('employee') },
        { label: 'Reports', path: '/admin/reports', icon: FileText, visible: true },
      ];
    } else if (isPartner()) {
      return [
        { label: 'Dashboard', path: '/partner/dashboard', icon: BarChart3, visible: true },
        { label: 'New Service Request', path: '/partner/work-orders/new', icon: Plus, visible: true },
        { label: 'View Work Orders', path: '/partner/work-orders', icon: FileText, visible: true },
        { label: 'Locations', path: '/partner/locations', icon: MapPin, visible: true },
        { label: 'Reports', path: '/partner/reports', icon: ClipboardList, visible: true },
        { label: 'Profile', path: '/partner/profile', icon: User, visible: true },
      ];
    } else if (isSubcontractor()) {
      return [
        { label: 'Dashboard', path: '/subcontractor/dashboard', icon: Home, visible: true },
        { label: 'Work Orders', path: '/subcontractor/work-orders', icon: ClipboardList, visible: true },
        { label: 'Submit Invoice', path: '/subcontractor/submit-invoice', icon: FileText, visible: true },
        { label: 'Invoices', path: '/subcontractor/invoices', icon: Receipt, visible: true },
        { label: 'Report History', path: '/subcontractor/reports', icon: History, visible: true },
        { label: 'Profile', path: '/subcontractor/profile', icon: User, visible: true },
      ];
    }

    return [];
  }, [
    isAdmin,
    isEmployee, 
    isPartner,
    isSubcontractor,
    hasPermission
  ]);
};