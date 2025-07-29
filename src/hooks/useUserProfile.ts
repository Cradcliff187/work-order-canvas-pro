import { useAuth } from '@/contexts/AuthContext';
import { userTypeCheckers, createEnhancedUser, getUserType } from '@/lib/permissions/userUtils';

// Organization-based user profile hook - Phase 8 complete
export const useUserProfile = () => {
  const { profile, loading, isImpersonating, userOrganizations } = useAuth();
  
  // Create enhanced user for permission checking
  const enhancedUser = profile ? createEnhancedUser(profile, userOrganizations) : null;

  // Organization-based permission checks
  const isAdmin = () => enhancedUser ? userTypeCheckers.isAdmin(enhancedUser) : false;
  const isEmployee = () => enhancedUser ? userTypeCheckers.isEmployee(enhancedUser) : false;
  const isPartner = () => enhancedUser ? userTypeCheckers.isPartner(enhancedUser) : false;
  const isSubcontractor = () => enhancedUser ? userTypeCheckers.isSubcontractor(enhancedUser) : false;

  const hasPermission = (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
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
  };

  return {
    profile,
    loading,
    isAdmin,
    isEmployee,
    isPartner,
    isSubcontractor,
    hasPermission,
    userType: enhancedUser ? getUserType(enhancedUser) : 'subcontractor',
    isImpersonating
  };
};