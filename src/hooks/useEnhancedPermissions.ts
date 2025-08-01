// Simplified permissions hook for organization-based auth
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';

export const useEnhancedPermissions = () => {
  const { user, userOrganizations } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();

  // Create enhanced user object with organization memberships
  const enhancedUser = user ? { ...user, organization_members: userOrganizations } : null;

  return {
    user: enhancedUser,
    isAdmin,
    isEmployee, 
    isPartner,
    isSubcontractor,
    hasInternalAccess: () => isAdmin() || isEmployee(),
    hasPartnerAccess: () => isPartner() || isAdmin() || isEmployee(),
    canManageWorkOrders: () => isAdmin() || isEmployee(),
    canManageUsers: () => isAdmin(),
    canManageOrganizations: () => isAdmin(),
    canViewFinancialData: () => isAdmin() || isEmployee(),
    canViewSystemHealth: () => isAdmin(),
    isImpersonating: false, // No impersonation in new system
  };
};