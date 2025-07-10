import { useAuth } from '@/contexts/AuthContext';

export const useUserProfile = () => {
  const { profile, loading } = useAuth();

  const isAdmin = () => profile?.user_type === 'admin';
  const isPartner = () => profile?.user_type === 'partner';
  const isSubcontractor = () => profile?.user_type === 'subcontractor';

  const hasPermission = (requiredUserType: 'admin' | 'partner' | 'subcontractor') => {
    if (!profile) return false;
    
    const userTypeHierarchy = {
      'admin': 3,
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
    isPartner,
    isSubcontractor,
    hasPermission,
    userType: profile?.user_type
  };
};