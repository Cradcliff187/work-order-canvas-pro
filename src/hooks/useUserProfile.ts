import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  organizationCheckers, 
  hasOrganizationPermission, 
  getPrimaryRole,
  filterMembershipsByType,
  getInternalMembership
} from '@/lib/permissions';

const previousMembershipsRef = { current: null };

// ORGANIZATION-BASED: Pure organization role system using clean permission library
export const useUserProfile = () => {
  const renderTime = Date.now();
  console.log('[USER-PROFILE] Start Render', {
    renderTime,
    caller: new Error().stack.split('\n')[2] // Shows what called this
  });
  
  const { profile, loading, userOrganizations } = useAuth();
  
  console.log('[USER-PROFILE] Render', {
    profileId: profile?.id,
    orgsLength: userOrganizations?.length
  });
  
  console.log('[USER-PROFILE] Computing memberships', { renderTime });
  // Memoize organization memberships for stable references
  const memberships = useMemo(() => ({
    internal: getInternalMembership(userOrganizations),
    partner: filterMembershipsByType(userOrganizations, 'partner'),
    subcontractor: filterMembershipsByType(userOrganizations, 'subcontractor')
  }), [userOrganizations]);

  console.log('[USER-PROFILE] Computing permissionChecks', { renderTime });
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

  console.log('[USER-PROFILE] End Render', { 
    renderTime,
    didMembershipsChange: !Object.is(memberships, previousMembershipsRef.current)
  });
  previousMembershipsRef.current = memberships;

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