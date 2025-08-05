
import React from 'react';
import { Database } from '@/integrations/supabase/types';
import { WorkOrderStatusBadge as UniversalWorkOrderStatusBadge } from './status-badge';

type WorkOrderStatus = Database["public"]["Enums"]["work_order_status"];

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
  showIcon?: boolean;
  mode?: 'badge' | 'full-width' | 'icon-text';
  size?: 'sm' | 'default' | 'lg';
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
  size = 'default'
}) => {
  return (
    <UniversalWorkOrderStatusBadge
      status={status}
      showIcon={showIcon}
      size={size}
      className={className}
    />
  );
};

