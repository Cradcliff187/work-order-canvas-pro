
// Status color mappings for consistent badge styling across admin tables
export const statusConfig = {
  workOrder: {
    received: {
      label: "Received",
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-300"
    },
    assigned: {
      label: "Assigned", 
      className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/10 dark:text-amber-300"
    },
    estimate_needed: {
      label: "Estimate Needed",
      className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/10 dark:text-purple-300"
    },
    estimate_approved: {
      label: "Estimate Approved",
      className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/10 dark:text-teal-300"
    },
    in_progress: {
      label: "In Progress",
      className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/10 dark:text-orange-300"
    },
    work_completed: {
      label: "Work Completed",
      className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300"
    },
    completed: {
      label: "Completed",
      className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300"
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300"
    }
  },
  financialStatus: {
    pending: {
      label: "Pending",
      className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/10 dark:text-gray-300"
    },
    partially_invoiced: {
      label: "Partial Invoice",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/10 dark:text-yellow-300"
    },
    fully_invoiced: {
      label: "Invoiced",
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-300"
    },
    approved_for_payment: {
      label: "Approved",
      className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/10 dark:text-teal-300"
    },
    paid: {
      label: "Paid",
      className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300"
    },
    dispute: {
      label: "Dispute",
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300"
    },
    write_off: {
      label: "Write Off",
      className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/10 dark:text-gray-300"
    }
  },
  priority: {
    low: {
      label: "Low",
      className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/10 dark:text-gray-300"
    },
    medium: {
      label: "Medium",
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-300"
    },
    high: {
      label: "High",
      className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/10 dark:text-orange-300"
    },
    urgent: {
      label: "Urgent",
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300"
    }
  },
  user: {
    admin: {
      label: "Admin",
      className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/10 dark:text-purple-300"
    },
    partner: {
      label: "Partner",
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-300"
    },
    subcontractor: {
      label: "Subcontractor",
      className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300"
    },
    employee: {
      label: "Employee",
      className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/10 dark:text-orange-300"
    }
  },
  report: {
    submitted: {
      label: "Submitted",
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-300"
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/10 dark:text-yellow-300"
    },
    approved: {
      label: "Approved",
      className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300"
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300"
    }
  },
  activeStatus: {
    true: {
      label: "Active",
      className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300"
    },
    false: {
      label: "Inactive",
      className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/10 dark:text-gray-300"
    }
  }
} as const;


// Export types for type safety
export type EntityType = keyof typeof statusConfig;
export type WorkOrderStatus = keyof typeof statusConfig.workOrder;
export type FinancialStatus = keyof typeof statusConfig.financialStatus;
export type Priority = keyof typeof statusConfig.priority;
export type RoleType = keyof typeof statusConfig.user;
export type ReportStatus = keyof typeof statusConfig.report;
export type ActiveStatus = keyof typeof statusConfig.activeStatus;