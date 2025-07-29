/**
 * Permission Bridge Hook - DEPRECATED
 * This hook has been replaced by direct organization-based permissions
 * Use useUserProfile() instead for permission checking
 */

import { useMemo } from 'react';
import type { OrganizationMember, OrganizationType, OrganizationRole } from '@/types/auth.types';
import { useUserProfile } from './useUserProfile';

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

export const usePermissionBridge = (user?: any): PermissionBridge => {
  const { isAdmin, isEmployee, isPartner, isSubcontractor, profile } = useUserProfile();
  
  return useMemo(() => {
    // All organization auth now
    const usingOrganizationAuth = true;
    
    // Basic permission checks
    const hasInternalAccess = isAdmin() || isEmployee();
    const canManageUsers = isAdmin();
    const canViewFinancials = hasInternalAccess;
    const canManageWorkOrders = hasInternalAccess;

    return {
      isAdmin: isAdmin(),
      isEmployee: isEmployee(),
      isPartner: isPartner(),
      isSubcontractor: isSubcontractor(),
      isInternalOrg: isAdmin() || isEmployee(),
      isPartnerOrg: isPartner(),
      isSubcontractorOrg: isSubcontractor(),
      hasInternalAccess,
      canManageUsers,
      canViewFinancials,
      canManageWorkOrders,
      hasInternalRole: () => false, // TODO: Implement with organization membership data
      hasRoleInOrganization: () => false, // TODO: Implement with organization membership data
      usingOrganizationAuth,
      primaryOrganization: null, // TODO: Get from profile
    };
  }, [isAdmin, isEmployee, isPartner, isSubcontractor, profile]);
};
