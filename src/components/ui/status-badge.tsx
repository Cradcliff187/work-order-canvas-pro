import React from 'react';
import { cn } from '@/lib/utils';
import { statusConfig, type EntityType } from '@/components/admin/shared/tableConfig';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Circle, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  Check,
  X
} from 'lucide-react';

interface StatusBadgeProps {
  type: EntityType;
  status: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  variant?: 'default' | 'outline';
  children?: React.ReactNode;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Work Order Status Icons
  received: Circle,
  assigned: Users,
  estimate_needed: FileText,
  estimate_pending_approval: Clock,
  estimate_approved: CheckCircle,
  in_progress: Clock,
  work_completed: CheckCircle,
  completed: CheckCircle,
  cancelled: XCircle,
  
  // Financial Status Icons
  pending: Circle,
  partially_invoiced: DollarSign,
  fully_invoiced: FileText,
  approved_for_payment: CheckCircle,
  paid: CheckCircle,
  dispute: AlertCircle,
  write_off: XCircle,
  
  // Computed Financial Status Icons
  not_billed: Circle,
  invoice_received: DollarSign,
  partially_billed: DollarSign, // Backward compatibility
  fully_billed: CheckCircle,
  
  // Priority Icons
  low: TrendingUp,
  medium: AlertCircle,
  high: AlertCircle,
  urgent: AlertCircle,
  
  // Report Status Icons
  submitted: Circle,
  reviewed: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  not_submitted: FileText,
  
  // User Role Icons
  admin: Users,
  partner: Users,
  subcontractor: Users,
  employee: Users,
  
  // Active Status Icons
  true: CheckCircle,
  false: XCircle,
  
  // Assignment Status Icons
  internal: Users,
  external: Users,
  unassigned: Circle,
  
  // Partner Billing Status Icons
  work_pending: Clock,
  report_pending: FileText,
  bill_needed: AlertCircle,
  bill_pending: Clock,
  ready: CheckCircle,
  billed: Check,
  null: X
};

export function StatusBadge({
  type,
  status,
  showIcon = false,
  size = 'default',
  className,
  variant = 'default',
  children
}: StatusBadgeProps) {
  const config = statusConfig[type]?.[status];
  
  const iconSizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const Icon = showIcon ? iconMap[status] : null;
  const fallbackText = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  if (!config) {
    // Fallback for unknown statuses
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={variant}
            className={cn(
              "inline-flex items-center gap-1.5 font-medium",
              size === "sm" && "h-5 text-xs px-2 max-w-[140px]",
              size === "default" && "h-6 text-xs px-2.5 max-w-[160px]", 
              size === "lg" && "h-7 text-sm px-3 max-w-[180px]",
              'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
              variant === 'outline' && 'bg-transparent',
              className
            )}
          >
            {showIcon && Icon && <Icon className={iconSizeClasses[size]} />}
            <span className="truncate">{fallbackText}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{fallbackText}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  const displayText = children || config.label;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={variant}
          className={cn(
            "inline-flex items-center gap-1.5 font-medium",
            size === "sm" && "h-5 text-xs px-2 max-w-[140px]",
            size === "default" && "h-6 text-xs px-2.5 max-w-[160px]", 
            size === "lg" && "h-7 text-sm px-3 max-w-[180px]",
            config.className,
            variant === 'outline' && 'bg-transparent',
            className
          )}
        >
          {showIcon && Icon && <Icon className={iconSizeClasses[size]} />}
          <span className="truncate">{displayText}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{displayText}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Export convenience components for common use cases
export function WorkOrderStatusBadge(props: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="workOrder" {...props} />;
}

export function FinancialStatusBadge(props: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="financialStatus" {...props} />;
}

export function PriorityBadge(props: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="priority" {...props} />;
}

export function UserRoleBadge(props: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="user" {...props} />;
}

export function ReportStatusBadge(props: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="report" {...props} />;
}

export function ActiveStatusBadge(props: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="activeStatus" {...props} />;
}

export function AssignedToStatusBadge(props: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="assignedTo" {...props} />;
}

export function ComputedFinancialStatusBadge(props: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="computedFinancialStatus" {...props} />;
}

export function PartnerBillingStatusBadge(props: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="partnerBilling" {...props} />;
}