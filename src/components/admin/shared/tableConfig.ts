
import { type ClassValue } from "clsx";
import { cn } from "@/lib/utils";

// Status color mappings for consistent badge styling across admin tables
export const statusConfig = {
  workOrder: {
    received: {
      label: "Received",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    },
    assigned: {
      label: "Assigned", 
      className: "bg-blue-50 text-blue-600 border-blue-200"
    },
    estimate_needed: {
      label: "Estimate Needed",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    },
    estimate_approved: {
      label: "Estimate Approved",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-50 text-blue-600 border-blue-200"
    },
    work_completed: {
      label: "Work Completed",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200"
    },
    completed: {
      label: "Completed",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200"
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-50 text-red-600 border-red-200"
    }
  },
  financialStatus: {
    pending: {
      label: "Pending",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    },
    partially_invoiced: {
      label: "Invoice Received",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    },
    fully_invoiced: {
      label: "Invoiced",
      className: "bg-blue-50 text-blue-600 border-blue-200"
    },
    approved_for_payment: {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200"
    },
    paid: {
      label: "Invoice Paid",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200"
    },
    dispute: {
      label: "Dispute",
      className: "bg-red-50 text-red-600 border-red-200"
    },
    write_off: {
      label: "Write Off",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    }
  },
  operationalStatus: {
    assigned: {
      label: "Assigned",
      className: "bg-blue-50 text-blue-600 border-blue-200"
    },
    awaiting_estimate: {
      label: "Awaiting Estimate",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    },
    complete: {
      label: "Complete",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200"
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-50 text-blue-600 border-blue-200"
    },
    new: {
      label: "New",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    },
    reports_pending: {
      label: "Reports Pending",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    }
  },
  partnerBilling: {
    billed: {
      label: "Billed",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200"
    },
    invoice_needed: {
      label: "Invoice Needed",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    },
    invoice_pending: {
      label: "Invoice Pending",
      className: "bg-blue-50 text-blue-600 border-blue-200"
    },
    not_started: {
      label: "Not Started",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    },
    ready_to_bill: {
      label: "Ready to Bill",
      className: "bg-blue-50 text-blue-600 border-blue-200"
    },
    report_pending: {
      label: "Report Pending",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    }
  },
  // New computed financial status for pipeline views
  computedFinancialStatus: {
    not_billed: {
      label: "Not Invoiced",
      description: "No invoice has been received",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    },
    partially_billed: {
      label: "Invoice Received",
      description: "Invoice received but not yet paid",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    },
    invoice_received: {
      label: "Invoice Received", 
      description: "Invoice received but not yet paid",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    },
    fully_billed: {
      label: "Invoice Paid",
      description: "All invoices have been paid",
      className: "bg-blue-50 text-blue-600 border-blue-200"
    },
    paid: {
      label: "Invoice Paid",
      description: "All invoices have been paid",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200"
    }
  },
  priority: {
    low: {
      label: "Low",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    },
    medium: {
      label: "Medium",
      className: "bg-slate-100 text-slate-700 border-slate-300"
    },
    high: {
      label: "High",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    },
    urgent: {
      label: "Urgent",
      className: "bg-red-50 text-red-600 border-red-200"
    }
  },
  user: {
    admin: {
      label: "Admin",
      className: "bg-slate-100 text-slate-700 border-slate-300"
    },
    partner: {
      label: "Partner",
      className: "bg-slate-100 text-slate-700 border-slate-300"
    },
    subcontractor: {
      label: "Subcontractor",
      className: "bg-slate-100 text-slate-700 border-slate-300"
    },
    employee: {
      label: "Employee",
      className: "bg-slate-100 text-slate-700 border-slate-300"
    }
  },
  report: {
    submitted: {
      label: "Submitted",
      className: "bg-blue-50 text-blue-600 border-blue-200"
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-amber-50 text-amber-600 border-amber-200"
    },
    approved: {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200"
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-50 text-red-600 border-red-200"
    }
  },
  activeStatus: {
    true: {
      label: "Active",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200"
    },
    false: {
      label: "Inactive",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    }
  },
  assignedTo: {
    internal: {
      label: "Internal",
      className: "bg-blue-50 text-blue-700 border-blue-200"
    },
    external: {
      label: "External", 
      className: "bg-emerald-50 text-emerald-700 border-emerald-200"
    },
    unassigned: {
      label: "Unassigned",
      className: "bg-red-50 text-red-700 border-red-200"
    }
  }
} as const;

// Table utility functions for consistent styling and alignment
export const tableUtils = {
  // Standard cell classes with checkbox support
  getCellClasses: (...classes: ClassValue[]) => cn(
    "p-4 align-middle [&:has([role=checkbox])]:pr-0 [&:has([role=checkbox])]:pl-3",
    classes
  ),

  // Standard header classes with checkbox support
  getHeaderClasses: (...classes: ClassValue[]) => cn(
    "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&:has([role=checkbox])]:pl-3",
    classes
  ),

  // Checkbox cell classes for proper alignment
  getCheckboxCellClasses: (...classes: ClassValue[]) => cn(
    "w-[40px] pl-3 pr-0 align-middle",
    classes
  ),

  // Ensure checkboxes are vertically centered
  getCheckboxClasses: (...classes: ClassValue[]) => cn(
    "translate-y-[1px]", // Fine-tune vertical alignment
    classes
  ),
};

// Flexible status mapping utilities
export const statusUtils = {
  // Get display configuration for any status type
  getStatusConfig: (statusType: keyof typeof statusConfig, statusValue: string) => {
    const config = statusConfig[statusType] as any;
    return config?.[statusValue] || null;
  },

  // Map computed statuses to display-friendly terms
  mapComputedFinancialStatus: (computedStatus: string) => {
    const mapping: Record<string, string> = {
      'not_billed': 'not_billed',
      'partially_billed': 'invoice_received',
      'fully_billed': 'paid',
      'paid': 'paid'
    };
    return mapping[computedStatus] || computedStatus;
  },

  // Get filter options for computed financial status
  getComputedFinancialFilterOptions: () => [
    { value: 'not_billed', label: 'Not Invoiced' },
    { value: 'invoice_received', label: 'Invoice Received' },
    { value: 'paid', label: 'Invoice Paid' }
  ]
};

// Export types for type safety
export type EntityType = keyof typeof statusConfig;
export type WorkOrderStatus = keyof typeof statusConfig.workOrder;
export type FinancialStatus = keyof typeof statusConfig.financialStatus;
export type OperationalStatus = keyof typeof statusConfig.operationalStatus;
export type PartnerBillingStatus = keyof typeof statusConfig.partnerBilling;
export type ComputedFinancialStatus = keyof typeof statusConfig.computedFinancialStatus;
export type Priority = keyof typeof statusConfig.priority;
export type RoleType = keyof typeof statusConfig.user;
export type ReportStatus = keyof typeof statusConfig.report;
export type ActiveStatus = keyof typeof statusConfig.activeStatus;
export type AssignedToStatus = keyof typeof statusConfig.assignedTo;