import React from 'react';
import { Database } from '@/integrations/supabase/types';
import { WorkOrderStatusBadge as UniversalWorkOrderStatusBadge } from './status-badge';
import { Badge } from './badge';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getPartnerFriendlyStatus } from '@/lib/status-display';
// Minimal WorkOrder interface for status badge
interface WorkOrderForBadge {
  internal_estimate_amount?: number | null;
  partner_estimate_approved?: boolean | null;
  subcontractor_estimate_amount?: number | null;
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
export const WorkOrderStatusBadge: React.FC<WorkOrderStatusBadgeProps> = ({ 
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
    if (isPartner() && workOrder) {
      return getPartnerFriendlyStatus(status, workOrder);
    }
    return null;
  }, [isPartner, status, workOrder]);
  
  // Override the status text for partners
  if (displayLabel && displayLabel !== status) {
    return (
      <div>
        <Badge 
          variant={
            displayLabel.includes('Approval') ? 'warning' :
            displayLabel.includes('Approved') ? 'success' :
            displayLabel.includes('Preparing') ? 'secondary' :
            'default'
          }
          className={className}
        >
          {showIcon && <span className="mr-1">
            {displayLabel.includes('Approval') ? '⚠️' :
             displayLabel.includes('Approved') ? '✅' :
             displayLabel.includes('Preparing') ? '⏳' :
             ''}
          </span>}
          {displayLabel}
        </Badge>
        {showEstimateIndicator && workOrder && (
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
        )}
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
      {showEstimateIndicator && workOrder && (
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
      )}
    </div>
  );
};