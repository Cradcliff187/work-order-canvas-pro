import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubcontractorOrganization {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  // Backward compatibility properties (with default values for performance)
  active_user_count: number;
  active_users: number;
  first_active_user: {
    id: string;
    full_name: string;
  } | null;
  first_active_user_id?: string;
  first_active_user_name?: string;
}

export function useSubcontractorOrganizations() {
  return useQuery({
    queryKey: ['subcontractor-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, contact_email, contact_phone')
        .eq('organization_type', 'subcontractor')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Transform data with backward compatibility (default values for performance)
      const transformedData = (data || []).map(org => ({
        ...org,
        active_user_count: 0, // Default for performance - not needed for filters
        active_users: 0, // Backward compatibility
        first_active_user: null, // Default for performance - not needed for filters
        first_active_user_id: undefined,
        first_active_user_name: undefined
      }));

      return transformedData;
    },
  });
}