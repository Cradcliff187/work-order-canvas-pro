/**
 * Organization-Based Permission System
 * Unified permission system using organization memberships
 */

// Export types
export type { 
  EnhancedUser, 
  LegacyUserType, 
  PermissionContext, 
  PermissionResult 
} from './types';
export { Permission } from './types';

// Export utilities
export {
  getUserType,
  mapOrganizationToUserType,
  mapUserTypeToOrganization,
  userTypeCheckers,
  getUserOrganizations,
  getPrimaryOrganization,
  getUserOrganizationsByType,
  createEnhancedUser
} from './userUtils';

// Export permission engine
export {
  hasPermission,
  hasContextualPermission,
  permissionCheckers
} from './permissionEngine';

// Core imports
import { 
  userTypeCheckers, 
  createEnhancedUser, 
  getUserType 
} from './userUtils';
import { permissionCheckers, hasPermission } from './permissionEngine';
import type { LegacyUserType, Permission, PermissionContext } from './types';

// User type checking functions
export function isAdmin(user: any): boolean {
  if (!user) return false;
  return userTypeCheckers.isAdmin(createEnhancedUser(user));
}

export function isEmployee(user: any): boolean {
  if (!user) return false;
  return userTypeCheckers.isEmployee(createEnhancedUser(user));
}

export function isPartner(user: any): boolean {
  if (!user) return false;
  return userTypeCheckers.isPartner(createEnhancedUser(user));
}

export function isSubcontractor(user: any): boolean {
  if (!user) return false;
  return userTypeCheckers.isSubcontractor(createEnhancedUser(user));
}

export function hasInternalAccess(user: any): boolean {
  if (!user) return false;
  return userTypeCheckers.hasInternalAccess(createEnhancedUser(user));
}

// Permission checking functions
export function canManageUsers(user: any): boolean {
  if (!user) return false;
  return permissionCheckers.canManageUsers(createEnhancedUser(user));
}

export function canManageWorkOrders(user: any): boolean {
  if (!user) return false;
  return permissionCheckers.canManageWorkOrders(createEnhancedUser(user));
}

export function canViewFinancialData(user: any): boolean {
  if (!user) return false;
  return permissionCheckers.canViewFinancialData(createEnhancedUser(user));
}

export function canViewSystemHealth(user: any): boolean {
  if (!user) return false;
  return permissionCheckers.canViewSystemHealth(createEnhancedUser(user));
}

/**
 * Enhanced user profile hook for organization-based permissions
 */
export function useEnhancedUserProfile(profile: any, organizationData?: any) {
  if (!profile) {
    return {
      user: null,
      isAdmin: false,
      isEmployee: false,
      isPartner: false,
      isSubcontractor: false,
      hasInternalAccess: false,
      getUserType: () => 'subcontractor' as LegacyUserType,
      canManageUsers: false,
      canManageWorkOrders: false,
      canViewFinancialData: false,
    };
  }

  const enhancedUser = createEnhancedUser(profile, organizationData);

  return {
    user: enhancedUser,
    
    // Type checking functions
    isAdmin: userTypeCheckers.isAdmin(enhancedUser),
    isEmployee: userTypeCheckers.isEmployee(enhancedUser),
    isPartner: userTypeCheckers.isPartner(enhancedUser),
    isSubcontractor: userTypeCheckers.isSubcontractor(enhancedUser),
    hasInternalAccess: userTypeCheckers.hasInternalAccess(enhancedUser),
    
    // Utility functions
    getUserType: () => getUserType(enhancedUser),
    
    // Permission checking
    canManageUsers: permissionCheckers.canManageUsers(enhancedUser),
    canManageWorkOrders: permissionCheckers.canManageWorkOrders(enhancedUser),
    canViewFinancialData: permissionCheckers.canViewFinancialData(enhancedUser),
    canViewSystemHealth: permissionCheckers.canViewSystemHealth(enhancedUser),
    canManageOrganizations: permissionCheckers.canManageOrganizations(enhancedUser),
    
    // Advanced permission checking
    hasPermission: (permission: Permission, context?: Partial<PermissionContext>) =>
      hasPermission(enhancedUser, permission, context),
  };
}