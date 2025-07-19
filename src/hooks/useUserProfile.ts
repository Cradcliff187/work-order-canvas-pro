
import { useAuth } from '@/contexts/AuthContext';

export const useUserProfile = () => {
  const { profile, loading, isImpersonating, impersonatedProfile } = useAuth();

  // Use effective profile (impersonated if impersonating, otherwise real profile)
  const effectiveProfile = isImpersonating ? impersonatedProfile : profile;

  const isAdmin = () => effectiveProfile?.user_type === 'admin';
  const isEmployee = () => effectiveProfile?.user_type === 'employee';
  const isPartner = () => effectiveProfile?.user_type === 'partner';
  const isSubcontractor = () => effectiveProfile?.user_type === 'subcontractor';

  const hasPermission = (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
    if (!effectiveProfile) return false;
    
    const userTypeHierarchy = {
      'admin': 4,
      'employee': 3,
      'partner': 2,
      'subcontractor': 1
    };

    const userLevel = userTypeHierarchy[effectiveProfile.user_type];
    const requiredLevel = userTypeHierarchy[requiredUserType];

    return userLevel >= requiredLevel;
  };

  return {
    profile: effectiveProfile, // Return effective profile
    realProfile: profile, // Also provide access to real profile
    impersonatedProfile,
    loading,
    isAdmin,
    isEmployee,
    isPartner,
    isSubcontractor,
    hasPermission,
    userType: effectiveProfile?.user_type,
    realUserType: profile?.user_type,
    isImpersonating
  };
};
