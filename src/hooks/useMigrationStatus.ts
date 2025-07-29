import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MigrationStatus {
  totalProfiles: number;
  totalOrganizationMembers: number;
  profilesWithOrganizations: number;
  profilesWithoutOrganizations: number;
  inconsistencies: Array<{
    profileId: string;
    email: string;
    issue: string;
  }>;
  syncRequired: boolean;
}

export const useMigrationStatus = () => {
  return useQuery({
    queryKey: ['migration-status'],
    queryFn: async (): Promise<MigrationStatus> => {
      // Get total profiles count
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total organization members count
      const { count: totalOrganizationMembers } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true });

      // Get profiles with organizations
      const { data: profilesWithOrgs, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          organization_memberships:organization_members(
            id,
            organization_id,
            role,
            organization:organizations(
              name,
              organization_type
            )
          )
        `);

      if (profilesError) throw profilesError;

      // Analyze data consistency
      const inconsistencies: Array<{ profileId: string; email: string; issue: string; }> = [];
      let profilesWithOrganizations = 0;
      let profilesWithoutOrganizations = 0;

      profilesWithOrgs?.forEach(profile => {
        const hasOrganizations = profile.organization_memberships && profile.organization_memberships.length > 0;
        
        if (hasOrganizations) {
          profilesWithOrganizations++;
        } else {
          profilesWithoutOrganizations++;
          inconsistencies.push({
            profileId: profile.id,
            email: profile.email,
            issue: 'Profile has no organization memberships'
          });
        }
      });

      return {
        totalProfiles: totalProfiles || 0,
        totalOrganizationMembers: totalOrganizationMembers || 0,
        profilesWithOrganizations,
        profilesWithoutOrganizations,
        inconsistencies,
        syncRequired: inconsistencies.length > 0
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};