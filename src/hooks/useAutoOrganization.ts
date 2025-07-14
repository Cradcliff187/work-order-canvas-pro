import { useAuth } from '@/contexts/AuthContext';

export const useAutoOrganization = () => {
  const { profile, userOrganization } = useAuth();
  
  return {
    organizationId: userOrganization?.id,
    shouldShowSelector: profile?.user_type === 'admin',
    organizationType: userOrganization?.organization_type,
    organization: userOrganization,
    isLoading: !profile // Consider loading if we don't have profile yet
  };
};