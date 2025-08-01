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

      // Get the profile ID first, then query organization_members
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData) {
        throw new Error(`Failed to fetch user profile: ${profileError?.message}`);
      }

      // Organization_members query with organizations join

      const { data, error } = await supabase
        .from('organization_members')
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

      // Return mapped organization data

      return data?.map(item => item.organization).filter(Boolean) as UserOrganization[] || [];
    },
    enabled: !!user,
  });
};