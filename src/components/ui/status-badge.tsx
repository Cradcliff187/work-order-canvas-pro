import React from 'react';
import { cn } from '@/lib/utils';
import { statusConfig, type EntityType } from '@/components/admin/shared/tableConfig';
import { Badge } from '@/components/ui/badge';
import { 
  Circle, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle,
  DollarSign,
  FileText,
  TrendingUp,
  Users
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
  unassigned: Circle
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
  
  const sizeClasses = {
    sm: {
      text: 'text-xs',
      padding: 'px-2 py-1',
      icon: 'h-3 w-3',
      height: 'h-6',
      minWidth: 'min-w-[80px]'
    },
    default: {
      text: 'text-xs',
      padding: 'px-3 py-1.5',
      icon: 'h-4 w-4',
      height: 'h-7',
      minWidth: 'min-w-[100px]'
    },
    lg: {
      text: 'text-sm',
      padding: 'px-4 py-2',
      icon: 'h-5 w-5',
      height: 'h-10',
      minWidth: 'min-w-[120px]'
    }
  };
  
  if (!config) {
    // Fallback for unknown statuses
    return (
      <Badge 
        variant={variant}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-md border transition-colors text-center',
          sizeClasses[size].padding,
          sizeClasses[size].height,
          sizeClasses[size].minWidth,
          'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          variant === 'outline' && 'bg-transparent',
          className
        )}
      >
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  }
  
  const Icon = showIcon ? iconMap[status] : null;
  
  return (
    <Badge
      variant={variant}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md border transition-colors text-center',
        sizeClasses[size].padding,
        sizeClasses[size].height,
        sizeClasses[size].minWidth,
        config.className,
        variant === 'outline' && 'bg-transparent',
        className
      )}
    >
      {Icon && <Icon className={sizeClasses[size].icon} />}
      <span>{children || config.label}</span>
    </Badge>
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