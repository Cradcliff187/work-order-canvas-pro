
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
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700' 
  },
  assigned: { 
    label: 'Assigned', 
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700' 
  },
  estimate_needed: { 
    label: 'Estimate Needed', 
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700' 
  },
  estimate_approved: { 
    label: 'Estimate Approved', 
    className: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-700' 
  },
  in_progress: { 
    label: 'In Progress', 
    className: 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/30' 
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700' 
  },
  cancelled: { 
    label: 'Cancelled', 
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700' 
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
    <Badge variant="outline" className={cn(config.className, "px-3 py-1", className)}>
      {config.label}
    </Badge>
  );
};
