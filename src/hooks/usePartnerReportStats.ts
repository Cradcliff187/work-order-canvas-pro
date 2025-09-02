import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerReportStats {
  totalApprovedReports: number;
  reportsWithoutInvoices: number;
  reportsWithPendingInvoices: number;
  reportsReadyForBilling: number;
  reportsAlreadyBilled: number;
}

export const usePartnerReportStats = (partnerOrgId?: string) => {
  return useQuery({
    queryKey: ['partner-report-stats', partnerOrgId],
    queryFn: async (): Promise<PartnerReportStats> => {
      if (!partnerOrgId) {
        return {
          totalApprovedReports: 0,
          reportsWithoutInvoices: 0,
          reportsWithPendingInvoices: 0,
          reportsReadyForBilling: 0,
          reportsAlreadyBilled: 0
        };
      }

      // Get work order IDs for this partner
      const { data: workOrderIds } = await supabase
        .from('work_orders')
        .select('id')
        .eq('organization_id', partnerOrgId);

      const workOrderIdList = workOrderIds?.map(wo => wo.id) || [];

      if (workOrderIdList.length === 0) {
        return {
          totalApprovedReports: 0,
          reportsWithoutInvoices: 0,
          reportsWithPendingInvoices: 0,
          reportsReadyForBilling: 0,
          reportsAlreadyBilled: 0
        };
      }

      // Count total approved reports for this partner
      const { count: totalApprovedReports } = await supabase
        .from('work_order_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .in('work_order_id', workOrderIdList);

      // Count reports already billed to partners
      const { count: reportsAlreadyBilled } = await supabase
        .from('work_order_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .not('partner_invoice_id', 'is', null)
        .in('work_order_id', workOrderIdList);

      // Get invoice IDs for different statuses
      const { data: pendingInvoices } = await supabase
        .from('subcontractor_bills')
        .select('id')
        .in('status', ['submitted', 'under_review']);

      const { data: approvedInvoices } = await supabase
        .from('subcontractor_bills')
        .select('id')
        .in('status', ['approved', 'paid']);

      const pendingInvoiceIds = pendingInvoices?.map(inv => inv.id) || [];
      const approvedInvoiceIds = approvedInvoices?.map(inv => inv.id) || [];

      // Get report IDs that have pending subcontractor invoices
      const { data: reportsWithPendingInvoiceIds } = pendingInvoiceIds.length > 0 ? await supabase
        .from('subcontractor_bill_work_orders')
        .select('work_order_report_id')
        .in('subcontractor_bill_id', pendingInvoiceIds)
        .not('work_order_report_id', 'is', null) : { data: [] };

      // Get report IDs that have approved subcontractor invoices  
      const { data: reportsWithApprovedInvoiceIds } = approvedInvoiceIds.length > 0 ? await supabase
        .from('subcontractor_bill_work_orders')
        .select('work_order_report_id')
        .in('subcontractor_bill_id', approvedInvoiceIds)
        .not('work_order_report_id', 'is', null) : { data: [] };

      const pendingReportIds = reportsWithPendingInvoiceIds?.map(r => r.work_order_report_id).filter(Boolean) || [];
      const approvedReportIds = reportsWithApprovedInvoiceIds?.map(r => r.work_order_report_id).filter(Boolean) || [];

      // Count reports with pending invoices
      const { count: reportsWithPendingInvoices } = pendingReportIds.length > 0 ? await supabase
        .from('work_order_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .is('partner_invoice_id', null)
        .in('work_order_id', workOrderIdList)
        .in('id', pendingReportIds) : { count: 0 };

      // Count reports ready for billing (approved with approved invoices)
      const { count: reportsReadyForBilling } = approvedReportIds.length > 0 ? await supabase
        .from('work_order_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .is('partner_invoice_id', null)
        .in('work_order_id', workOrderIdList)
        .in('id', approvedReportIds) : { count: 0 };

      // Count approved reports without any subcontractor invoices
      const allInvoicedReportIds = [...pendingReportIds, ...approvedReportIds];
      const { count: reportsWithoutInvoices } = await supabase
        .from('work_order_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .is('partner_invoice_id', null)
        .in('work_order_id', workOrderIdList)
        .not('id', 'in', allInvoicedReportIds.length > 0 ? allInvoicedReportIds : ['00000000-0000-0000-0000-000000000000']);

      return {
        totalApprovedReports: totalApprovedReports || 0,
        reportsWithoutInvoices: reportsWithoutInvoices || 0,
        reportsWithPendingInvoices: reportsWithPendingInvoices || 0,
        reportsReadyForBilling: reportsReadyForBilling || 0,
        reportsAlreadyBilled: reportsAlreadyBilled || 0
      };
    },
    staleTime: 60000,
    enabled: !!partnerOrgId
  });
};