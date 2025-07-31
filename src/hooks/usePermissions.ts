/**
 * Clean Organization-Based Permissions Hook
 * Uses the clean permission system - no legacy compatibility layers
 */

import { useAuth } from '@/contexts/AuthContext';
import { 
  organizationCheckers,
  hasOrganizationPermission,
  getPrimaryRole,
  filterMembershipsByType,
  getInternalMembership,
  type OrganizationMember
} from '@/lib/permissions';

/**
 * Main permissions hook using clean organization-based system
 */
export function usePermissions() {
  const { profile, userOrganizations } = useAuth();

  // Filter memberships by type
  const internalMembership = getInternalMembership(userOrganizations);
  const partnerMemberships = filterMembershipsByType(userOrganizations, 'partner');
  const subcontractorMemberships = filterMembershipsByType(userOrganizations, 'subcontractor');

  // Role checks
  const isAdmin = organizationCheckers.isAdmin(internalMembership);
  const isEmployee = organizationCheckers.isEmployee(internalMembership);
  const isPartner = organizationCheckers.isPartner(partnerMemberships);
  const isSubcontractor = organizationCheckers.isSubcontractor(subcontractorMemberships);
  
  const userType = getPrimaryRole(internalMembership, partnerMemberships, subcontractorMemberships);
  const hasInternalAccess = isAdmin || isEmployee;

  return {
    // User information
    user: profile,
    userType,
    
    // Basic type checks
    isAdmin,
    isEmployee,
    isPartner,
    isSubcontractor,
    hasInternalAccess,
    
    // Organization information
    primaryOrganization: internalMembership || partnerMemberships[0] || subcontractorMemberships[0] || null,
    organizations: userOrganizations,
    
    // Permission checking functions
    canManageUsers: isAdmin,
    canManageWorkOrders: hasInternalAccess,
    canViewFinancialData: hasInternalAccess,
    canViewSystemHealth: hasInternalAccess,
    canManageOrganizations: isAdmin,
    
    // Core permission checking
    hasPermission: (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
      return hasOrganizationPermission(
        requiredUserType,
        internalMembership,
        partnerMemberships,
        subcontractorMemberships
      );
    },
  };
}

/**
 * Simplified hook for legacy compatibility
 * This can be used as a drop-in replacement for existing useUserProfile calls
 */
export function useUserPermissions() {
  const permissions = usePermissions();
  
  return {
    profile: permissions.user,
    userType: permissions.userType,
    isAdmin: permissions.isAdmin,
    isEmployee: permissions.isEmployee,
    isPartner: permissions.isPartner,
    isSubcontractor: permissions.isSubcontractor,
    hasInternalAccess: permissions.hasInternalAccess,
    
    // Legacy permission methods using clean system
    hasPermission: permissions.hasPermission,
  };
}