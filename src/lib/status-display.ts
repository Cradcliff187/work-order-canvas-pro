import { Database } from '@/integrations/supabase/types';
import { hasInternalEstimate } from '@/lib/validations/estimate-validations';

// Flexible WorkOrder interface for status display functions
interface WorkOrderForStatus {
  internal_estimate_amount?: number | null;
  partner_estimate_approved?: boolean | null;
  subcontractor_estimate_amount?: number | null;
}

// Type that satisfies both our interface and the validation function requirements
type WorkOrderInput = WorkOrderForStatus & Partial<Database['public']['Tables']['work_orders']['Row']>;

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];
type UserRole = 'admin' | 'partner' | 'subcontractor' | 'employee';

interface StatusDisplay {
  label: string;
  description?: string;
}

/**
 * Translates technical work order statuses to partner-friendly labels
 * 
 * Partners see user-friendly labels like "Pending Your Approval" instead of 
 * technical database values like "estimate_needed". This improves the partner
 * experience by using business language instead of system terminology.
 * 
 * @param status - The database status enum value (e.g., 'estimate_needed')
 * @param workOrder - Work order object with estimate data for context
 * @returns Partner-friendly status label or falls back to mapped technical label
 * 
 * @example
 * // Partner with pending estimate approval
 * getPartnerFriendlyStatus('estimate_needed', { internal_estimate_amount: 1000 })
 * // Returns: "Pending Your Approval"
 * 
 * @example  
 * // Partner without estimate ready
 * getPartnerFriendlyStatus('estimate_needed', { internal_estimate_amount: null })
 * // Returns: "Preparing Estimate"
 */
export function getPartnerFriendlyStatus(
  status: WorkOrderStatus,
  workOrder: WorkOrderInput
): string {
  // Special handling for estimate-related statuses when viewed by partners
  if (status === 'estimate_needed') {
    // Use our own check for internal estimate to avoid type issues
    if (workOrder.internal_estimate_amount && workOrder.internal_estimate_amount > 0) {
      // Partner needs to approve the estimate we've prepared
      return 'Pending Your Approval';
    }
    // We're still preparing the estimate
    return 'Preparing Estimate';
  }
  
  if (status === 'estimate_approved') {
    return 'Approved - Ready to Start';
  }
  
  // Default status labels for all other statuses
  const statusLabels: Record<WorkOrderStatus, string> = {
    'received': 'New',
    'assigned': 'Assigned', 
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'estimate_needed': 'Estimate Needed',
    'estimate_approved': 'Estimate Approved'
  };
  
  return statusLabels[status] || status;
}

// Tab status helper for visual indicators
export interface EstimateTabStatus {
  showBadge: boolean;
  badgeVariant?: 'warning' | 'success' | 'destructive';
  badgeText?: string;
  pulseAnimation?: boolean;
}

/**
 * Determines estimate tab display status and badge information for partners
 * 
 * Analyzes work order estimate data to determine what badge (if any) should be
 * shown on the estimate tab. Returns null if no estimate exists, otherwise
 * provides badge styling and animation configuration.
 * 
 * @param workOrder - Work order object with estimate amounts and approval status
 * @returns EstimateTabStatus object with badge configuration, or null if no estimate
 * 
 * @example
 * // Work order with pending estimate approval
 * getEstimateTabStatus({ internal_estimate_amount: 1000, partner_estimate_approved: null })
 * // Returns: { showBadge: true, badgeVariant: 'warning', badgeText: 'Action Required', pulseAnimation: true }
 */
export function getEstimateTabStatus(workOrder: WorkOrderInput): EstimateTabStatus | null {
  // Don't show estimate tab if no internal estimate exists
  if (!(workOrder.internal_estimate_amount && workOrder.internal_estimate_amount > 0)) {
    return null;
  }
  
  // Pending approval - needs partner action
  if (workOrder.partner_estimate_approved === null) {
    return {
      showBadge: true,
      badgeVariant: 'warning',
      badgeText: 'Action Required',
      pulseAnimation: true
    };
  }
  
  // Estimate approved
  if (workOrder.partner_estimate_approved === true) {
    return {
      showBadge: true,
      badgeVariant: 'success',
      badgeText: 'Approved',
      pulseAnimation: false
    };
  }
  
  // Estimate rejected
  if (workOrder.partner_estimate_approved === false) {
    return {
      showBadge: true,
      badgeVariant: 'destructive',
      badgeText: 'Rejected',
      pulseAnimation: false
    };
  }
  
  return { showBadge: false };
}