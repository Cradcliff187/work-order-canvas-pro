import { useAuth } from '@/contexts/AuthContext';

export const useUserProfile = () => {
  const { profile, loading, isImpersonating } = useAuth();

  const isAdmin = () => profile?.user_type === 'admin';
  const isEmployee = () => profile?.user_type === 'employee';
  const isPartner = () => profile?.user_type === 'partner';
  const isSubcontractor = () => profile?.user_type === 'subcontractor';

  const hasPermission = (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
    if (!profile) return false;
    
    const userTypeHierarchy = {
      'admin': 4,
      'employee': 3,
      'partner': 2,
      'subcontractor': 1
    };

    const userLevel = userTypeHierarchy[profile.user_type];
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
    userType: profile?.user_type,
    isImpersonating
  };
};