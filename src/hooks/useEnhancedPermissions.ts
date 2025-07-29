/**
 * Enhanced Permissions Hook
 * Drop-in replacement for useUserProfile that supports the new permission system
 */

import { useMigrationContext } from '@/components/MigrationWrapper';
import { Permission } from '@/lib/permissions';
import type { PermissionContext } from '@/lib/permissions';

/**
 * Enhanced permissions hook that provides unified access to both legacy and new permission systems
 */
export function useEnhancedPermissions() {
  const { enhancedPermissions, permissions, migrationFlags, legacyProfile } = useMigrationContext();

  return {
    // User information
    profile: legacyProfile,
    user: enhancedPermissions.user,
    userType: enhancedPermissions.getUserType(),
    
    // Basic type checks (works with both systems)
    isAdmin: enhancedPermissions.isAdmin,
    isEmployee: enhancedPermissions.isEmployee,
    isPartner: enhancedPermissions.isPartner,
    isSubcontractor: enhancedPermissions.isSubcontractor,
    hasInternalAccess: enhancedPermissions.hasInternalAccess,
    
    // Permission checking functions
    canManageUsers: enhancedPermissions.canManageUsers,
    canManageWorkOrders: enhancedPermissions.canManageWorkOrders,
    canViewFinancialData: enhancedPermissions.canViewFinancialData,
    canViewSystemHealth: enhancedPermissions.canViewSystemHealth,
    canManageOrganizations: enhancedPermissions.canManageOrganizations,
    
    // Advanced permission checking
    hasPermission: enhancedPermissions.hasPermission,
    
    // Legacy compatibility method
    hasLegacyPermission: (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
      const userTypeHierarchy = {
        'admin': 4,
        'employee': 3,
        'partner': 2,
        'subcontractor': 1
      };

      const userLevel = userTypeHierarchy[enhancedPermissions.getUserType() as keyof typeof userTypeHierarchy];
      const requiredLevel = userTypeHierarchy[requiredUserType];

      return userLevel >= requiredLevel;
    },
    
    // Utility function for checking specific permissions with context
    checkPermission: (permission: Permission, context?: Partial<PermissionContext>) => {
      return enhancedPermissions.hasPermission(permission, context);
    },
    
    // Migration state
    isUsingOrganizationAuth: migrationFlags.useOrganizationAuth,
    isUsingOrganizationPermissions: migrationFlags.useOrganizationPermissions,
  };
}

/**
 * Legacy-compatible hook that can be used as drop-in replacement for useUserProfile
 */
export function useUserProfileCompat() {
  const enhanced = useEnhancedPermissions();
  
  return {
    profile: enhanced.profile,
    loading: false, // Migration wrapper handles loading
    isAdmin: enhanced.isAdmin,
    isEmployee: enhanced.isEmployee,
    isPartner: enhanced.isPartner,
    isSubcontractor: enhanced.isSubcontractor,
    hasPermission: enhanced.hasLegacyPermission,
    userType: enhanced.userType,
    isImpersonating: false, // Would need to be passed from context if needed
  };
}