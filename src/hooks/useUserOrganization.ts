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
      if (!user || !profile) return null;

      // Admins see all organizations, so they don't have a specific organization
      if (profile.user_type === 'admin') {
        return null;
      }

      // Get the profile ID first, then query user_organizations
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData) {
        throw new Error(`Failed to fetch user profile: ${profileError?.message}`);
      }

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

      if (error) {
        throw new Error(`Failed to fetch user organization: ${error.message}`);
      }

      return data?.organization as UserOrganization || null;
    },
    enabled: !!user && !!profile,
  });

  return {
    organization: organization || null,
    loading: isLoading,
    error: error as Error | null,
  };
};