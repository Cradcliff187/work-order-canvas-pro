import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export const usePartnerOrganizationLocations = (organizationId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['partner-organization-locations', organizationId],
    queryFn: async (): Promise<Tables<'partner_locations'>[]> => {
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
    enabled: !!organizationId && enabled,
  });
};