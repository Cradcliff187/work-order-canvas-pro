import { Database } from '@/integrations/supabase/types';
import { hasInternalEstimate } from '@/lib/validations/estimate-validations';
// Minimal WorkOrder interface for status display functions
interface WorkOrderForStatus {
  internal_estimate_amount?: number | null;
  partner_estimate_approved?: boolean | null;
  subcontractor_estimate_amount?: number | null;
}

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];
type UserRole = 'admin' | 'partner' | 'subcontractor' | 'employee';

interface StatusDisplay {
  label: string;
  description?: string;
}

export function getPartnerFriendlyStatus(
  status: WorkOrderStatus,
  workOrder: WorkOrderForStatus
): string {
  // Special handling for estimate-related statuses when viewed by partners
  if (status === 'estimate_needed') {
    if (hasInternalEstimate(workOrder)) {
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

export function getEstimateTabStatus(workOrder: WorkOrderForStatus): EstimateTabStatus | null {
  // Don't show estimate tab if no internal estimate exists
  if (!hasInternalEstimate(workOrder)) {
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