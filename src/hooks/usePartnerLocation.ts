
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type PartnerLocation = Database['public']['Tables']['partner_locations']['Row'];

export function usePartnerLocation(locationId?: string) {
  return useQuery({
    queryKey: ['partner-location', locationId],
    queryFn: async () => {
      if (!locationId) return null;
      
      const { data, error } = await supabase
        .from('partner_locations')
        .select('*')
        .eq('id', locationId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!locationId,
  });
}
