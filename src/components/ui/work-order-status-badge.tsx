
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database["public"]["Enums"]["work_order_status"];

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
}

export const statusConfig: Record<WorkOrderStatus, { label: string; className: string }> = {
  received: { 
    label: 'Received', 
    className: 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  assigned: { 
    label: 'Assigned', 
    className: 'bg-gradient-to-r from-warning/20 to-warning/10 text-warning border-warning/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  estimate_needed: { 
    label: 'Estimate Needed', 
    className: 'bg-gradient-to-r from-orange-500/20 to-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  estimate_approved: { 
    label: 'Estimate Approved', 
    className: 'bg-gradient-to-r from-teal-500/20 to-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  in_progress: { 
    label: 'In Progress', 
    className: 'bg-gradient-to-r from-primary/30 to-primary/20 text-primary border-primary/40 shadow-md font-bold px-4 py-2 min-w-[120px] text-center animate-pulse' 
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-gradient-to-r from-success/20 to-success/10 text-success border-success/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  cancelled: { 
    label: 'Cancelled', 
    className: 'bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive border-destructive/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
};

/**
 * Reusable badge component for displaying work order status with consistent styling
 * across all views. Supports all work order statuses with proper dark mode variants.
 */
export const WorkOrderStatusBadge: React.FC<WorkOrderStatusBadgeProps> = ({ 
  status, 
  className 
}) => {
  const config = statusConfig[status];
  
  if (!config) {
    console.warn(`Unknown work order status: ${status}`);
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className={cn(config.className, "rounded-xl transition-all duration-300 hover:scale-105", className)}>
      {config.label}
    </Badge>
  );
};
