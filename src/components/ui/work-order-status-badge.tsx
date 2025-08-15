import React from 'react';
import { Database } from '@/integrations/supabase/types';
import { WorkOrderStatusBadge as UniversalWorkOrderStatusBadge } from './status-badge';
import { Badge } from './badge';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getPartnerFriendlyStatus } from '@/lib/status-display';

// Flexible WorkOrder interface for status badge - accepts any object with required estimate fields
interface WorkOrderForBadge {
  internal_estimate_amount?: number | null;
  partner_estimate_approved?: boolean | null;
  subcontractor_estimate_amount?: number | null;
  [key: string]: any; // Allow additional properties for compatibility
}

type WorkOrderStatus = Database["public"]["Enums"]["work_order_status"];

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
  showIcon?: boolean;
  mode?: 'badge' | 'full-width' | 'icon-text';
  size?: 'sm' | 'default' | 'lg';
  showEstimateIndicator?: boolean;
  workOrder?: WorkOrderForBadge;
}

/**
 * Enhanced WorkOrderStatusBadge with partner-friendly display
 * Shows role-aware status labels for better partner experience
 */
const WorkOrderStatusBadgeComponent: React.FC<WorkOrderStatusBadgeProps> = ({ 
  status, 
  className,
  showIcon = true,
  mode = 'badge',
  size = 'default',
  showEstimateIndicator = false,
  workOrder
}) => {
  const { isPartner } = useUserProfile();
  
  // Get partner-friendly label if user is a partner and workOrder data is available
  const displayLabel = React.useMemo(() => {
    if (!workOrder || !isPartner()) return null;
    return getPartnerFriendlyStatus(status, workOrder);
  }, [
    isPartner, 
    status, 
    workOrder?.internal_estimate_amount,
    workOrder?.partner_estimate_approved,
    workOrder?.subcontractor_estimate_amount
  ]);
  
  // Memoize badge variant calculation
  const badgeVariant = React.useMemo(() => {
    if (!displayLabel) return 'default';
    if (displayLabel.includes('Approval')) return 'warning';
    if (displayLabel.includes('Approved')) return 'success';
    if (displayLabel.includes('Preparing')) return 'secondary';
    return 'default';
  }, [displayLabel]);
  
  // Memoize icon selection
  const statusIcon = React.useMemo(() => {
    if (!showIcon || !displayLabel) return null;
    if (displayLabel.includes('Approval')) return '⚠️';
    if (displayLabel.includes('Approved')) return '✅';
    if (displayLabel.includes('Preparing')) return '⏳';
    return '';
  }, [showIcon, displayLabel]);
  
  // Memoize estimate indicator to avoid duplicate logic
  const estimateIndicator = React.useMemo(() => {
    if (!showEstimateIndicator || !workOrder) return null;
    return (
      <div className="flex gap-1 mt-1">
        {workOrder.subcontractor_estimate_amount && (
          <Badge variant="outline" className="text-xs">
            SC: ${workOrder.subcontractor_estimate_amount}
          </Badge>
        )}
        {workOrder.internal_estimate_amount && (
          <Badge variant="outline" className="text-xs">
            Est: ${workOrder.internal_estimate_amount}
          </Badge>
        )}
        {workOrder.partner_estimate_approved === true && (
          <Badge variant="success" className="text-xs">
            ✓ Approved
          </Badge>
        )}
        {workOrder.partner_estimate_approved === false && (
          <Badge variant="destructive" className="text-xs">
            ✗ Rejected
          </Badge>
        )}
      </div>
    );
  }, [
    showEstimateIndicator,
    workOrder?.subcontractor_estimate_amount,
    workOrder?.internal_estimate_amount,
    workOrder?.partner_estimate_approved
  ]);
  
  // Override the status text for partners
  if (displayLabel && displayLabel !== status) {
    return (
      <div>
        <Badge variant={badgeVariant} className={className}>
          {statusIcon && <span className="mr-1">{statusIcon}</span>}
          {displayLabel}
        </Badge>
        {estimateIndicator}
      </div>
    );
  }
  
  // Default behavior for non-partners or when no workOrder data
  return (
    <div>
      <UniversalWorkOrderStatusBadge
        status={status}
        showIcon={showIcon}
        size={size}
        className={className}
      />
      {estimateIndicator}
    </div>
  );
};

// Wrap with React.memo for performance optimization
export const WorkOrderStatusBadge = React.memo(WorkOrderStatusBadgeComponent);
WorkOrderStatusBadge.displayName = 'WorkOrderStatusBadge';