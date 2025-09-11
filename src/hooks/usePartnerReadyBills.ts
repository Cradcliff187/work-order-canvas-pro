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

export interface PartnerReadyInternalReport {
  id: string;
  work_order_id: string;
  bill_amount: number;
  status: string;
  work_order_number: string;
  title: string;
  organization_name: string;
}

export interface PartnerReadyData {
  bills: PartnerReadyBill[];
  internalReports: PartnerReadyInternalReport[];
}

export const usePartnerReadyBills = (partnerOrgId?: string) => {
  return useQuery({
    queryKey: ['partner-ready-data', partnerOrgId],
    queryFn: async (): Promise<PartnerReadyData> => {
      if (!partnerOrgId) return { bills: [], internalReports: [] };
      
      // Get subcontractor bills
      const { data: bills, error: billsError } = await supabase
        .rpc('get_partner_ready_bills', {
          partner_org_id: partnerOrgId
        });

      if (billsError) throw billsError;

      // Get internal reports ready for billing
      const { data: readyInternalReports, error: reportsError } = await supabase
        .from('work_order_reports')
        .select(`
          id,
          work_order_id,
          bill_amount,
          status,
          work_orders!inner(
            work_order_number,
            title,
            organization_id,
            assigned_organization_id,
            organizations!assigned_organization_id(
              organization_type,
              name
            )
          )
        `)
        .eq('status', 'approved')
        .is('partner_invoice_id', null)
        .not('bill_amount', 'is', null)
        .gt('bill_amount', 0)
        .eq('work_orders.organizations.organization_type', 'internal')
        .eq('work_orders.organization_id', partnerOrgId);

      if (reportsError) throw reportsError;

      // Transform internal reports data
      const transformedReports: PartnerReadyInternalReport[] = (readyInternalReports || []).map(report => ({
        id: report.id,
        work_order_id: report.work_order_id,
        bill_amount: report.bill_amount,
        status: report.status,
        work_order_number: report.work_orders.work_order_number,
        title: report.work_orders.title,
        organization_name: report.work_orders.organizations.name
      }));

      return {
        bills: bills || [],
        internalReports: transformedReports
      };
    },
    staleTime: 60000,
    enabled: !!partnerOrgId,
  });
};