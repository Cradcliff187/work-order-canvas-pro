import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  organizationCheckers, 
  hasOrganizationPermission, 
  getPrimaryRole,
  filterMembershipsByType,
  getInternalMembership
} from '@/lib/permissions';

// ORGANIZATION-BASED: Pure organization role system using clean permission library
export const useUserProfile = () => {
  const { profile, loading, userOrganizations } = useAuth();
  
  // Memoize organization memberships for stable references
  const memberships = useMemo(() => ({
    internal: getInternalMembership(userOrganizations),
    partner: filterMembershipsByType(userOrganizations, 'partner'),
    subcontractor: filterMembershipsByType(userOrganizations, 'subcontractor')
  }), [userOrganizations]);

  // Memoize permission checks to prevent unnecessary re-computations
  const permissionChecks = useMemo(() => ({
    isAdmin: organizationCheckers.isAdmin(memberships.internal),
    isEmployee: organizationCheckers.isEmployee(memberships.internal),
    isPartner: organizationCheckers.isPartner(memberships.partner),
    isSubcontractor: organizationCheckers.isSubcontractor(memberships.subcontractor)
  }), [memberships]);

  // Stable permission function references
  const isAdmin = useCallback(() => permissionChecks.isAdmin, [permissionChecks.isAdmin]);
  const isEmployee = useCallback(() => permissionChecks.isEmployee, [permissionChecks.isEmployee]);
  const isPartner = useCallback(() => permissionChecks.isPartner, [permissionChecks.isPartner]);
  const isSubcontractor = useCallback(() => permissionChecks.isSubcontractor, [permissionChecks.isSubcontractor]);

  const hasPermission = useCallback((requiredRole: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
    if (!profile) return false;
    
    return hasOrganizationPermission(
      requiredRole,
      memberships.internal,
      memberships.partner,
      memberships.subcontractor
    );
  }, [profile, memberships]);

  // Determine primary role based on organization memberships
  const getUserPrimaryRole = useCallback(() => {
    return getPrimaryRole(memberships.internal, memberships.partner, memberships.subcontractor);
  }, [memberships]);

  return useMemo(() => ({
    profile,
    loading,
    isAdmin,
    isEmployee,
    isPartner,
    isSubcontractor,
    hasPermission,
    userType: getUserPrimaryRole(), // Backward compatibility
    primaryRole: getUserPrimaryRole(),
    internalMembership: memberships.internal,
    partnerMemberships: memberships.partner,
    subcontractorMemberships: memberships.subcontractor,
    isImpersonating: false
  }), [
    profile,
    loading,
    isAdmin,
    isEmployee,
    isPartner,
    isSubcontractor,
    hasPermission,
    getUserPrimaryRole,
    memberships
  ]);
};