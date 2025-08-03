
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
    className: 'bg-primary/5 text-primary border-l-4 border-primary border-primary/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  assigned: { 
    label: 'Assigned', 
    className: 'bg-warning/5 text-warning border-l-4 border-warning border-warning/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  estimate_needed: { 
    label: 'Estimate Needed', 
    className: 'bg-orange-500/5 text-orange-700 dark:text-orange-400 border-l-4 border-orange-500 border-orange-500/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  estimate_approved: { 
    label: 'Estimate Approved', 
    className: 'bg-teal-500/5 text-teal-700 dark:text-teal-400 border-l-4 border-teal-500 border-teal-500/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  in_progress: { 
    label: 'In Progress', 
    className: 'bg-primary/10 text-primary border-l-4 border-primary border-primary/40 shadow-md font-bold px-4 py-2 min-w-[120px] text-center animate-pulse' 
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-success/5 text-success border-l-4 border-success border-success/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
  },
  cancelled: { 
    label: 'Cancelled', 
    className: 'bg-destructive/5 text-destructive border-l-4 border-destructive border-destructive/30 shadow-sm font-semibold px-4 py-2 min-w-[120px] text-center' 
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
    <Badge variant="outline" className={cn(config.className, "rounded-xl transition-all duration-200 hover:scale-105", className)}>
      {config.label}
    </Badge>
  );
};
