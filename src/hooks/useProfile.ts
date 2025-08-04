
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

      // First, get the profile without joins
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single(); // This will return exactly 1 row

      if (profileError) throw profileError;

      // Then, separately get organization memberships
      const { data: orgMemberships, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', profile.id);

      if (orgError) throw orgError;

      // Extract first organization_id for backward compatibility
      const organizationId = orgMemberships?.[0]?.organization_id;

      return {
        ...profile,
        organization_id: organizationId,
        organization_members: orgMemberships, // Include all memberships if needed
      } as Profile;
    },
  });
}
