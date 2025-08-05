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
  
  // Priority Icons
  low: TrendingUp,
  medium: AlertCircle,
  high: AlertCircle,
  urgent: AlertCircle
};

export function StatusBadge({
  type,
  status,
  showIcon = false,
  size = 'default',
  className,
  variant = 'default'
}: StatusBadgeProps) {
  const config = statusConfig[type]?.[status];
  
  if (!config) {
    // Fallback for unknown statuses
    return (
      <Badge variant="outline" className={className}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  }
  
  const sizeClasses = {
    sm: 'h-5 text-[10px] px-1.5 gap-1',
    default: 'h-6 text-xs px-2 gap-1.5',
    lg: 'h-7 text-sm px-3 gap-2'
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    default: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };
  
  const Icon = showIcon ? iconMap[status] : null;
  
  return (
    <div
      className={cn(
        'inline-flex items-center font-medium rounded-md border smooth-transition-colors',
        sizeClasses[size],
        config.className,
        variant === 'outline' && 'bg-transparent',
        className
      )}
    >
      {Icon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </div>
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