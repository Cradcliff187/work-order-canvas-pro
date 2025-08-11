import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceDetail {
  invoice_id: string;
  invoice_number: string;
  status: string;
  amount: number;
  approved_at: string | null;
}

export interface ReportInvoiceDetails {
  report_id: string;
  invoices: InvoiceDetail[];
  invoice_count: number;
  total_amount: number;
}

export const useReportInvoiceDetails = (reportIds: string[]) => {
  const sortedIds = [...reportIds].sort();
  return useQuery({
    queryKey: ['report-invoice-details', sortedIds],
    queryFn: async (): Promise<ReportInvoiceDetails[]> => {
      if (reportIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('invoice_work_orders')
        .select(`
          work_order_report_id,
          amount,
          invoices (
            id,
            internal_invoice_number,
            status,
            approved_at
          )
        `)
        .in('work_order_report_id', reportIds);

      if (error) throw error;

      // Group by report ID and aggregate invoice information
      const reportInvoiceMap = new Map<string, InvoiceDetail[]>();
      
      (data || []).forEach((item: any) => {
        const reportId = item.work_order_report_id;
        const invoice = item.invoices;
        
        if (!reportInvoiceMap.has(reportId)) {
          reportInvoiceMap.set(reportId, []);
        }
        
        if (invoice) {
          reportInvoiceMap.get(reportId)?.push({
            invoice_id: invoice.id,
            invoice_number: invoice.internal_invoice_number,
            status: invoice.status,
            amount: item.amount,
            approved_at: invoice.approved_at
          });
        }
      });

      // Transform to the expected format
      return Array.from(reportInvoiceMap.entries()).map(([reportId, invoices]) => ({
        report_id: reportId,
        invoices,
        invoice_count: invoices.length,
        total_amount: invoices.reduce((sum, inv) => sum + inv.amount, 0)
      }));
    },
    staleTime: 60000,
    enabled: sortedIds.length > 0,
  });
};