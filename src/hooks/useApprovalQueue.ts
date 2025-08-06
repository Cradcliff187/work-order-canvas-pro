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
        // Step 1: Query reports WITHOUT JOIN to avoid NULL UUID conversion errors
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
            )
          `)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false });

        // Step 2: Query invoices with organization JOIN (this works fine)
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

        // Step 3: Get unique valid subcontractor IDs to fetch profiles separately
        const validSubcontractorIds = [
          ...new Set(
            reports
              .filter(report => report.subcontractor_user_id) // Filter out NULLs
              .map(report => report.subcontractor_user_id)
          )
        ];

        // Step 4: Fetch subcontractor profiles separately (only if we have valid IDs)
        let subcontractorProfiles: any[] = [];
        if (validSubcontractorIds.length > 0) {
          const profilesResult = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', validSubcontractorIds);

          if (profilesResult.error) {
            console.error('Profiles query error:', profilesResult.error);
            // Don't throw - continue with empty profiles
          } else {
            subcontractorProfiles = profilesResult.data || [];
          }
        }

        // Step 5: Create a lookup map for profiles
        const profileLookup = new Map(
          subcontractorProfiles.map(profile => [profile.id, profile])
        );

        // Step 6: Transform reports with safe profile lookup
        const reportItems: ApprovalItem[] = reports.map(report => {
          const profile = report.subcontractor_user_id 
            ? profileLookup.get(report.subcontractor_user_id)
            : null;
          
          return {
            id: report.id,
            type: 'report' as const,
            title: report.work_orders?.work_order_number 
              ? `${report.work_orders.work_order_number} - ${report.work_orders.title}`
              : 'Unknown Work Order',
            submittedBy: profile && profile.first_name && profile.last_name
              ? `${profile.first_name} ${profile.last_name}` 
              : 'Internal Report',
            submittedAt: report.submitted_at,
            urgency: isUrgent(report.submitted_at)
          };
        });

        // Step 7: Transform invoices (this remains the same)
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
    retry: 1, // Reduced retries to prevent cascade failures
    retryDelay: 1000,
  });

  return {
    data: data?.data || [],
    totalCount: data?.totalCount || 0,
    loading: isLoading,
    error: error as Error | null,
  };
};