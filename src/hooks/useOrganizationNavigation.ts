import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  Activity, BarChart3, Building2, ClipboardList, FileChartLine, FileText, HardHat, History, Home, 
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

  // DEBUG: Log user profile checks
  console.log('🔍 [useOrganizationNavigation] isPartner():', isPartner());
  console.log('🔍 [useOrganizationNavigation] isAdmin():', isAdmin());
  console.log('🔍 [useOrganizationNavigation] isEmployee():', isEmployee());
  console.log('🔍 [useOrganizationNavigation] isSubcontractor():', isSubcontractor());

  // Stable navigation items with memoized permission checks
  return useMemo(() => {

    // Organization-based navigation
    if (isAdmin()) {
      return [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, visible: true },
        { label: 'Work Orders', path: '/admin/work-orders', icon: ClipboardList, visible: hasPermission('employee') },
        { label: 'Users', path: '/admin/users', icon: Users, visible: hasPermission('admin') },
        { label: 'Organizations', path: '/admin/organizations', icon: Building2, visible: hasPermission('admin') },
        { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp, visible: hasPermission('employee') },
        { label: 'System Health', path: '/admin/system-health', icon: Activity, visible: hasPermission('admin') },
      ];
    } else if (isEmployee()) {
      return [
        { label: 'Dashboard', path: '/admin/employee-dashboard', icon: HardHat, visible: true },
        { label: 'Work Orders', path: '/admin/work-orders', icon: ClipboardList, visible: hasPermission('employee') },
        { label: 'Reports', path: '/admin/reports', icon: FileChartLine, visible: true },
      ];
    } else if (isPartner()) {
      const partnerNav = [
        { label: 'Dashboard', path: '/partner/dashboard', icon: BarChart3, visible: true },
        { label: 'New Service Request', path: '/partner/work-orders/new', icon: Plus, visible: true },
        { label: 'View Work Orders', path: '/partner/work-orders', icon: ClipboardList, visible: true },
        { label: 'Locations', path: '/partner/locations', icon: MapPin, visible: true },
        { label: 'Reports', path: '/partner/reports', icon: ClipboardList, visible: true },
      ];
      
      // DEBUG: Log partner navigation items
      console.log('🔍 [useOrganizationNavigation] Partner navigation items:', partnerNav);
      
      return partnerNav;
    } else if (isSubcontractor()) {
      return [
        { label: 'Dashboard', path: '/subcontractor/dashboard', icon: LayoutDashboard, visible: true },
        { label: 'Work Orders', path: '/subcontractor/work-orders', icon: ClipboardList, visible: true },
        { label: 'Submit Invoice', path: '/subcontractor/submit-invoice', icon: Receipt, visible: true },
        { label: 'Invoices', path: '/subcontractor/invoices', icon: Receipt, visible: true },
        { label: 'Report History', path: '/subcontractor/reports', icon: FileChartLine, visible: true },
        { label: 'Profile', path: '/subcontractor/profile', icon: User, visible: true },
      ];
    }

    const emptyNav = [];
    
    // DEBUG: Log when no navigation items are returned
    console.log('🔍 [useOrganizationNavigation] No matching user type, returning empty array');
    
    return emptyNav;
  }, [
    isAdmin,
    isEmployee, 
    isPartner,
    isSubcontractor,
    hasPermission
  ]);
};