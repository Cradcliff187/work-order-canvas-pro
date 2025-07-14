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

      // Get organization IDs first
      const { data: userOrgs, error: userOrgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profile.id);

      console.log('useUserOrganizations: User orgs result', { userOrgs, userOrgError });

      if (userOrgError) {
        console.error('useUserOrganizations: User org query error', userOrgError);
        throw new Error(`Failed to fetch user organizations: ${userOrgError.message}`);
      }

      if (!userOrgs || userOrgs.length === 0) {
        console.log('useUserOrganizations: No organizations found for user');
        return [];
      }

      // Get organization details
      const orgIds = userOrgs.map(uo => uo.organization_id);
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, organization_type, initials, contact_email, contact_phone, address')
        .in('id', orgIds);

      console.log('useUserOrganizations: Organizations result', { organizations, orgError });

      if (orgError) {
        console.error('useUserOrganizations: Organizations query error', orgError);
        throw new Error(`Failed to fetch organization details: ${orgError.message}`);
      }

      const transformedOrgs = organizations?.map(org => ({
        id: org.id,
        name: org.name,
        organization_type: org.organization_type,
        initials: org.initials,
        contact_email: org.contact_email,
        contact_phone: org.contact_phone,
        address: org.address,
      })) as UserOrganization[] || [];

      console.log('useUserOrganizations: Final organizations', transformedOrgs);
      return transformedOrgs;
    },
    enabled: !!profile,
  });
};