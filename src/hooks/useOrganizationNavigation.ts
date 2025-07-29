import { useMemo } from 'react';
import { useEnhancedPermissions } from '@/hooks/useEnhancedPermissions';
import { isFeatureEnabled } from '@/lib/migration/featureFlags';

export interface NavigationItem {
  label: string;
  path: string;
  icon?: string;
  requiredPermission?: string;
  visible: boolean;
}

export const useOrganizationNavigation = () => {
  const permissions = useEnhancedPermissions();
  const useOrgNavigation = isFeatureEnabled('useOrganizationNavigation');

  return useMemo(() => {
    if (useOrgNavigation) {
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
          { label: 'Submit Work Order', path: '/partner/submit', visible: true },
          { label: 'Work Orders', path: '/partner/work-orders', visible: true },
          { label: 'Reports', path: '/partner/reports', visible: true },
        ];
      } else if (permissions.isSubcontractor) {
        return [
          { label: 'Dashboard', path: '/subcontractor/dashboard', visible: true },
          { label: 'Work Orders', path: '/subcontractor/work-orders', visible: true },
          { label: 'Submit Report', path: '/subcontractor/submit-report', visible: true },
          { label: 'Invoices', path: '/subcontractor/invoices', visible: true },
        ];
      }
    }

    return [];
  }, [permissions, useOrgNavigation]);
};