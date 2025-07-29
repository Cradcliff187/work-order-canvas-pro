/**
 * Enhanced Permissions Hook
 * Drop-in replacement for useUserProfile that supports the new permission system
 */

import { useAuth } from '@/contexts/AuthContext';
import { userTypeCheckers, createEnhancedUser, getUserType } from '@/lib/permissions/userUtils';
import { Permission, hasPermission, permissionCheckers } from '@/lib/permissions';
import type { PermissionContext } from '@/lib/permissions';

/**
 * Enhanced permissions hook that provides unified access to organization-based permissions
 */
export function useEnhancedPermissions() {
  const { profile, loading, isImpersonating, userOrganizations } = useAuth();
  
  // Create enhanced user for permission checking
  const enhancedUser = profile ? createEnhancedUser(profile, userOrganizations) : null;

  return {
    // User information
    profile,
    user: enhancedUser,
    userType: enhancedUser ? getUserType(enhancedUser) : 'subcontractor',
    
    // Basic type checks
    isAdmin: enhancedUser ? userTypeCheckers.isAdmin(enhancedUser) : false,
    isEmployee: enhancedUser ? userTypeCheckers.isEmployee(enhancedUser) : false,
    isPartner: enhancedUser ? userTypeCheckers.isPartner(enhancedUser) : false,
    isSubcontractor: enhancedUser ? userTypeCheckers.isSubcontractor(enhancedUser) : false,
    hasInternalAccess: enhancedUser ? userTypeCheckers.hasInternalAccess(enhancedUser) : false,
    
    // Permission checking functions
    canManageUsers: enhancedUser ? permissionCheckers.canManageUsers(enhancedUser) : false,
    canManageWorkOrders: enhancedUser ? permissionCheckers.canManageWorkOrders(enhancedUser) : false,
    canViewFinancialData: enhancedUser ? permissionCheckers.canViewFinancialData(enhancedUser) : false,
    canViewSystemHealth: enhancedUser ? permissionCheckers.canViewSystemHealth(enhancedUser) : false,
    canManageOrganizations: enhancedUser ? permissionCheckers.canManageOrganizations(enhancedUser) : false,
    
    // Advanced permission checking
    hasPermission: (permission: Permission, context?: Partial<PermissionContext>) => {
      return enhancedUser ? hasPermission(enhancedUser, permission, context) : { hasAccess: false, reason: 'No user' };
    },
    
    // Legacy compatibility method
    hasLegacyPermission: (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
      if (!profile || !enhancedUser) return false;
      
      const userTypeHierarchy = {
        'admin': 4,
        'employee': 3,
        'partner': 2,
        'subcontractor': 1
      };

      const currentUserType = getUserType(enhancedUser);
      const userLevel = userTypeHierarchy[currentUserType as keyof typeof userTypeHierarchy];
      const requiredLevel = userTypeHierarchy[requiredUserType];

      return userLevel >= requiredLevel;
    },
    
    // Utility function for checking specific permissions with context
    checkPermission: (permission: Permission, context?: Partial<PermissionContext>) => {
      return enhancedUser ? hasPermission(enhancedUser, permission, context) : { hasAccess: false, reason: 'No user' };
    },
    
    // Migration state (always true now)
    isUsingOrganizationAuth: true,
    isUsingOrganizationPermissions: true,
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