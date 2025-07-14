import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';

export const useOrganizationValidation = () => {
  const { profile } = useAuth();
  const { data: userOrganizations, isLoading } = useUserOrganizations();
  
  const hasMultipleOrganizations = useMemo(() => {
    // Only validate for non-admin users
    if (!profile || profile.user_type === 'admin') return false;
    
    // Check if user has more than one organization
    return userOrganizations && userOrganizations.length > 1;
  }, [profile, userOrganizations]);
  
  const organizationCount = userOrganizations?.length || 0;
  const shouldShowValidation = !isLoading && hasMultipleOrganizations;
  
  return {
    hasMultipleOrganizations,
    organizationCount,
    isLoading,
    shouldShowValidation,
    userType: profile?.user_type || 'subcontractor',
  };
};