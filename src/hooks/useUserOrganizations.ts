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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-organizations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get the profile ID first, then query user_organizations
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData) {
        throw new Error(`Failed to fetch user profile: ${profileError?.message}`);
      }

      console.log('[useUserOrganizations] Debug:', {
        userId: user.id,
        profileId: profileData.id,
        profileFound: !!profileData
      });

      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          organization:organizations (
            id,
            name,
            organization_type,
            initials,
            contact_email,
            contact_phone,
            address
          )
        `)
        .eq('user_id', profileData.id);

      if (error) {
        throw new Error(`Failed to fetch user organizations: ${error.message}`);
      }

      console.log('[useUserOrganizations] Query result:', {
        rawData: data,
        mappedOrgs: data?.map(item => item.organization).filter(Boolean),
        count: data?.length || 0
      });

      return data?.map(item => item.organization).filter(Boolean) as UserOrganization[] || [];
    },
    enabled: !!user,
  });
};