/**
 * Permission Bridge Hook
 * Provides unified permission checking during migration
 */

import { useMemo } from 'react';
import type { DualCompatUser, LegacyUserType } from '@/lib/migration/dualTypeAuth';
import type { OrganizationMember, OrganizationType, OrganizationRole } from '@/types/auth.types';
import { dualPermissionCheck } from '@/lib/migration/dualTypeAuth';
import { isFeatureEnabled } from '@/lib/migration/featureFlags';

export interface PermissionBridge {
  // Core role checks
  isAdmin: boolean;
  isEmployee: boolean;
  isPartner: boolean;
  isSubcontractor: boolean;
  
  // Organization type checks
  isInternalOrg: boolean;
  isPartnerOrg: boolean;
  isSubcontractorOrg: boolean;
  
  // Permission helpers
  hasInternalAccess: boolean;
  canManageUsers: boolean;
  canViewFinancials: boolean;
  canManageWorkOrders: boolean;
  
  // Advanced role checks
  hasInternalRole: (roles: OrganizationRole[]) => boolean;
  hasRoleInOrganization: (organizationId: string, roles: OrganizationRole[]) => boolean;
  
  // Migration state
  usingOrganizationAuth: boolean;
  primaryOrganization: OrganizationMember | null;
}

export const usePermissionBridge = (user: DualCompatUser | null): PermissionBridge => {
  return useMemo(() => {
    if (!user) {
      return {
        isAdmin: false,
        isEmployee: false,
        isPartner: false,
        isSubcontractor: false,
        isInternalOrg: false,
        isPartnerOrg: false,
        isSubcontractorOrg: false,
        hasInternalAccess: false,
        canManageUsers: false,
        canViewFinancials: false,
        canManageWorkOrders: false,
        hasInternalRole: () => false,
        hasRoleInOrganization: () => false,
        usingOrganizationAuth: false,
        primaryOrganization: null,
      };
    }

    const usingOrganizationAuth = isFeatureEnabled('useOrganizationAuth');
    const primaryOrg = user.primary_organization;

    // Core role checks using dual permission system
    const isAdmin = dualPermissionCheck.isAdmin(user);
    const isEmployee = dualPermissionCheck.isEmployee(user);
    const isPartner = dualPermissionCheck.isPartner(user);
    const isSubcontractor = dualPermissionCheck.isSubcontractor(user);

    // Organization type checks
    const isInternalOrg = primaryOrg?.organization?.organization_type === 'internal' || 
                         (!primaryOrg && (user.user_type === 'admin' || user.user_type === 'employee'));
    const isPartnerOrg = primaryOrg?.organization?.organization_type === 'partner' || 
                        (!primaryOrg && user.user_type === 'partner');
    const isSubcontractorOrg = primaryOrg?.organization?.organization_type === 'subcontractor' || 
                              (!primaryOrg && user.user_type === 'subcontractor');

    // Permission helpers
    const hasInternalAccess = isAdmin || isEmployee;
    const canManageUsers = isAdmin;
    const canViewFinancials = hasInternalAccess;
    const canManageWorkOrders = hasInternalAccess;

    // Advanced role checks
    const hasInternalRole = (roles: OrganizationRole[]): boolean => {
      if (usingOrganizationAuth && primaryOrg) {
        return primaryOrg.organization?.organization_type === 'internal' && 
               roles.includes(primaryOrg.role);
      }
      // Fallback to user_type
      const legacyMapping: Record<LegacyUserType, OrganizationRole> = {
        admin: 'admin',
        employee: 'employee',
        partner: 'member',
        subcontractor: 'member',
      };
      return user.user_type ? roles.includes(legacyMapping[user.user_type]) : false;
    };

    const hasRoleInOrganization = (organizationId: string, roles: OrganizationRole[]): boolean => {
      if (!user.organization_memberships) return false;
      
      const membership = user.organization_memberships.find(
        m => m.organization_id === organizationId
      );
      return membership ? roles.includes(membership.role) : false;
    };

    return {
      isAdmin,
      isEmployee,
      isPartner,
      isSubcontractor,
      isInternalOrg,
      isPartnerOrg,
      isSubcontractorOrg,
      hasInternalAccess,
      canManageUsers,
      canViewFinancials,
      canManageWorkOrders,
      hasInternalRole,
      hasRoleInOrganization,
      usingOrganizationAuth,
      primaryOrganization: primaryOrg,
    };
  }, [user]);
};