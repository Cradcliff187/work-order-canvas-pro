import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

// Pipeline data structure for complete lifecycle view
export interface WorkOrderPipelineItem {
  // Core work order info
  id: string;
  work_order_number: string | null;
  title: string;
  status: 'received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'estimate_needed' | 'estimate_approved';
  store_location: string | null;
  organization_id: string | null;
  date_submitted: string;
  
  // Assigned organization
  assigned_organization_name: string | null;
  
  // Latest report status
  report_status: 'submitted' | 'reviewed' | 'approved' | 'rejected' | null;
  report_submitted_at: string | null;
  
  // Invoice status (subcontractor billing)
  invoice_status: string | null;
  invoice_submitted_at: string | null;
  
  // Partner billing status
  partner_bill_status: string | null;
  partner_billed_at: string | null;
}

export function useWorkOrderPipeline() {
  const { user } = useAuth();
  const { profile, primaryRole, partnerMemberships, subcontractorMemberships } = useUserProfile();

  return useQuery({
    queryKey: ['work-order-pipeline'],
    queryFn: async (): Promise<WorkOrderPipelineItem[]> => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          title,
          status,
          store_location,
          organization_id,
          date_submitted,
          assigned_organization_id,
          assigned_organizations:organizations!work_orders_assigned_organization_id_fkey(
            name
          ),
          latest_report:work_order_reports(
            status,
            submitted_at,
            partner_invoices(
              status,
              created_at
            )
          ),
          invoice_work_orders(
            invoices(
              status,
              submitted_at
            )
          )
        `)
        .order('date_submitted', { ascending: false });

      // Apply role-based filtering
      if (primaryRole === 'admin' || primaryRole === 'employee') {
        // Admin and employees can see all work orders
      } else if (primaryRole === 'partner') {
        // Partners can only see their organization's work orders
        const userOrgIds = partnerMemberships?.map(org => org.organization_id) || [];
        if (userOrgIds.length > 0) {
          query = query.in('organization_id', userOrgIds);
        } else {
          // If no organizations, return empty result
          return [];
        }
      } else if (primaryRole === 'subcontractor') {
        // Subcontractors can only see work orders assigned to their organizations
        const userOrgIds = subcontractorMemberships?.map(org => org.organization_id) || [];
        if (userOrgIds.length > 0) {
          query = query.in('assigned_organization_id', userOrgIds);
        } else {
          // If no organizations, return empty result
          return [];
        }
      } else {
        // Unknown role, return empty result
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching work order pipeline:', error);
        throw error;
      }

      // Transform the data to match our pipeline structure
      return (data || []).map((workOrder: any): WorkOrderPipelineItem => {
        // Get the latest report (assuming they're ordered by submitted_at)
        const latestReport = workOrder.latest_report?.[0];
        
        // Get the first invoice (there should typically be one per work order)
        const invoice = workOrder.invoice_work_orders?.[0]?.invoices;
        
        // Get partner billing info from the latest report
        const partnerInvoice = latestReport?.partner_invoices?.[0];

        return {
          id: workOrder.id,
          work_order_number: workOrder.work_order_number,
          title: workOrder.title,
          status: workOrder.status,
          store_location: workOrder.store_location,
          organization_id: workOrder.organization_id,
          date_submitted: workOrder.date_submitted,
          
          // Assigned organization
          assigned_organization_name: workOrder.assigned_organizations?.name || null,
          
          // Latest report status
          report_status: latestReport?.status || null,
          report_submitted_at: latestReport?.submitted_at || null,
          
          // Invoice status (subcontractor billing)
          invoice_status: invoice?.status || null,
          invoice_submitted_at: invoice?.submitted_at || null,
          
          // Partner billing status
          partner_bill_status: partnerInvoice?.status || null,
          partner_billed_at: partnerInvoice?.created_at || null,
        };
      });
    },
    enabled: !!user && !!profile,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}