import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApprovalItem {
  id: string;
  type: 'report' | 'invoice';
  title: string;
  submittedBy: string;
  submittedAt: string;
  amount?: number;
  urgency: 'normal' | 'high';
}

interface ApprovalQueueData {
  data: ApprovalItem[];
  totalCount: number;
  loading: boolean;
  error: Error | null;
}

const isUrgent = (submittedAt: string): 'normal' | 'high' => {
  const now = Date.now();
  const submitted = new Date(submittedAt).getTime();
  const hoursDiff = (now - submitted) / (1000 * 60 * 60);
  return hoursDiff > 48 ? 'high' : 'normal';
};

export const useApprovalQueue = (): ApprovalQueueData => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['approval-queue'],
    queryFn: async () => {
      try {
        // Optimized single query with JOINs to eliminate N+1 problem
        const reportsQuery = supabase
          .from('work_order_reports')
          .select(`
            id,
            submitted_at,
            work_order_id,
            subcontractor_user_id,
            work_orders!work_order_id (
              work_order_number,
              title
            ),
            subcontractor:profiles!subcontractor_user_id (
              id,
              first_name,
              last_name
            )
          `)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false });

        // Optimized invoices query with organization JOIN
        const invoicesQuery = supabase
          .from('invoices')
          .select(`
            id,
            internal_invoice_number,
            total_amount,
            submitted_at,
            created_at,
            subcontractor_organization:organizations!subcontractor_organization_id (
              name
            )
          `)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false });

        // Execute both queries in parallel
        const [reportsResult, invoicesResult] = await Promise.all([
          reportsQuery,
          invoicesQuery
        ]);

        // Check for errors
        if (reportsResult.error) {
          console.error('Reports query error:', reportsResult.error);
          throw reportsResult.error;
        }
        if (invoicesResult.error) {
          console.error('Invoices query error:', invoicesResult.error);
          throw invoicesResult.error;
        }

        const reports = reportsResult.data || [];
        const invoices = invoicesResult.data || [];

        // Transform reports to ApprovalItem format with proper null handling
        const reportItems: ApprovalItem[] = reports.map(report => {
          // Safely handle subcontractor data
          const subcontractor = report.subcontractor;
          
          return {
            id: report.id,
            type: 'report' as const,
            title: report.work_orders?.work_order_number 
              ? `${report.work_orders.work_order_number} - ${report.work_orders.title}`
              : 'Unknown Work Order',
            submittedBy: subcontractor && subcontractor.first_name && subcontractor.last_name
              ? `${subcontractor.first_name} ${subcontractor.last_name}` 
              : 'Internal Report',
            submittedAt: report.submitted_at,
            urgency: isUrgent(report.submitted_at)
          };
        });

        // Transform invoices to ApprovalItem format with proper null handling
        const invoiceItems: ApprovalItem[] = invoices.map(invoice => ({
          id: invoice.id,
          type: 'invoice' as const,
          title: `Invoice ${invoice.internal_invoice_number || 'Unknown'}`,
          submittedBy: invoice.subcontractor_organization?.name || 'Unknown Organization',
          submittedAt: invoice.submitted_at || invoice.created_at,
          amount: invoice.total_amount,
          urgency: isUrgent(invoice.submitted_at || invoice.created_at)
        }));

        // Combine and sort items
        const combinedItems = [...reportItems, ...invoiceItems];
        
        // Sort by urgency (high first) then by submitted date (newest first)
        const sortedItems = combinedItems.sort((a, b) => {
          // First sort by urgency
          if (a.urgency !== b.urgency) {
            return a.urgency === 'high' ? -1 : 1;
          }
          // Then sort by submitted date (newest first)
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });

        return {
          data: sortedItems,
          totalCount: sortedItems.length
        };
      } catch (error) {
        console.error('Approval queue query failed:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds cache
    gcTime: 300000, // 5 minutes in memory
    retry: 2,
    retryDelay: 1000,
  });

  return {
    data: data?.data || [],
    totalCount: data?.totalCount || 0,
    loading: isLoading,
    error: error as Error | null,
  };
};