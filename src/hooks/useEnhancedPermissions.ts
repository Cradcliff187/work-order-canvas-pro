// Simplified permissions hook for organization-based auth
import { useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';

export const useEnhancedPermissions = () => {
  const { user, userOrganizations } = useAuth();
  
  console.log('[ENHANCED-PERMS] Render', {
    userId: user?.id,
    orgsLength: userOrganizations?.length,
    orgsIds: userOrganizations?.map(o => o.organization_id)
  });
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();

  // FIX 1: Stabilize enhancedUser with deep equality check to prevent cascading re-renders
  const previousUserRef = useRef<any>(null);
  const previousOrgsRef = useRef<any>(null);
  
  const enhancedUser = useMemo(() => {
    if (!user) return null;
    
    // Only create new object if actual data changed (not reference)
    const userChanged = !previousUserRef.current || 
      previousUserRef.current.id !== user.id ||
      previousUserRef.current.email !== user.email;
    
    const orgsChanged = !previousOrgsRef.current ||
      JSON.stringify(previousOrgsRef.current?.map(o => o.organization_id).sort()) !== 
      JSON.stringify(userOrganizations?.map(o => o.organization_id).sort());
    
    if (!userChanged && !orgsChanged && previousUserRef.current) {
      return previousUserRef.current;
    }
    
    const newUser = { ...user, organization_members: userOrganizations };
    previousUserRef.current = newUser;
    previousOrgsRef.current = userOrganizations;
    
    return newUser;
  }, [user?.id, user?.email, JSON.stringify(userOrganizations?.map(o => o.organization_id).sort() || [])])

  // Memoize role checks to prevent recreation
  const roleChecks = useMemo(() => ({
    isAdmin: isAdmin(),
    isEmployee: isEmployee(),
    isPartner: isPartner(),
    isSubcontractor: isSubcontractor(),
  }), [isAdmin, isEmployee, isPartner, isSubcontractor]);

  // Memoize permission functions with stable references
  const permissionFunctions = useMemo(() => ({
    hasInternalAccess: () => roleChecks.isAdmin || roleChecks.isEmployee,
    hasPartnerAccess: () => roleChecks.isPartner || roleChecks.isAdmin || roleChecks.isEmployee,
    canManageWorkOrders: () => roleChecks.isAdmin || roleChecks.isEmployee,
    canManageUsers: () => roleChecks.isAdmin,
    canManageOrganizations: () => roleChecks.isAdmin,
    canViewFinancialData: () => roleChecks.isAdmin || roleChecks.isEmployee,
    canViewSystemHealth: () => roleChecks.isAdmin,
  }), [roleChecks]);

  // Combine all computed values
  const computedPermissions = useMemo(() => ({
    ...roleChecks,
    ...permissionFunctions,
    isImpersonating: false, // No impersonation in new system
  }), [roleChecks, permissionFunctions]);


  return {
    user: enhancedUser,
    ...computedPermissions,
  };
};