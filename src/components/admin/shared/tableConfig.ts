import { type ClassValue } from "clsx";
import { cn } from "@/lib/utils";

// Status color mappings for consistent badge styling across admin tables
export const statusConfig = {
  workOrder: {
    received: {
      label: "Received",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
    },
    assigned: {
      label: "Assigned", 
      className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
    },
    in_progress: {
      label: "In Progress",
      className: "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
    }
  },
  user: {
    admin: {
      label: "Admin",
      className: "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400"
    },
    partner: {
      label: "Partner",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
    },
    subcontractor: {
      label: "Subcontractor",
      className: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    employee: {
      label: "Employee",
      className: "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
    }
  },
  report: {
    submitted: {
      label: "Submitted",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
    }
  },
  activeStatus: {
    true: {
      label: "Active",
      className: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
    },
    false: {
      label: "Inactive",
      className: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/20 dark:text-gray-400"
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

// Export types for type safety
export type EntityType = keyof typeof statusConfig;
export type WorkOrderStatus = keyof typeof statusConfig.workOrder;
export type UserType = keyof typeof statusConfig.user;
export type ReportStatus = keyof typeof statusConfig.report;
export type ActiveStatus = keyof typeof statusConfig.activeStatus;