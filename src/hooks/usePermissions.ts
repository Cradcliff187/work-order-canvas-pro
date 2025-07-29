/**
 * Phase 2: Enhanced Permissions Hook
 * Demonstrates how to use the new permission system in components
 */

import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationBridge } from './useOrganizationBridge';
import { useEnhancedUserProfile, Permission, type PermissionContext } from '@/lib/permissions';

/**
 * Main permissions hook that provides both legacy and organization-based permission checking
 */
export function usePermissions() {
  const { profile } = useAuth();
  const { organizationMemberships, primaryOrganization } = useOrganizationBridge(profile?.id);

  // Create enhanced user profile with organization data
  const enhancedProfile = useEnhancedUserProfile(profile, organizationMemberships);

  // Return comprehensive permission interface
  return {
    // User information
    user: enhancedProfile.user,
    userType: enhancedProfile.getUserType(),
    
    // Basic type checks (legacy compatible)
    isAdmin: enhancedProfile.isAdmin,
    isEmployee: enhancedProfile.isEmployee,
    isPartner: enhancedProfile.isPartner,
    isSubcontractor: enhancedProfile.isSubcontractor,
    hasInternalAccess: enhancedProfile.hasInternalAccess,
    
    // Organization information
    primaryOrganization,
    organizations: organizationMemberships,
    
    // Permission checking functions
    canManageUsers: enhancedProfile.canManageUsers,
    canManageWorkOrders: enhancedProfile.canManageWorkOrders,
    canViewFinancialData: enhancedProfile.canViewFinancialData,
    canViewSystemHealth: enhancedProfile.canViewSystemHealth,
    canManageOrganizations: enhancedProfile.canManageOrganizations,
    
    // Advanced permission checking
    hasPermission: enhancedProfile.hasPermission,
    
    // Utility function for checking specific permissions
    checkPermission: (permission: Permission, context?: Partial<PermissionContext>) => {
      return enhancedProfile.hasPermission(permission, context);
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
    
    // Legacy permission methods
    hasPermission: (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
      const userTypeHierarchy = {
        'admin': 4,
        'employee': 3,
        'partner': 2,
        'subcontractor': 1
      };

      const userLevel = userTypeHierarchy[permissions.userType as keyof typeof userTypeHierarchy];
      const requiredLevel = userTypeHierarchy[requiredUserType];

      return userLevel >= requiredLevel;
    },
  };
}