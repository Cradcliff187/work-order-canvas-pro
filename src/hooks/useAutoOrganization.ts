import { useAuth } from '@/contexts/AuthContext';

export const useAutoOrganization = () => {
  const { profile, userOrganization } = useAuth();
  
  return {
    organizationId: userOrganization?.id,
    shouldShowSelector: profile?.is_employee === false, // Only non-employees can change organizations
    organizationType: userOrganization?.organization_type,
    organization: userOrganization,
    isLoading: !profile // Consider loading if we don't have profile yet
  };
};