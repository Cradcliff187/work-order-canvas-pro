import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserOrganization {
  id: string;
  name: string;
  organization_type: 'partner' | 'subcontractor' | 'internal';
  initials?: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
}

export const useUserOrganizations = () => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['user-organizations', profile?.id],
    queryFn: async () => {
      console.log('useUserOrganizations: Starting query', { profileId: profile?.id });
      
      if (!profile) {
        console.log('useUserOrganizations: No profile found');
        return [];
      }

      // Query user_organizations table with inner join to organizations
      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          organizations!inner (
            id,
            name,
            organization_type,
            initials,
            contact_email,
            contact_phone,
            address
          )
        `)
        .eq('user_id', profile.id);

      console.log('useUserOrganizations: Query result', { data, error });

      if (error) {
        console.error('useUserOrganizations: Query error', error);
        throw new Error(`Failed to fetch user organizations: ${error.message}`);
      }

      // Transform the data to extract organization info
      const organizations = data?.map(item => ({
        id: item.organizations.id,
        name: item.organizations.name,
        organization_type: item.organizations.organization_type,
        initials: item.organizations.initials,
        contact_email: item.organizations.contact_email,
        contact_phone: item.organizations.contact_phone,
        address: item.organizations.address,
      })).filter(Boolean) as UserOrganization[] || [];

      console.log('useUserOrganizations: Final organizations', organizations);
      return organizations;
    },
    enabled: !!profile,
  });
};