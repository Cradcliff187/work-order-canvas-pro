// Simplified permissions hook for organization-based auth
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';

export const useEnhancedPermissions = () => {
  const { user, userOrganizations } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();

  // Create enhanced user object with organization memberships - memoized to prevent re-renders
  const enhancedUser = useMemo(() => 
    user ? { ...user, organization_members: userOrganizations } : null,
    [user, userOrganizations]
  );

  // Memoize computed values to prevent function recreation on each render
  const computedPermissions = useMemo(() => {
    const adminCheck = isAdmin();
    const employeeCheck = isEmployee();
    const partnerCheck = isPartner();
    const subcontractorCheck = isSubcontractor();

    return {
      isAdmin: adminCheck,
      isEmployee: employeeCheck,
      isPartner: partnerCheck,
      isSubcontractor: subcontractorCheck,
      hasInternalAccess: () => adminCheck || employeeCheck,
      hasPartnerAccess: () => partnerCheck || adminCheck || employeeCheck,
      canManageWorkOrders: () => adminCheck || employeeCheck,
      canManageUsers: () => adminCheck,
      canManageOrganizations: () => adminCheck,
      canViewFinancialData: () => adminCheck || employeeCheck,
      canViewSystemHealth: () => adminCheck,
      isImpersonating: false, // No impersonation in new system
    };
  }, [isAdmin, isEmployee, isPartner, isSubcontractor]);

  return {
    user: enhancedUser,
    ...computedPermissions,
  };
};