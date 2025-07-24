import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubcontractorOrganization {
  id: string;
  name: string;
  organization_type: string;
  contact_email: string | null;
  contact_phone: string | null;
  active_users: number;
  first_active_user_id: string | null;
  first_active_user_name: string | null;
}

export function useSubcontractorOrganizations() {
  return useQuery({
    queryKey: ['subcontractor-organizations-for-assignment'],
    queryFn: async (): Promise<SubcontractorOrganization[]> => {
      // First, get all subcontractor organizations
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('organization_type', 'subcontractor')
        .eq('is_active', true)
        .order('name');

      if (orgError) throw orgError;
      if (!organizations || organizations.length === 0) return [];

      // Get active users for each organization with proper join
      const orgsWithUsers: SubcontractorOrganization[] = [];
      
      for (const org of organizations) {
        // Get users that belong to this organization
        const { data: userOrgs, error: userOrgsError } = await supabase
          .from('user_organizations')
          .select('user_id')
          .eq('organization_id', org.id);

        if (userOrgsError || !userOrgs || userOrgs.length === 0) continue;

        const userIds = userOrgs.map(uo => uo.user_id);

        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('user_type', 'subcontractor')
          .eq('is_active', true)
          .in('id', userIds)
          .order('created_at')
          .limit(10);

        if (!usersError && users && users.length > 0) {
          orgsWithUsers.push({
            id: org.id,
            name: org.name,
            organization_type: org.organization_type,
            contact_email: org.contact_email,
            contact_phone: org.contact_phone,
            active_users: users.length,
            first_active_user_id: users[0].id,
            first_active_user_name: `${users[0].first_name} ${users[0].last_name}`
          });
        }
      }

      return orgsWithUsers;
    },
  });
}