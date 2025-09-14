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
            name,
            contact_email
          ),
          partner_invoice_work_orders(
            id,
            work_order_id,
            amount,
            description,
            work_order:work_orders!work_order_id(
              id,
              work_order_number,
              title,
              store_location,
              street_address,
              city,
              state,
              description
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(invoice => ({
        ...invoice,
        work_orders_count: invoice.partner_invoice_work_orders?.length || 0,
        work_orders: invoice.partner_invoice_work_orders || []
      }));
    }
  });
}