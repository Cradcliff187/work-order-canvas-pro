import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePartnerLocationsForOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['partner-locations-for-org', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('partner_locations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('location_number');

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
};