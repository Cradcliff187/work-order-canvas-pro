import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';

export const useAutoOrganization = () => {
  const { userOrganization } = useAuth();
  const { isAdmin } = useUserProfile();
  
  return {
    organizationId: userOrganization?.organization_id,
    shouldShowSelector: isAdmin(),
    organizationType: userOrganization?.organization?.organization_type,
    organization: userOrganization?.organization,
    isLoading: false // Profile loading is handled by useUserProfile
  };
};