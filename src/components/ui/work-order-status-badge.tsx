
import React from 'react';
import { Database } from '@/integrations/supabase/types';
import { WorkOrderStatusBadge as UniversalWorkOrderStatusBadge } from './status-badge';
import { Badge } from './badge';

type WorkOrderStatus = Database["public"]["Enums"]["work_order_status"];

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
  showIcon?: boolean;
  mode?: 'badge' | 'full-width' | 'icon-text';
  size?: 'sm' | 'default' | 'lg';
  showEstimateIndicator?: boolean;
  workOrder?: any;
}

/**
 * Legacy wrapper for WorkOrderStatusBadge - now uses the universal StatusBadge system.
 * This component is maintained for backward compatibility.
 * @deprecated Use WorkOrderStatusBadge from '@/components/ui/status-badge' directly.
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

