/**
 * Organization-Based Authentication Utilities
 * Migration complete - provides organization-based authentication only
 */

import type { OrganizationType, OrganizationRole, OrganizationMember } from '@/types/auth.types';
import { isFeatureEnabled } from './featureFlags';

// Legacy user type (temporary during migration)
export type LegacyUserType = 'admin' | 'partner' | 'subcontractor' | 'employee';

// Organization-based user interface (migration complete)
export interface DualCompatUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  // Organization-based fields only
  organization_memberships?: OrganizationMember[];
  primary_organization?: OrganizationMember;
}

/**
 * Maps legacy user_type to organization type and role
 */
export const mapLegacyToOrganization = (userType: LegacyUserType): {
  organizationType: OrganizationType;
  role: OrganizationRole;
} => {
  switch (userType) {
    case 'admin':
      return { organizationType: 'internal', role: 'admin' };
    case 'employee':
      return { organizationType: 'internal', role: 'employee' };
    case 'partner':
      return { organizationType: 'partner', role: 'member' };
    case 'subcontractor':
      return { organizationType: 'subcontractor', role: 'member' };
    default:
      return { organizationType: 'subcontractor', role: 'member' };
  }
};

/**
 * Maps organization membership to legacy user_type for backward compatibility
 */
export const mapOrganizationToLegacy = (
  organizationType: OrganizationType,
  role: OrganizationRole
): LegacyUserType => {
  if (organizationType === 'internal') {
    return role === 'admin' ? 'admin' : 'employee';
  }
  return organizationType === 'partner' ? 'partner' : 'subcontractor';
};

/**
 * Gets the effective user type from organization data
 */
export const getEffectiveUserType = (user: DualCompatUser): LegacyUserType => {
  if (user.primary_organization?.organization) {
    return mapOrganizationToLegacy(
      user.primary_organization.organization.organization_type,
      user.primary_organization.role
    );
  }
  return 'subcontractor';
};

/**
 * Permission checking using organization-based system only
 */
export const dualPermissionCheck = {
  isAdmin: (user: DualCompatUser): boolean => {
    return user.primary_organization?.organization?.organization_type === 'internal' &&
           user.primary_organization.role === 'admin';
  },

  isEmployee: (user: DualCompatUser): boolean => {
    return user.primary_organization?.organization?.organization_type === 'internal' &&
           user.primary_organization.role === 'employee';
  },

  isPartner: (user: DualCompatUser): boolean => {
    return user.primary_organization?.organization?.organization_type === 'partner';
  },

  isSubcontractor: (user: DualCompatUser): boolean => {
    return user.primary_organization?.organization?.organization_type === 'subcontractor';
  },

  hasInternalAccess: (user: DualCompatUser): boolean => {
    return dualPermissionCheck.isAdmin(user) || dualPermissionCheck.isEmployee(user);
  },

  canManageUsers: (user: DualCompatUser): boolean => {
    return dualPermissionCheck.isAdmin(user);
  },

  canViewFinancials: (user: DualCompatUser): boolean => {
    return dualPermissionCheck.hasInternalAccess(user);
  }
};