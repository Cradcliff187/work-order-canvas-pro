import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubcontractorOrganization {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  active_user_count: number;
  first_active_user: {
    id: string;
    full_name: string;
  } | null;
}

export function useSubcontractorOrganizations() {
  return useQuery({
    queryKey: ['subcontractor-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          contact_email,
          contact_phone,
          user_organizations!inner(
            user_id,
            profiles!inner(
              id,
              first_name,
              last_name,
              user_type,
              is_active
            )
          )
        `)
        .eq('organization_type', 'subcontractor')
        .eq('user_organizations.profiles.user_type', 'subcontractor')
        .eq('user_organizations.profiles.is_active', true)
        .order('name');

      if (error) throw error;

      const transformedData: SubcontractorOrganization[] = (data || []).map(org => {
        const activeUsers = org.user_organizations
          .filter((uo: any) => uo.profiles?.is_active)
          .map((uo: any) => ({
            id: uo.profiles.id,
            full_name: `${uo.profiles.first_name} ${uo.profiles.last_name}`.trim()
          }));

        return {
          id: org.id,
          name: org.name,
          contact_email: org.contact_email,
          contact_phone: org.contact_phone,
          active_user_count: activeUsers.length,
          first_active_user: activeUsers[0] || null
        };
      });

      return transformedData;
    },
  });
}