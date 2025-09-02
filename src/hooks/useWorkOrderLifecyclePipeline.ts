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
  assigned_organization_id: string | null;
  assigned_organization_type: string | null;
  
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
  partner_billed_amount: number | null;
  internal_markup_percentage: number;
  
  // Calculated fields
  age_days: number;
  is_overdue: boolean;
  operational_status: 'on_track' | 'at_risk' | 'overdue' | 'blocked' | 'completed';
  financial_status: 'not_billed' | 'invoice_received' | 'paid' | 'fully_billed';
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
): 'not_billed' | 'invoice_received' | 'paid' | 'fully_billed' => {
  // Check invoice status specifically - align with computedFinancialStatus config
  if (invoiceStatus === 'paid' || partnerBillStatus === 'paid') return 'paid';
  if (invoiceStatus === 'approved') return 'fully_billed';
  if (invoiceStatus === 'submitted') return 'invoice_received';
  if (partnerBillStatus) return 'invoice_received';
  return 'not_billed';
};

export function useWorkOrderLifecycle() {
  const { user } = useAuth();
  const { profile, primaryRole, partnerMemberships, subcontractorMemberships } = useUserProfile();

  return useQuery({
    queryKey: ['work-order-lifecycle'],
    queryFn: async (): Promise<WorkOrderPipelineItem[]> => {
      // Add proper authentication guards
      if (!user) {
        console.warn('No authenticated user');
        return [];
      }
      
      if (!profile) {
        console.warn('No user profile found');
        return [];
      }

      try {
        // Simplified, bulletproof query structure
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
            date_assigned,
            date_completed,
            assigned_organization_id,
            internal_markup_percentage,
            organizations!work_orders_organization_id_fkey(
              name
            ),
            assigned_organizations:organizations!work_orders_assigned_organization_id_fkey(
              name,
              organization_type
            )
          `)
          .neq('status', 'cancelled')
          .order('date_submitted', { ascending: false });

        // Apply role-based filtering with safe defaults
        if (primaryRole === 'admin' || primaryRole === 'employee') {
          // Admin and employees can see all work orders
        } else if (primaryRole === 'partner') {
          // Partners can only see their organization's work orders
          const userOrgIds = partnerMemberships?.map(org => org.organization_id) || [];
          if (userOrgIds.length > 0) {
            query = query.in('organization_id', userOrgIds);
          } else {
            // If no organizations, return empty result safely
            return [];
          }
        } else if (primaryRole === 'subcontractor') {
          // Subcontractors can only see work orders assigned to their organizations
          const userOrgIds = subcontractorMemberships?.map(org => org.organization_id) || [];
          if (userOrgIds.length > 0) {
            query = query.in('assigned_organization_id', userOrgIds);
          } else {
            // If no organizations, return empty result safely
            return [];
          }
        } else {
          // Unknown role, return empty result safely
          return [];
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching work order pipeline:', error);
          throw new Error(`Database query failed: ${error.message}`);
        }

        if (!data) {
          console.warn('No data returned from work orders query');
          return [];
        }

        // Transform the data to match our pipeline structure with comprehensive null safety
        const transformedData = await Promise.all(
          (data || []).map(async (workOrder: any): Promise<WorkOrderPipelineItem> => {
            // Fetch additional data with separate queries for complex relationships
            const [reportsResult, invoicesResult] = await Promise.all([
              // Get latest report for this work order
              supabase
                .from('work_order_reports')
                .select('status, submitted_at, partner_billed_amount, partner_billed_at')
                .eq('work_order_id', workOrder.id)
                .order('submitted_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
              
              // Get subcontractor invoices for this work order
              supabase
                .from('subcontractor_bill_work_orders')
                .select(`
                  amount,
                  subcontractor_bills!inner(
                    id,
                    status,
                    total_amount,
                    submitted_at,
                    approved_at
                  )
                `)
                .eq('work_order_id', workOrder.id)
                .limit(1)
                .maybeSingle()
            ]);

            // Safe data extraction with fallbacks
            const latestReport = reportsResult.data;
            const subcontractorInvoiceData = invoicesResult.data;
            const subcontractorInvoice = subcontractorInvoiceData?.subcontractor_bills;

            // Safe amount calculation
            const totalInvoiceAmount = subcontractorInvoice?.total_amount 
              ? parseFloat(String(subcontractorInvoice.total_amount)) 
              : null;

            // Calculate derived fields with safe data
            const ageDays = calculateAgeDays(workOrder.created_at || new Date().toISOString());
            const overdueStatus = isOverdue(workOrder.due_date);
            const operationalStatus = calculateOperationalStatus(
              workOrder.status || 'received',
              latestReport?.status || null,
              workOrder.due_date,
              ageDays
            );
            const financialStatus = calculateFinancialStatus(
              subcontractorInvoice?.status || null,
              latestReport?.partner_billed_at ? 'billed' : null
            );

            return {
              // Core work order info with safe fallbacks
              id: workOrder.id || '',
              work_order_number: workOrder.work_order_number || null,
              title: workOrder.title || 'Untitled Work Order',
              description: workOrder.description || null,
              status: workOrder.status || 'received',
              store_location: workOrder.store_location || null,
              organization_id: workOrder.organization_id || null,
              date_submitted: workOrder.date_submitted || workOrder.created_at,
              created_at: workOrder.created_at || new Date().toISOString(),
              due_date: workOrder.due_date || null,
              priority: workOrder.priority || null,
              
              // Organization info with safe extraction
              partner_organization_name: workOrder.organizations?.name || null,
              assigned_organization_name: workOrder.assigned_organizations?.name || null,
              assigned_organization_id: workOrder.assigned_organization_id || null,
              assigned_organization_type: workOrder.assigned_organizations?.organization_type || null,
              
              // Financial tracking with safe number parsing
              estimated_hours: workOrder.estimated_hours || null,
              actual_hours: workOrder.actual_hours || null,
              materials_cost: workOrder.materials_cost || null,
              labor_cost: workOrder.labor_cost || null,
              subcontractor_invoice_amount: totalInvoiceAmount,
              
              // Timeline tracking
              date_assigned: workOrder.date_assigned || null,
              date_completed: workOrder.date_completed || null,
              
              // Latest report status with safe fallbacks
              report_status: latestReport?.status || null,
              report_submitted_at: latestReport?.submitted_at || null,
              
              // Invoice status (subcontractor billing)
              invoice_status: subcontractorInvoice?.status || null,
              invoice_submitted_at: subcontractorInvoice?.submitted_at || null,
              
              // Partner billing status with safe defaults
              internal_markup_percentage: workOrder.internal_markup_percentage || 30,
              partner_billed_amount: latestReport?.partner_billed_amount || null,
              partner_bill_status: latestReport?.partner_billed_at ? 'billed' : null,
              partner_billed_at: latestReport?.partner_billed_at || null,
              
              // Calculated fields
              age_days: ageDays,
              is_overdue: overdueStatus,
              operational_status: operationalStatus,
              financial_status: financialStatus,
            };
          })
        );

        return transformedData;

      } catch (error: any) {
        console.error('Critical error in useWorkOrderLifecycle:', error);
        throw new Error(`Pipeline data fetch failed: ${error.message || 'Unknown error'}`);
      }
    },
    enabled: !!user && !!profile && !!primaryRole,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Only retry on network errors, not authentication errors
      if (error?.message?.includes('User not authenticated')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}