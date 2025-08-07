import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerUnbilledReport {
  id: string;
  work_order_id: string;
  work_performed: string;
  materials_used: string | null;
  hours_worked: number | null;
  notes: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  partner_billed_at: string | null;
  partner_billed_amount: number | null;
  partner_invoice_id: string | null;
  subcontractor_organization_id: string | null;
  submitted_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  subcontractor_costs: number | null;
  work_orders: {
    work_order_number: string | null;
    title: string;
    description: string | null;
    store_location: string | null;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  } | null;
  subcontractor_organization: {
    id: string;
    name: string;
    initials: string;
  } | null;
  subcontractor: {
    first_name: string;
    last_name: string;
    email: string;
    organization_members: Array<{
      role: string;
      organizations: {
        id: string;
        name: string;
        organization_type: string;
      } | null;
    }>;
  } | null;
  submitted_by: {
    first_name: string;
    last_name: string;
    email: string;
    organization_members: Array<{
      role: string;
      organizations: {
        id: string;
        name: string;
        organization_type: string;
      } | null;
    }>;
  } | null;
}

export const usePartnerUnbilledReports = (partnerOrgId?: string) => {
  return useQuery({
    queryKey: ['partner-unbilled-reports', partnerOrgId],
    queryFn: async (): Promise<PartnerUnbilledReport[]> => {
      if (!partnerOrgId) return [];
      
      const { data, error } = await supabase
        .from('work_order_reports')
        .select(`
          id,
          work_order_id,
          work_performed,
          materials_used,
          hours_worked,
          notes,
          status,
          submitted_at,
          reviewed_at,
          partner_billed_at,
          partner_billed_amount,
          partner_invoice_id,
          subcontractor_organization_id,
          submitted_by_user_id,
          reviewed_by_user_id,
          work_orders!inner (
            work_order_number,
            title,
            description,
            store_location,
            street_address,
            city,
            state,
            zip_code,
            organization_id
          ),
          subcontractor_organization:organizations!subcontractor_organization_id (
            id,
            name,
            initials
          ),
          subcontractor:profiles!subcontractor_user_id (
            first_name,
            last_name,
            email,
            organization_members!inner(
              role,
              organizations!inner(
                id,
                name,
                organization_type
              )
            )
          ),
          submitted_by:profiles!submitted_by_user_id (
            first_name,
            last_name,
            email,
            organization_members!inner(
              role,
              organizations!inner(
                id,
                name,
                organization_type
              )
            )
          )
        `)
        .eq('status', 'approved')
        .is('partner_invoice_id', null)
        .eq('work_orders.organization_id', partnerOrgId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Get subcontractor costs for each report
      const reportsWithCosts = await Promise.all(
        (data || []).map(async (report) => {
          const { data: invoiceData } = await supabase
            .from('invoice_work_orders')
            .select('amount')
            .eq('work_order_report_id', report.id);

          const subcontractor_costs = invoiceData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

          return {
            ...report,
            subcontractor_costs
          };
        })
      );

      return reportsWithCosts;
    },
    enabled: !!partnerOrgId,
  });
};