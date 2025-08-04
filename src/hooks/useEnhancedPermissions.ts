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

  // Memoize role checks to prevent recreation
  const roleChecks = useMemo(() => ({
    isAdmin: isAdmin(),
    isEmployee: isEmployee(),
    isPartner: isPartner(),
    isSubcontractor: isSubcontractor(),
  }), [isAdmin, isEmployee, isPartner, isSubcontractor]);

  // Memoize permission functions with stable references
  const permissionFunctions = useMemo(() => ({
    hasInternalAccess: () => roleChecks.isAdmin || roleChecks.isEmployee,
    hasPartnerAccess: () => roleChecks.isPartner || roleChecks.isAdmin || roleChecks.isEmployee,
    canManageWorkOrders: () => roleChecks.isAdmin || roleChecks.isEmployee,
    canManageUsers: () => roleChecks.isAdmin,
    canManageOrganizations: () => roleChecks.isAdmin,
    canViewFinancialData: () => roleChecks.isAdmin || roleChecks.isEmployee,
    canViewSystemHealth: () => roleChecks.isAdmin,
  }), [roleChecks]);

  // Combine all computed values
  const computedPermissions = useMemo(() => ({
    ...roleChecks,
    ...permissionFunctions,
    isImpersonating: false, // No impersonation in new system
  }), [roleChecks, permissionFunctions]);

  return {
    user: enhancedUser,
    ...computedPermissions,
  };
};