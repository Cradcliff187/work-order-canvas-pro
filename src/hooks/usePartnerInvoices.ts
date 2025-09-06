import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePartnerInvoices() {
  return useQuery({
    queryKey: ['partner-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_invoices')
        .select(`
          *,
          partner_organization:organizations!partner_organization_id(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });
}