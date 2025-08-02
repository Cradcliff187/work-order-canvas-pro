import { useMemo } from 'react';
import { useEnhancedPermissions } from '@/hooks/useEnhancedPermissions';
import { 
  BarChart3, FileText, Plus, Settings, ClipboardList, MapPin,
  Home, Receipt, History, User, Users, Building2, Activity, type LucideIcon
} from 'lucide-react';

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  requiredPermission?: string;
  visible: boolean;
}

export const useOrganizationNavigation = () => {
  const permissions = useEnhancedPermissions();

  return useMemo(() => {
    console.log('useOrganizationNavigation - permissions:', {
      isAdmin: permissions.isAdmin,
      isEmployee: permissions.isEmployee,
      isPartner: permissions.isPartner,
      isSubcontractor: permissions.isSubcontractor
    });

    // Organization-based navigation
    if (permissions.isAdmin) {
      return [
        { label: 'Dashboard', path: '/admin/dashboard', icon: BarChart3, visible: true },
        { label: 'Work Orders', path: '/admin/work-orders', icon: ClipboardList, visible: permissions.canManageWorkOrders() },
        { label: 'Users', path: '/admin/users', icon: Users, visible: permissions.canManageUsers() },
        { label: 'Organizations', path: '/admin/organizations', icon: Building2, visible: permissions.canManageOrganizations() },
        { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, visible: permissions.canViewFinancialData() },
        { label: 'System Health', path: '/admin/system-health', icon: Activity, visible: permissions.canViewSystemHealth() },
      ];
    } else if (permissions.isEmployee) {
      return [
        { label: 'Dashboard', path: '/admin/employee-dashboard', icon: Home, visible: true },
        { label: 'Work Orders', path: '/admin/work-orders', icon: ClipboardList, visible: permissions.canManageWorkOrders() },
        { label: 'Reports', path: '/admin/reports', icon: FileText, visible: true },
      ];
    } else if (permissions.isPartner) {
      return [
        { label: 'Dashboard', path: '/partner/dashboard', icon: BarChart3, visible: true },
        { label: 'Submit Work Order', path: '/partner/work-orders/new', icon: Plus, visible: true },
        { label: 'View Work Orders', path: '/partner/work-orders', icon: FileText, visible: true },
        { label: 'Locations', path: '/partner/locations', icon: MapPin, visible: true },
        { label: 'Reports', path: '/partner/reports', icon: ClipboardList, visible: true },
        { label: 'Profile', path: '/partner/profile', icon: User, visible: true },
      ];
    } else if (permissions.isSubcontractor) {
      return [
        { label: 'Dashboard', path: '/subcontractor/dashboard', icon: Home, visible: true },
        { label: 'Work Orders', path: '/subcontractor/work-orders', icon: ClipboardList, visible: true },
        { label: 'Submit Invoice', path: '/subcontractor/submit-invoice', icon: FileText, visible: true },
        { label: 'Invoices', path: '/subcontractor/invoices', icon: Receipt, visible: true },
        { label: 'Report History', path: '/subcontractor/reports', icon: History, visible: true },
        { label: 'Profile', path: '/subcontractor/profile', icon: User, visible: true },
      ];
    }

    console.log('useOrganizationNavigation - No matching permissions found, returning empty array');
    return [];
  }, [permissions]);
};