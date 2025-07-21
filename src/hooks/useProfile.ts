
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'] & {
  organization_id?: string;
};

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_organizations!inner(
            organization_id
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Extract organization_id from user_organizations
      const userOrganizations = profile.user_organizations as any[];
      const organizationId = userOrganizations?.[0]?.organization_id;

      return {
        ...profile,
        organization_id: organizationId,
      } as Profile;
    },
  });
}
