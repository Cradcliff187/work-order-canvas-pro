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
      if (!profile) return [];

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
        .eq('user_id', profile.id);

      if (error) {
        throw new Error(`Failed to fetch user organizations: ${error.message}`);
      }

      return data?.map(item => item.organization).filter(Boolean) as UserOrganization[] || [];
    },
    enabled: !!profile,
  });
};