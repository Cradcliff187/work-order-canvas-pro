import { type ClassValue } from "clsx";
import { cn } from "@/lib/utils";

// Status color mappings for consistent badge styling across admin tables
export const statusConfig = {
  workOrder: {
    received: {
      label: "Received",
      className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
    },
    assigned: {
      label: "Assigned", 
      className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
    },
    estimate_needed: {
      label: "Estimate Needed",
      className: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400"
    },
    estimate_approved: {
      label: "Estimate Approved",
      className: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 dark:bg-teal-900/20 dark:text-teal-400"
    },
    in_progress: {
      label: "In Progress",
      className: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
    },
    work_completed: {
      label: "Work Completed",
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
    }
  },
  financialStatus: {
    pending: {
      label: "Pending",
      className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-900/20 dark:text-gray-400"
    },
    partially_invoiced: {
      label: "Partial Invoice",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
    },
    fully_invoiced: {
      label: "Invoiced",
      className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
    },
    approved_for_payment: {
      label: "Approved",
      className: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 dark:bg-teal-900/20 dark:text-teal-400"
    },
    paid: {
      label: "Paid",
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    dispute: {
      label: "Dispute",
      className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
    },
    write_off: {
      label: "Write Off",
      className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-900/20 dark:text-gray-400"
    }
  },
  priority: {
    low: {
      label: "Low",
      className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-900/20 dark:text-gray-400"
    },
    medium: {
      label: "Medium",
      className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
    },
    high: {
      label: "High",
      className: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
    },
    urgent: {
      label: "Urgent",
      className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
    }
  },
  user: {
    admin: {
      label: "Admin",
      className: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400"
    },
    partner: {
      label: "Partner",
      className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
    },
    subcontractor: {
      label: "Subcontractor",
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    employee: {
      label: "Employee",
      className: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
    }
  },
  report: {
    submitted: {
      label: "Submitted",
      className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
    }
  },
  activeStatus: {
    true: {
      label: "Active",
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    false: {
      label: "Inactive",
      className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }
} as const;

// Common table utilities
export const tableUtils = {
  // Get status configuration for a specific entity type and status
  getStatusConfig: (entityType: keyof typeof statusConfig, status: string) => {
    const entityConfig = statusConfig[entityType] as Record<string, { label: string; className: string }>;
    return entityConfig[status] || {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      className: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/20 dark:text-gray-400"
    };
  },

  // Common table row classes
  getRowClasses: (...classes: ClassValue[]) => cn(
    "border-b smooth-transition-colors md:hover:bg-muted/50 data-[state=selected]:bg-muted",
    ...classes
  ),

  // Common table cell classes  
  getCellClasses: (...classes: ClassValue[]) => cn(
    "p-4 align-middle [&:has([role=checkbox])]:pr-0",
    ...classes
  ),

  // Common table header classes
  getHeaderClasses: (...classes: ClassValue[]) => cn(
    "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
    ...classes
  )
};

// Universal badge component that enforces consistency
export const getStatusBadge = (
  type: keyof typeof statusConfig,
  status: string,
  options?: {
    showIcon?: boolean;
    size?: 'sm' | 'default' | 'lg';
    className?: string;
  }
) => {
  const config = statusConfig[type]?.[status];
  if (!config) return null;
  
  const sizeClasses = {
    sm: 'h-5 text-[10px] px-1.5',
    default: 'h-6 text-xs px-2',
    lg: 'h-7 text-sm px-3'
  };
  
  return {
    label: config.label,
    className: cn(
      'inline-flex items-center font-medium rounded-md border',
      sizeClasses[options?.size || 'default'],
      config.className,
      options?.className
    )
  };
};

// Export types for type safety
export type EntityType = keyof typeof statusConfig;
export type WorkOrderStatus = keyof typeof statusConfig.workOrder;
export type FinancialStatus = keyof typeof statusConfig.financialStatus;
export type Priority = keyof typeof statusConfig.priority;
export type RoleType = keyof typeof statusConfig.user;
export type ReportStatus = keyof typeof statusConfig.report;
export type ActiveStatus = keyof typeof statusConfig.activeStatus;