import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubcontractorOrganization {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  active_user_count: number;
  active_users: number; // For backward compatibility
  first_active_user: {
    id: string;
    full_name: string;
  } | null;
  first_active_user_id?: string; // Added for modal compatibility
  first_active_user_name?: string; // Added for modal compatibility
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
          is_active,
          user_organizations!left(
            user_id,
            profiles!left(
              id,
              first_name,
              last_name,
              user_type,
              is_active
            )
          )
        `)
        .eq('organization_type', 'subcontractor')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Return ALL subcontractor organizations, regardless of user count
      const transformedData: SubcontractorOrganization[] = (data || []).map(org => {
        const activeUsers = (org.user_organizations || [])
          .filter((uo: any) => uo.profiles?.is_active && uo.profiles?.user_type === 'subcontractor')
          .map((uo: any) => ({
            id: uo.profiles.id,
            full_name: `${uo.profiles.first_name} ${uo.profiles.last_name}`.trim()
          }));

        const firstActiveUser = activeUsers[0] || null;

        return {
          id: org.id,
          name: org.name,
          contact_email: org.contact_email,
          contact_phone: org.contact_phone,
          active_user_count: activeUsers.length,
          active_users: activeUsers.length, // For backward compatibility
          first_active_user: firstActiveUser,
          first_active_user_id: firstActiveUser?.id,
          first_active_user_name: firstActiveUser?.full_name
        };
      });

      console.log('🏢 Subcontractor Organizations Query Result:', {
        rawData: data,
        transformedData,
        count: transformedData.length,
        allOrganizations: transformedData.map(o => ({ 
          id: o.id, 
          name: o.name, 
          userCount: o.active_user_count,
          hasUsers: o.active_user_count > 0
        }))
      });

      return transformedData;
    },
  });
}