/**
 * Migration-aware authentication hook
 * Provides unified interface during the migration from user_type to organization-based auth
 */

import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationBridge } from './useOrganizationBridge';
import type { DualCompatUser, LegacyUserType } from '@/lib/migration/dualTypeAuth';
import { getEffectiveUserType, dualPermissionCheck } from '@/lib/migration/dualTypeAuth';
import { isFeatureEnabled } from '@/lib/migration/featureFlags';

export const useMigrationAuth = () => {
  const { profile, userOrganization, loading } = useAuth();
  const { 
    organizationMemberships, 
    primaryOrganization, 
    isLoading: orgLoading 
  } = useOrganizationBridge(profile?.id);

  // Create dual-compatible user object
  const dualUser: DualCompatUser | null = profile ? {
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    user_type: undefined, // Derived from organization data
    organization_memberships: organizationMemberships,
    primary_organization: primaryOrganization,
  } : null;

  const effectiveUserType = dualUser ? getEffectiveUserType(dualUser) : null;

  return {
    // Core auth state
    user: dualUser,
    loading: loading || orgLoading,
    effectiveUserType,
    
    // Dual-compatible permission checks
    isAdmin: dualUser ? dualPermissionCheck.isAdmin(dualUser) : false,
    isEmployee: dualUser ? dualPermissionCheck.isEmployee(dualUser) : false,
    isPartner: dualUser ? dualPermissionCheck.isPartner(dualUser) : false,
    isSubcontractor: dualUser ? dualPermissionCheck.isSubcontractor(dualUser) : false,
    hasInternalAccess: dualUser ? dualPermissionCheck.hasInternalAccess(dualUser) : false,
    canManageUsers: dualUser ? dualPermissionCheck.canManageUsers(dualUser) : false,
    canViewFinancials: dualUser ? dualPermissionCheck.canViewFinancials(dualUser) : false,
    
    // Migration state
    isUsingOrganizationAuth: isFeatureEnabled('useOrganizationAuth'),
    migrationFlags: {
      useOrganizationAuth: isFeatureEnabled('useOrganizationAuth'),
      useOrganizationPermissions: isFeatureEnabled('useOrganizationPermissions'),
      useOrganizationNavigation: isFeatureEnabled('useOrganizationNavigation'),
      useOrganizationWorkOrders: isFeatureEnabled('useOrganizationWorkOrders'),
      useOrganizationAuthentication: isFeatureEnabled('useOrganizationAuthentication'),
    },
    
    // Legacy compatibility (for components not yet migrated)
    profile, // Direct access to legacy profile
    userOrganization, // Direct access to legacy organization
  };
};