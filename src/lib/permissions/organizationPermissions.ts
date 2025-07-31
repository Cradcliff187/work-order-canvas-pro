/**
 * Organization-Based Permission System
 * Pure organization logic - no legacy compatibility
 */

import type { OrganizationMember, OrganizationType, OrganizationRole } from '@/types/auth.types';

/**
 * User type checking based on organization membership
 * These functions replicate the exact logic from useUserProfile
 */
export const organizationCheckers = {
  isAdmin: (internalMembership?: OrganizationMember): boolean => {
    return internalMembership?.role === 'admin';
  },

  isEmployee: (internalMembership?: OrganizationMember): boolean => {
    return internalMembership && ['employee', 'manager'].includes(internalMembership.role);
  },

  isPartner: (partnerMemberships: OrganizationMember[]): boolean => {
    return partnerMemberships.length > 0;
  },

  isSubcontractor: (subcontractorMemberships: OrganizationMember[]): boolean => {
    return subcontractorMemberships.length > 0;
  }
};

/**
 * Permission checking that matches useUserProfile.hasPermission exactly
 */
export function hasOrganizationPermission(
  requiredRole: 'admin' | 'partner' | 'subcontractor' | 'employee',
  internalMembership?: OrganizationMember,
  partnerMemberships: OrganizationMember[] = [],
  subcontractorMemberships: OrganizationMember[] = []
): boolean {
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = organizationCheckers;
  
  switch (requiredRole) {
    case 'admin':
      return isAdmin(internalMembership);
    case 'employee':
      return isAdmin(internalMembership) || isEmployee(internalMembership);
    case 'partner':
      return isAdmin(internalMembership) || isEmployee(internalMembership) || isPartner(partnerMemberships);
    case 'subcontractor':
      return true; // All authenticated users can access subcontractor features
    default:
      return false;
  }
}

/**
 * Determines primary role based on organization memberships
 * Matches useUserProfile.getPrimaryRole exactly
 */
export function getPrimaryRole(
  internalMembership?: OrganizationMember,
  partnerMemberships: OrganizationMember[] = [],
  subcontractorMemberships: OrganizationMember[] = []
): string | null {
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = organizationCheckers;
  
  if (isAdmin(internalMembership)) return 'admin';
  if (isEmployee(internalMembership)) return 'employee';
  if (isPartner(partnerMemberships)) return 'partner';
  if (isSubcontractor(subcontractorMemberships)) return 'subcontractor';
  return null;
}

/**
 * Filters organization memberships by type
 */
export function filterMembershipsByType(
  memberships: OrganizationMember[],
  organizationType: OrganizationType
): OrganizationMember[] {
  return memberships.filter(org => 
    org.organization?.organization_type === organizationType
  );
}

/**
 * Gets internal organization membership (for admin/employee roles)
 */
export function getInternalMembership(
  memberships: OrganizationMember[]
): OrganizationMember | undefined {
  return memberships.find(org => 
    org.organization?.organization_type === 'internal'
  );
}