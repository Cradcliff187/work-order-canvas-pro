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
  uses_partner_location_numbers?: boolean;
}

interface UseUserOrganizationReturn {
  organization: UserOrganization | null;
  loading: boolean;
  error: Error | null;
}

export const useUserOrganization = (): UseUserOrganizationReturn => {
  const { user, profile } = useAuth();

  const { data: organization, isLoading, error } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async (): Promise<UserOrganization | null> => {
      console.log('🔍 useUserOrganization: Starting query', { user: user?.id, profile: profile?.id });
      
      if (!user || !profile) {
        console.log('🔍 useUserOrganization: No user or profile, returning null');
        return null;
      }

      // Admins see all organizations, so they don't have a specific organization
      if (profile.user_type === 'admin') {
        console.log('🔍 useUserOrganization: Admin user, returning null');
        return null;
      }

      console.log('🔍 useUserOrganization: Fetching profile ID for user:', user.id);
      
      // Get the profile ID first, then query user_organizations
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 useUserOrganization: Profile query result:', { profileData, profileError });

      if (profileError || !profileData) {
        console.error('🔍 useUserOrganization: Failed to fetch profile:', profileError);
        throw new Error(`Failed to fetch user profile: ${profileError?.message}`);
      }

      console.log('🔍 useUserOrganization: Fetching organization for profile:', profileData.id);

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
            address,
            uses_partner_location_numbers
          )
        `)
        .eq('user_id', profileData.id)
        .limit(1)
        .single();

      console.log('🔍 useUserOrganization: Organization query result:', { 
        data, 
        error,
        organization: data?.organization,
        uses_partner_location_numbers: data?.organization?.uses_partner_location_numbers
      });

      if (error) {
        console.error('🔍 useUserOrganization: Failed to fetch organization:', error);
        throw new Error(`Failed to fetch user organization: ${error.message}`);
      }

      const result = data?.organization as UserOrganization || null;
      console.log('🔍 useUserOrganization: Final result:', result);
      
      return result;
    },
    enabled: !!user && !!profile,
  });

  console.log('🔍 useUserOrganization: Hook return:', { 
    organization, 
    loading: isLoading, 
    error,
    uses_partner_location_numbers: organization?.uses_partner_location_numbers
  });

  return {
    organization: organization || null,
    loading: isLoading,
    error: error as Error | null,
  };
};