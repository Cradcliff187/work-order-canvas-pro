import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Circle, 
  Pause, 
  XCircle,
  FileText,
  UserCheck,
  Zap
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database["public"]["Enums"]["work_order_status"];
type ReportStatus = "submitted" | "reviewed" | "approved" | "rejected";
type InvoiceStatus = "pending" | "approved" | "rejected" | "paid";

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

// Work Order Status Configuration
const workOrderStatusConfig: Record<WorkOrderStatus, StatusConfig> = {
  received: {
    label: 'Received',
    icon: Circle,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary'
  },
  assigned: {
    label: 'Assigned',
    icon: UserCheck,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning'
  },
  estimate_needed: {
    label: 'Estimate Needed',
    icon: FileText,
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500'
  },
  estimate_approved: {
    label: 'Estimate Approved',
    icon: CheckCircle,
    colorClass: 'text-teal-600 dark:text-teal-400',
    bgClass: 'bg-teal-500/10',
    borderClass: 'border-teal-500'
  },
  in_progress: {
    label: 'In Progress',
    icon: Zap,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary'
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success'
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive'
  }
};

// Report Status Configuration
const reportStatusConfig: Record<ReportStatus, StatusConfig> = {
  submitted: {
    label: 'Submitted',
    icon: Clock,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning'
  },
  reviewed: {
    label: 'Reviewed',
    icon: AlertCircle,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary'
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success'
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive'
  }
};

// Invoice Status Configuration
const invoiceStatusConfig: Record<InvoiceStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning'
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success'
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive'
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle,
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success'
  }
};

type StatusType = 'work_order' | 'report' | 'invoice';

interface StatusIndicatorProps {
  status: WorkOrderStatus | ReportStatus | InvoiceStatus | string;
  type?: StatusType;
  mode?: 'badge' | 'full-width' | 'icon-text' | 'progress';
  progress?: number; // For progress mode (0-100)
  showIcon?: boolean;
  showPulse?: boolean; // For urgent/in-progress statuses
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function StatusIndicator({
  status,
  type = 'work_order',
  mode = 'badge',
  progress,
  showIcon = true,
  showPulse = false,
  size = 'default',
  className
}: StatusIndicatorProps) {
  const getConfig = (): StatusConfig => {
    const configMap = {
      work_order: workOrderStatusConfig,
      report: reportStatusConfig,
      invoice: invoiceStatusConfig
    };

    const config = configMap[type][status as keyof typeof configMap[typeof type]];
    
    if (!config) {
      // Fallback for unknown statuses
      return {
        label: status.replace('_', ' '),
        icon: Circle,
        colorClass: 'text-muted-foreground',
        bgClass: 'bg-muted/20',
        borderClass: 'border-muted'
      };
    }
    
    return config;
  };

  const config = getConfig();
  const IconComponent = config.icon;

  // Auto-enable pulse for certain statuses
  const shouldPulse = showPulse || status === 'in_progress' || status === 'submitted';

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          text: 'text-xs',
          padding: 'px-2 py-1',
          icon: 'h-3 w-3',
          height: 'h-6'
        };
      case 'lg':
        return {
          text: 'text-sm',
          padding: 'px-4 py-2',
          icon: 'h-5 w-5',
          height: 'h-10'
        };
      default:
        return {
          text: 'text-xs',
          padding: 'px-3 py-1.5',
          icon: 'h-4 w-4',
          height: 'h-7'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (mode === 'progress' && typeof progress === 'number') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showIcon && (
              <IconComponent className={cn(sizeClasses.icon, config.colorClass)} />
            )}
            <span className={cn("font-medium", sizeClasses.text, config.colorClass)}>
              {config.label}
            </span>
          </div>
          <span className={cn("font-mono", sizeClasses.text, config.colorClass)}>
            {progress}%
          </span>
        </div>
        <Progress 
          value={progress} 
          className="h-2"
        />
      </div>
    );
  }

  if (mode === 'full-width') {
    return (
      <div className={cn(
        "w-full rounded-lg border-l-4 transition-all duration-200",
        config.borderClass,
        config.bgClass,
        sizeClasses.padding,
        sizeClasses.height,
        "flex items-center justify-between",
        shouldPulse && "animate-pulse",
        className
      )}>
        <div className="flex items-center gap-3">
          {showIcon && (
            <IconComponent className={cn(sizeClasses.icon, config.colorClass)} />
          )}
          <span className={cn("font-semibold", sizeClasses.text, config.colorClass)}>
            {config.label}
          </span>
        </div>
      </div>
    );
  }

  if (mode === 'icon-text') {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 rounded-md transition-all duration-200",
        sizeClasses.padding,
        config.bgClass,
        shouldPulse && "animate-pulse",
        className
      )}>
        {showIcon && (
          <IconComponent className={cn(sizeClasses.icon, config.colorClass)} />
        )}
        <span className={cn("font-medium", sizeClasses.text, config.colorClass)}>
          {config.label}
        </span>
      </div>
    );
  }

  // Default badge mode - enhanced version of existing WorkOrderStatusBadge
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "transition-all duration-200 hover:scale-105 rounded-xl font-semibold",
        "border-l-4 shadow-sm min-w-[120px] text-center",
        config.bgClass,
        config.colorClass,
        config.borderClass,
        sizeClasses.padding,
        sizeClasses.height,
        shouldPulse && "animate-pulse",
        className
      )}
    >
      <div className="flex items-center gap-2 justify-center">
        {showIcon && (
          <IconComponent className={cn(sizeClasses.icon)} />
        )}
        {config.label}
      </div>
    </Badge>
  );
}

// Export status configurations for use in other components
export { workOrderStatusConfig, reportStatusConfig, invoiceStatusConfig };

// Utility function for backward compatibility
export function getWorkOrderStatusColor(status: WorkOrderStatus): string {
  const config = workOrderStatusConfig[status];
  if (!config) return 'bg-gray-100 text-gray-800 border-gray-200';
  
  // Return old-style class string for backward compatibility
  return `${config.bgClass.replace('/10', '/5')} ${config.colorClass} ${config.borderClass.replace('border-', 'border-')}/30`;
}