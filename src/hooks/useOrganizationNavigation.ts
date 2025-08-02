import { useMemo } from 'react';
import { useEnhancedPermissions } from '@/hooks/useEnhancedPermissions';

export interface NavigationItem {
  label: string;
  path: string;
  icon?: string;
  requiredPermission?: string;
  visible: boolean;
}

export const useOrganizationNavigation = () => {
  const permissions = useEnhancedPermissions();

  return useMemo(() => {
    // Organization-based navigation
    if (permissions.isAdmin) {
      return [
        { label: 'Dashboard', path: '/admin/dashboard', visible: true },
        { label: 'Work Orders', path: '/admin/work-orders', visible: permissions.canManageWorkOrders },
        { label: 'Users', path: '/admin/users', visible: permissions.canManageUsers },
        { label: 'Organizations', path: '/admin/organizations', visible: permissions.canManageOrganizations },
        { label: 'Analytics', path: '/admin/analytics', visible: permissions.canViewFinancialData },
        { label: 'System Health', path: '/admin/system-health', visible: permissions.canViewSystemHealth },
      ];
    } else if (permissions.isEmployee) {
      return [
        { label: 'Dashboard', path: '/admin/employee-dashboard', visible: true },
        { label: 'Work Orders', path: '/admin/work-orders', visible: permissions.canManageWorkOrders },
        { label: 'Reports', path: '/admin/reports', visible: true },
      ];
    } else if (permissions.isPartner) {
      return [
        { label: 'Dashboard', path: '/partner/dashboard', visible: true },
        { label: 'Submit Work Order', path: '/partner/work-orders/new', visible: true },
        { label: 'Work Orders', path: '/partner/work-orders', visible: true },
        { label: 'Locations', path: '/partner/locations', visible: true },
        { label: 'Reports', path: '/partner/reports', visible: true },
        { label: 'Profile', path: '/partner/profile', visible: true },
      ];
    } else if (permissions.isSubcontractor) {
      return [
        { label: 'Dashboard', path: '/subcontractor/dashboard', visible: true },
        { label: 'Work Orders', path: '/subcontractor/work-orders', visible: true },
        { label: 'Submit Invoice', path: '/subcontractor/submit-invoice', visible: true },
        { label: 'Invoices', path: '/subcontractor/invoices', visible: true },
        { label: 'Report History', path: '/subcontractor/reports', visible: true },
        { label: 'Profile', path: '/subcontractor/profile', visible: true },
      ];
    }

    return [];
  }, [permissions]);
};