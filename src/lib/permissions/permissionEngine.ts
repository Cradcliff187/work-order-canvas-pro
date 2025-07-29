/**
 * Phase 2: Permission Engine
 * Central permission checking system that supports both legacy and organization-based permissions
 */

import { EnhancedUser, Permission, PermissionResult, PermissionContext } from './types';
import type { OrganizationType, OrganizationRole } from '@/types/auth.types';
import { userTypeCheckers, getUserType } from './userUtils';
import { isFeatureEnabled } from '../migration/featureFlags';

/**
 * Central permission checking function
 */
export function hasPermission(
  user: EnhancedUser,
  permission: Permission,
  context?: Partial<PermissionContext>
): PermissionResult {
  // Early exit for inactive users
  if (!user.is_active) {
    return {
      granted: false,
      reason: 'User account is inactive',
      context: { method: 'legacy', fallbackUsed: true }
    };
  }

  // Try organization-based permission check first (if enabled)
  if (isFeatureEnabled('useOrganizationPermissions') && user.primary_organization) {
    const orgResult = checkOrganizationPermission(user, permission, context);
    if (orgResult.granted !== undefined) {
      return orgResult;
    }
  }

  // Fall back to legacy permission checking
  return checkLegacyPermission(user, permission, context);
}

/**
 * Organization-based permission checking
 */
function checkOrganizationPermission(
  user: EnhancedUser,
  permission: Permission,
  context?: Partial<PermissionContext>
): PermissionResult {
  const primaryOrg = user.primary_organization;
  if (!primaryOrg?.organization) {
    return {
      granted: false,
      reason: 'No primary organization found',
      context: { method: 'organization', fallbackUsed: true }
    };
  }

  const orgType = primaryOrg.organization.organization_type;
  const role = primaryOrg.role;

  // Check permission based on organization type and role
  const granted = checkPermissionByOrgTypeAndRole(permission, orgType, role);
  
  return {
    granted,
    reason: granted ? undefined : `Insufficient permissions for ${orgType}:${role}`,
    context: {
      method: 'organization',
      organization: primaryOrg,
      fallbackUsed: false
    }
  };
}

/**
 * Legacy user_type-based permission checking
 */
function checkLegacyPermission(
  user: EnhancedUser,
  permission: Permission,
  context?: Partial<PermissionContext>
): PermissionResult {
  const userType = getUserType(user);
  const granted = checkPermissionByUserType(permission, userType);
  
  return {
    granted,
    reason: granted ? undefined : `Insufficient permissions for user type: ${userType}`,
    context: {
      method: 'legacy',
      fallbackUsed: true
    }
  };
}

/**
 * Permission matrix by organization type and role
 */
function checkPermissionByOrgTypeAndRole(
  permission: Permission,
  orgType: OrganizationType,
  role: OrganizationRole
): boolean {
  // Internal organization permissions
  if (orgType === 'internal') {
    switch (role) {
      case 'admin':
        return true; // Admins have all permissions
      
      case 'manager':
        return ![
          Permission.MANAGE_USERS,
          Permission.MANAGE_ORGANIZATIONS,
          Permission.MANAGE_SYSTEM_SETTINGS
        ].includes(permission);
      
      case 'employee':
        return [
          Permission.VIEW_ALL_WORK_ORDERS,
          Permission.MANAGE_WORK_ORDERS,
          Permission.VIEW_ALL_REPORTS,
          Permission.VIEW_SYSTEM_HEALTH
        ].includes(permission);
      
      default:
        return false;
    }
  }

  // Partner organization permissions
  if (orgType === 'partner') {
    return [
      // Partners can only view and manage their own work orders
    ].includes(permission);
  }

  // Subcontractor organization permissions
  if (orgType === 'subcontractor') {
    return [
      // Subcontractors can only view assigned work orders
    ].includes(permission);
  }

  return false;
}

/**
 * Legacy permission matrix by user type
 */
function checkPermissionByUserType(permission: Permission, userType: string): boolean {
  switch (userType) {
    case 'admin':
      return true; // Admins have all permissions
    
    case 'employee':
      return [
        Permission.VIEW_ALL_WORK_ORDERS,
        Permission.MANAGE_WORK_ORDERS,
        Permission.ASSIGN_WORK_ORDERS,
        Permission.VIEW_ALL_REPORTS,
        Permission.MANAGE_REPORTS,
        Permission.VIEW_FINANCIAL_DATA,
        Permission.VIEW_SYSTEM_HEALTH
      ].includes(permission);
    
    case 'partner':
      return [
        // Partners have very limited permissions
      ].includes(permission);
    
    case 'subcontractor':
      return [
        // Subcontractors have minimal permissions
      ].includes(permission);
    
    default:
      return false;
  }
}

/**
 * Convenience permission checking functions
 */
export const permissionCheckers = {
  // User management
  canManageUsers: (user: EnhancedUser) => 
    hasPermission(user, Permission.MANAGE_USERS).granted,
  
  canViewAllUsers: (user: EnhancedUser) =>
    hasPermission(user, Permission.VIEW_ALL_USERS).granted,

  // Work order management
  canManageWorkOrders: (user: EnhancedUser) =>
    hasPermission(user, Permission.MANAGE_WORK_ORDERS).granted,
  
  canViewAllWorkOrders: (user: EnhancedUser) =>
    hasPermission(user, Permission.VIEW_ALL_WORK_ORDERS).granted,
  
  canAssignWorkOrders: (user: EnhancedUser) =>
    hasPermission(user, Permission.ASSIGN_WORK_ORDERS).granted,

  // Financial
  canViewFinancialData: (user: EnhancedUser) =>
    hasPermission(user, Permission.VIEW_FINANCIAL_DATA).granted,
  
  canManageInvoices: (user: EnhancedUser) =>
    hasPermission(user, Permission.MANAGE_INVOICES).granted,

  // System
  canManageOrganizations: (user: EnhancedUser) =>
    hasPermission(user, Permission.MANAGE_ORGANIZATIONS).granted,
  
  canManageSystemSettings: (user: EnhancedUser) =>
    hasPermission(user, Permission.MANAGE_SYSTEM_SETTINGS).granted,
  
  canViewSystemHealth: (user: EnhancedUser) =>
    hasPermission(user, Permission.VIEW_SYSTEM_HEALTH).granted,

  // Reports
  canViewAllReports: (user: EnhancedUser) =>
    hasPermission(user, Permission.VIEW_ALL_REPORTS).granted,
  
  canManageReports: (user: EnhancedUser) =>
    hasPermission(user, Permission.MANAGE_REPORTS).granted,
};

/**
 * Advanced permission checking with context
 */
export function hasContextualPermission(
  user: EnhancedUser,
  permission: Permission,
  organizationId?: string,
  resourceOwnerId?: string
): PermissionResult {
  // Basic permission check
  const baseResult = hasPermission(user, permission);
  if (!baseResult.granted) {
    return baseResult;
  }

  // Additional context-based checks
  if (organizationId && user.organization_memberships) {
    const hasOrgAccess = user.organization_memberships.some(
      membership => membership.organization_id === organizationId
    );
    
    if (!hasOrgAccess && !userTypeCheckers.hasInternalAccess(user)) {
      return {
        granted: false,
        reason: 'No access to specified organization',
        context: baseResult.context
      };
    }
  }

  if (resourceOwnerId && !userTypeCheckers.hasInternalAccess(user)) {
    // Check if user owns the resource or is part of the same organization
    if (resourceOwnerId !== user.id) {
      return {
        granted: false,
        reason: 'Cannot access resource owned by another user',
        context: baseResult.context
      };
    }
  }

  return baseResult;
}