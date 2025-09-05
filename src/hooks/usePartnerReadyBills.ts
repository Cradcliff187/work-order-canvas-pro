import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerReadyBill {
  bill_id: string;
  internal_bill_number: string;
  external_bill_number: string | null;
  total_amount: number;
  bill_date: string;
  subcontractor_organization_id: string;
  subcontractor_org_name: string;
  subcontractor_org_initials: string;
  work_order_count: number;
  work_order_numbers: string[];
}

export const usePartnerReadyBills = (partnerOrgId?: string) => {
  return useQuery({
    queryKey: ['partner-ready-bills', partnerOrgId],
    queryFn: async (): Promise<PartnerReadyBill[]> => {
      if (!partnerOrgId) return [];
      
      const { data, error } = await supabase
        .rpc('get_partner_ready_bills', {
          partner_org_id: partnerOrgId
        });

      if (error) throw error;

      return data || [];
    },
    staleTime: 60000,
    enabled: !!partnerOrgId,
  });
};