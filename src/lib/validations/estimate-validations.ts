/**
 * Validation utilities for the estimate workflow
 */

import { Database } from "@/integrations/supabase/types";

type WorkOrder = Database['public']['Tables']['work_orders']['Row'];
type WorkOrderReport = Database['public']['Tables']['work_order_reports']['Row'];

export interface EstimateValidationResult {
  isValid: boolean;
  message?: string;
}

export interface VarianceInfo {
  percentage: number;
  color: 'green' | 'yellow' | 'red';
  severity: 'low' | 'medium' | 'high';
}

/**
 * Validates if work can start based on estimate requirements
 */
export function validateEstimateBeforeWork(workOrder: WorkOrder): EstimateValidationResult {
  // If work order doesn't require an estimate, allow transition
  if (workOrder.status !== 'estimate_needed') {
    return { isValid: true };
  }

  // If estimate is required but not approved, block transition
  if (!workOrder.partner_estimate_approved) {
    return {
      isValid: false,
      message: "Estimate must be approved by partner before work can begin"
    };
  }

  return { isValid: true };
}

/**
 * Validates if invoicing can proceed based on report approval
 */
export function validateReportBeforeInvoice(reports: WorkOrderReport[]): EstimateValidationResult {
  const unapprovedReports = reports.filter(report => report.status !== 'approved');
  
  if (unapprovedReports.length > 0) {
    return {
      isValid: false,
      message: "Report must be approved before invoicing"
    };
  }

  return { isValid: true };
}

/**
 * Calculate estimate variance and return color-coded information
 */
export function calculateEstimateVariance(estimateAmount: number, actualAmount: number): VarianceInfo {
  if (estimateAmount === 0) {
    return {
      percentage: 0,
      color: 'green',
      severity: 'low'
    };
  }

  const variance = ((actualAmount - estimateAmount) / estimateAmount) * 100;
  const absVariance = Math.abs(variance);

  let color: 'green' | 'yellow' | 'red';
  let severity: 'low' | 'medium' | 'high';

  if (absVariance < 10) {
    color = 'green';
    severity = 'low';
  } else if (absVariance <= 25) {
    color = 'yellow';
    severity = 'medium';
  } else {
    color = 'red';
    severity = 'high';
  }

  return {
    percentage: variance,
    color,
    severity
  };
}

/**
 * Format variance percentage for display
 */
export function formatVariance(variance: number): string {
  const sign = variance >= 0 ? '+' : '';
  return `${sign}${variance.toFixed(1)}%`;
}

/**
 * Check if work order has an internal estimate
 */
export function hasInternalEstimate(workOrder: WorkOrder): boolean {
  return !!(workOrder.internal_estimate_amount && workOrder.internal_estimate_amount > 0);
}

/**
 * Get estimate status based on work order state
 */
export function getEstimateStatus(workOrder: WorkOrder): 'none' | 'pending' | 'approved' | 'rejected' {
  if (!hasInternalEstimate(workOrder)) {
    return 'none';
  }

  if (workOrder.partner_estimate_approved === true) {
    return 'approved';
  }

  if (workOrder.partner_estimate_approved === false) {
    return 'rejected';
  }

  return 'pending';
}