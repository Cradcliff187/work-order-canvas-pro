import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';

export const useAutoOrganization = () => {
  const { userOrganization } = useAuth();
  const { isAdmin } = useUserProfile();
  
  return {
    organizationId: userOrganization?.id,
    shouldShowSelector: isAdmin,
    organizationType: userOrganization?.organization_type,
    organization: userOrganization,
    isLoading: false // Profile loading is handled by useUserProfile
  };
};