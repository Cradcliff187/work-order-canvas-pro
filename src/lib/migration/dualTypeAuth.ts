/**
 * Dual Type Authentication Utilities
 * Provides backward compatibility during migration from user_type to organization-based auth
 */

import type { OrganizationType, OrganizationRole, OrganizationMember } from '@/types/auth.types';
import { isFeatureEnabled } from './featureFlags';

// Legacy user type (temporary during migration)
export type LegacyUserType = 'admin' | 'partner' | 'subcontractor' | 'employee';

// Dual-compatible user interface
export interface DualCompatUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  // Legacy fields (will be phased out)
  user_type?: LegacyUserType;
  // New organization fields
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
 * Gets the effective user type - uses organization data if available, falls back to legacy
 */
export const getEffectiveUserType = (user: DualCompatUser): LegacyUserType => {
  if (isFeatureEnabled('useOrganizationAuth') && user.primary_organization) {
    return mapOrganizationToLegacy(
      user.primary_organization.organization!.organization_type,
      user.primary_organization.role
    );
  }
  return user.user_type || 'subcontractor';
};

/**
 * Permission checking that works with both old and new systems
 */
export const dualPermissionCheck = {
  isAdmin: (user: DualCompatUser): boolean => {
    if (isFeatureEnabled('useOrganizationPermissions') && user.primary_organization) {
      return user.primary_organization.organization?.organization_type === 'internal' &&
             user.primary_organization.role === 'admin';
    }
    return user.user_type === 'admin';
  },

  isEmployee: (user: DualCompatUser): boolean => {
    if (isFeatureEnabled('useOrganizationPermissions') && user.primary_organization) {
      return user.primary_organization.organization?.organization_type === 'internal' &&
             user.primary_organization.role === 'employee';
    }
    return user.user_type === 'employee';
  },

  isPartner: (user: DualCompatUser): boolean => {
    if (isFeatureEnabled('useOrganizationPermissions') && user.primary_organization) {
      return user.primary_organization.organization?.organization_type === 'partner';
    }
    return user.user_type === 'partner';
  },

  isSubcontractor: (user: DualCompatUser): boolean => {
    if (isFeatureEnabled('useOrganizationPermissions') && user.primary_organization) {
      return user.primary_organization.organization?.organization_type === 'subcontractor';
    }
    return user.user_type === 'subcontractor';
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