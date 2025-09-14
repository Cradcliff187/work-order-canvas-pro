import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  Mail, 
  CheckCircle, 
  Clock,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface InvoiceStatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  sentAt?: string | null;
  paidAt?: string | null;
}

const statusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    icon: FileText,
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300',
    icon: Mail,
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    icon: AlertCircle,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300',
    icon: Clock,
  },
};

export function InvoiceStatusBadge({ 
  status, 
  showIcon = false, 
  size = 'default',
  className,
  sentAt,
  paidAt
}: InvoiceStatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = showIcon && config?.icon ? config.icon : null;
  
  const iconSizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  const sizeClasses = {
    sm: 'h-5 text-xs px-2',
    default: 'h-6 text-xs px-2.5',
    lg: 'h-7 text-sm px-3'
  };

  if (!config) {
    return (
      <Badge 
        className={cn(
          'inline-flex items-center gap-1.5 font-medium',
          sizeClasses[size],
          'bg-slate-100 text-slate-700 border-slate-200',
          className
        )}
      >
        {showIcon && <Clock className={iconSizeClasses[size]} />}
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {Icon && <Icon className={iconSizeClasses[size]} />}
      <span>{config.label}</span>
    </Badge>
  );
}