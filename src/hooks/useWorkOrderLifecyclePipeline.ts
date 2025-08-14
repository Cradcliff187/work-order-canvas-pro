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
  description: string | null;
  status: 'received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'estimate_needed' | 'estimate_approved';
  store_location: string | null;
  organization_id: string | null;
  date_submitted: string;
  created_at: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  
  // Organization info
  partner_organization_name: string | null;
  assigned_organization_name: string | null;
  
  // Financial tracking
  estimated_hours: number | null;
  actual_hours: number | null;
  materials_cost: number | null;
  labor_cost: number | null;
  subcontractor_invoice_amount: number | null;
  
  // Timeline tracking
  date_assigned: string | null;
  date_completed: string | null;
  
  // Latest report status
  report_status: 'submitted' | 'reviewed' | 'approved' | 'rejected' | null;
  report_submitted_at: string | null;
  
  // Invoice status (subcontractor billing)
  invoice_status: string | null;
  invoice_submitted_at: string | null;
  
  // Partner billing status
  partner_bill_status: string | null;
  partner_billed_at: string | null;
  
  // Calculated fields
  age_days: number;
  is_overdue: boolean;
  operational_status: 'on_track' | 'at_risk' | 'overdue' | 'blocked' | 'completed';
  financial_status: 'not_billed' | 'invoice_received' | 'paid';
}

export function useWorkOrderLifecycle() {
  const { user } = useAuth();
  const { profile, primaryRole, partnerMemberships, subcontractorMemberships } = useUserProfile();

  return useQuery({
    queryKey: ['work-order-lifecycle'],
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
          description,
          status,
          store_location,
          organization_id,
          date_submitted,
          created_at,
          due_date,
          priority,
          estimated_hours,
          actual_hours,
          materials_cost,
          labor_cost,
          subcontractor_invoice_amount,
          date_assigned,
          date_completed,
          assigned_organization_id,
          partner_organization:organizations!work_orders_organization_id_fkey(
            name
          ),
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
          )
          .order('submitted_at', { ascending: false })
          .limit(1),
          invoice_work_orders(
            invoices(
              status,
              submitted_at
            )
          )
        `)
        .neq('status', 'cancelled')
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

      // Helper functions for calculations
      const calculateAgeDays = (createdAt: string): number => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffTime = now.getTime() - created.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
      };

      const isOverdue = (dueDate: string | null): boolean => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
      };

      const calculateOperationalStatus = (
        status: string,
        reportStatus: string | null,
        dueDate: string | null,
        ageDays: number
      ): 'on_track' | 'at_risk' | 'overdue' | 'blocked' | 'completed' => {
        if (status === 'completed') return 'completed';
        if (dueDate && isOverdue(dueDate)) return 'overdue';
        if (status === 'received' && ageDays > 3) return 'at_risk';
        if (status === 'assigned' && ageDays > 7) return 'at_risk';
        if (status === 'in_progress' && reportStatus === 'rejected') return 'blocked';
        return 'on_track';
      };

      const calculateFinancialStatus = (
        invoiceStatus: string | null,
        partnerBillStatus: string | null
      ): 'not_billed' | 'invoice_received' | 'paid' => {
        // If both statuses indicate payment completion
        if (invoiceStatus === 'paid' || partnerBillStatus === 'paid') return 'paid';
        
        // If there's any invoice activity (received, submitted, etc.)
        if (invoiceStatus || partnerBillStatus) return 'invoice_received';
        
        // No billing activity yet
        return 'not_billed';
      };

      // Transform the data to match our pipeline structure
      return (data || []).map((workOrder: any): WorkOrderPipelineItem => {
        // Get the latest report (assuming they're ordered by submitted_at)
        const latestReport = workOrder.latest_report?.[0];
        
        // Get the first invoice (there should typically be one per work order)
        const invoice = workOrder.invoice_work_orders?.[0]?.invoices;
        
        // Get partner billing info from the latest report - use most recent invoice
        const partnerInvoices = latestReport?.partner_invoices || [];
        const partnerInvoice = partnerInvoices.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        // Calculate derived fields
        const ageDays = calculateAgeDays(workOrder.created_at);
        const overdueStatus = isOverdue(workOrder.due_date);
        const operationalStatus = calculateOperationalStatus(
          workOrder.status,
          latestReport?.status,
          workOrder.due_date,
          ageDays
        );
        const financialStatus = calculateFinancialStatus(
          invoice?.status,
          partnerInvoice?.status
        );

        return {
          id: workOrder.id,
          work_order_number: workOrder.work_order_number,
          title: workOrder.title,
          description: workOrder.description,
          status: workOrder.status,
          store_location: workOrder.store_location,
          organization_id: workOrder.organization_id,
          date_submitted: workOrder.date_submitted,
          created_at: workOrder.created_at,
          due_date: workOrder.due_date,
          priority: workOrder.priority,
          
          // Organization info
          partner_organization_name: workOrder.partner_organization?.name || null,
          assigned_organization_name: workOrder.assigned_organizations?.name || null,
          
          // Financial tracking
          estimated_hours: workOrder.estimated_hours,
          actual_hours: workOrder.actual_hours,
          materials_cost: workOrder.materials_cost,
          labor_cost: workOrder.labor_cost,
          subcontractor_invoice_amount: workOrder.subcontractor_invoice_amount,
          
          // Timeline tracking
          date_assigned: workOrder.date_assigned,
          date_completed: workOrder.date_completed,
          
          // Latest report status
          report_status: latestReport?.status || null,
          report_submitted_at: latestReport?.submitted_at || null,
          
          // Invoice status (subcontractor billing)
          invoice_status: invoice?.status || null,
          invoice_submitted_at: invoice?.submitted_at || null,
          
          // Partner billing status
          partner_bill_status: partnerInvoice?.status || null,
          partner_billed_at: partnerInvoice?.created_at || null,
          
          // Calculated fields
          age_days: ageDays,
          is_overdue: overdueStatus,
          operational_status: operationalStatus,
          financial_status: financialStatus,
        };
      });
    },
    enabled: !!user && !!profile,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}