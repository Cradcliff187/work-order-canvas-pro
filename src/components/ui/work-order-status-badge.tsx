
import React from 'react';
import { Database } from '@/integrations/supabase/types';
import { StatusIndicator } from './status-indicator';

type WorkOrderStatus = Database["public"]["Enums"]["work_order_status"];

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
  showIcon?: boolean;
  mode?: 'badge' | 'full-width' | 'icon-text';
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Reusable badge component for displaying work order status with consistent styling
 * across all views. Supports all work order statuses with proper dark mode variants.
 * Now uses the enhanced StatusIndicator component internally.
 */
export const WorkOrderStatusBadge: React.FC<WorkOrderStatusBadgeProps> = ({ 
  status, 
  className,
  showIcon = true,
  mode = 'badge',
  size = 'default'
}) => {
  return (
    <StatusIndicator
      status={status}
      type="work_order"
      mode={mode}
      showIcon={showIcon}
      size={size}
      className={className}
    />
  );
};

// Export status config for backward compatibility
export { workOrderStatusConfig as statusConfig } from './status-indicator';
