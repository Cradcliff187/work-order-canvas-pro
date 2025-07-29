/**
 * Organization-based authentication hook
 * Provides organization-based interface - migration to organization system complete
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
    
    // Organization system is now active (migration complete)
    isUsingOrganizationAuth: true,
    migrationFlags: {
      useOrganizationAuth: true,
      useOrganizationPermissions: true,
      useOrganizationNavigation: true,
      useOrganizationWorkOrders: true,
      useOrganizationAuthentication: true,
    },
    
    // Legacy compatibility (for components not yet migrated)
    profile, // Direct access to legacy profile
    userOrganization, // Direct access to legacy organization
  };
};