/**
 * Phase 2: User Utility Functions
 * Provides backward-compatible user type determination and organization analysis
 */

import type { EnhancedUser, LegacyUserType } from './types';
import type { OrganizationType, OrganizationRole, OrganizationMember } from '@/types/auth.types';
import { isFeatureEnabled } from '../migration/featureFlags';

/**
 * Gets the effective user type - prefers organization data when available
 */
export function getUserType(user: EnhancedUser): LegacyUserType {
  // If organization-based auth is enabled and user has organization data
  if (isFeatureEnabled('useOrganizationAuth') && user.primary_organization?.organization) {
    return mapOrganizationToUserType(
      user.primary_organization.organization.organization_type,
      user.primary_organization.role
    );
  }
  
  // Fall back to legacy user_type
  return user.user_type || 'subcontractor';
}

/**
 * Maps organization type and role to legacy user type
 */
export function mapOrganizationToUserType(
  orgType: OrganizationType,
  role: OrganizationRole
): LegacyUserType {
  switch (orgType) {
    case 'internal':
      return role === 'admin' ? 'admin' : 'employee';
    case 'partner':
      return 'partner';
    case 'subcontractor':
      return 'subcontractor';
    default:
      return 'subcontractor';
  }
}

/**
 * Maps legacy user type to organization type and role
 */
export function mapUserTypeToOrganization(userType: LegacyUserType): {
  organizationType: OrganizationType;
  role: OrganizationRole;
} {
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
}

/**
 * Enhanced user type checking functions
 */
export const userTypeCheckers = {
  isAdmin: (user: EnhancedUser): boolean => {
    if (isFeatureEnabled('useOrganizationPermissions') && user.primary_organization) {
      return user.primary_organization.organization?.organization_type === 'internal' &&
             user.primary_organization.role === 'admin';
    }
    return getUserType(user) === 'admin';
  },

  isEmployee: (user: EnhancedUser): boolean => {
    if (isFeatureEnabled('useOrganizationPermissions') && user.primary_organization) {
      return user.primary_organization.organization?.organization_type === 'internal' &&
             user.primary_organization.role === 'employee';
    }
    return getUserType(user) === 'employee';
  },

  isPartner: (user: EnhancedUser): boolean => {
    if (isFeatureEnabled('useOrganizationPermissions') && user.primary_organization) {
      return user.primary_organization.organization?.organization_type === 'partner';
    }
    return getUserType(user) === 'partner';
  },

  isSubcontractor: (user: EnhancedUser): boolean => {
    if (isFeatureEnabled('useOrganizationPermissions') && user.primary_organization) {
      return user.primary_organization.organization?.organization_type === 'subcontractor';
    }
    return getUserType(user) === 'subcontractor';
  },

  hasInternalAccess: (user: EnhancedUser): boolean => {
    return userTypeCheckers.isAdmin(user) || userTypeCheckers.isEmployee(user);
  },

  hasPartnerAccess: (user: EnhancedUser): boolean => {
    return userTypeCheckers.isPartner(user) || userTypeCheckers.hasInternalAccess(user);
  }
};

/**
 * Organization analysis functions
 */
export function getUserOrganizations(user: EnhancedUser): OrganizationMember[] {
  return user.organization_memberships || [];
}

export function getPrimaryOrganization(user: EnhancedUser): OrganizationMember | null {
  if (user.primary_organization) {
    return user.primary_organization;
  }
  
  // Fallback: find internal org first, then first available
  const orgs = getUserOrganizations(user);
  const internalOrg = orgs.find(org => org.organization?.organization_type === 'internal');
  return internalOrg || orgs[0] || null;
}

export function getUserOrganizationsByType(
  user: EnhancedUser,
  orgType: OrganizationType
): OrganizationMember[] {
  return getUserOrganizations(user).filter(
    org => org.organization?.organization_type === orgType
  );
}

/**
 * Enhanced user factory - normalizes different user data sources
 */
export function createEnhancedUser(
  profileData: any,
  organizationData?: OrganizationMember[]
): EnhancedUser {
  // Handle potential error states in profile data
  if (!profileData || typeof profileData === 'string' || profileData.error) {
    return {
      id: '',
      user_id: '',
      email: '',
      first_name: '',
      last_name: '',
      is_active: false,
      is_employee: false,
      user_type: 'subcontractor',
      organization_memberships: [],
      primary_organization: null,
      effective_user_type: 'subcontractor',
      has_internal_access: false,
      has_admin_access: false,
    };
  }

  const organizations = organizationData || profileData.organization_memberships || [];
  const primaryOrg = organizations.find(org => org.organization?.organization_type === 'internal') || 
                     organizations[0] || null;

  const enhancedUser: EnhancedUser = {
    ...profileData,
    organization_memberships: organizations,
    primary_organization: primaryOrg,
  };

  // Compute derived properties
  enhancedUser.effective_user_type = getUserType(enhancedUser);
  enhancedUser.has_internal_access = userTypeCheckers.hasInternalAccess(enhancedUser);
  enhancedUser.has_admin_access = userTypeCheckers.isAdmin(enhancedUser);

  return enhancedUser;
}