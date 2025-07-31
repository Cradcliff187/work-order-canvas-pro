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
  
  // Get organization memberships for permission checking
  const internalMembership = getInternalMembership(userOrganizations);
  const partnerMemberships = filterMembershipsByType(userOrganizations, 'partner');
  const subcontractorMemberships = filterMembershipsByType(userOrganizations, 'subcontractor');

  // Pure organization-based permission checks using clean library
  const isAdmin = () => organizationCheckers.isAdmin(internalMembership);
  const isEmployee = () => organizationCheckers.isEmployee(internalMembership);
  const isPartner = () => organizationCheckers.isPartner(partnerMemberships);
  const isSubcontractor = () => organizationCheckers.isSubcontractor(subcontractorMemberships);

  const hasPermission = (requiredRole: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
    if (!profile) return false;
    
    return hasOrganizationPermission(
      requiredRole,
      internalMembership,
      partnerMemberships,
      subcontractorMemberships
    );
  };

  // Determine primary role based on organization memberships
  const getUserPrimaryRole = () => {
    return getPrimaryRole(internalMembership, partnerMemberships, subcontractorMemberships);
  };

  return {
    profile,
    loading,
    isAdmin,
    isEmployee,
    isPartner,
    isSubcontractor,
    hasPermission,
    userType: getUserPrimaryRole(), // Keep for backward compatibility
    primaryRole: getUserPrimaryRole(),
    internalMembership,
    partnerMemberships,
    subcontractorMemberships,
    isImpersonating: false
  };
};