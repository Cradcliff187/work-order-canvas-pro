import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Clock, UserPlus, Play, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

interface StatusStep {
  status: WorkOrderStatus;
  label: string;
  icon: React.ReactNode;
  order: number;
}

interface StatusProgressIndicatorProps {
  currentStatus: WorkOrderStatus;
  className?: string;
}

const statusSteps: StatusStep[] = [
  {
    status: 'received',
    label: 'Received',
    icon: <Circle className="h-4 w-4" />,
    order: 1
  },
  {
    status: 'assigned',
    label: 'Assigned',
    icon: <UserPlus className="h-4 w-4" />,
    order: 2
  },
  {
    status: 'in_progress',
    label: 'In Progress',
    icon: <Play className="h-4 w-4" />,
    order: 3
  },
  {
    status: 'completed',
    label: 'Completed',
    icon: <CheckCircle className="h-4 w-4" />,
    order: 4
  }
];

const specialStatuses: Partial<Record<WorkOrderStatus, { label: string; icon: React.ReactNode; color: string }>> = {
  'estimate_needed': {
    label: 'Estimate Needed',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  'estimate_approved': {
    label: 'Estimate Approved',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  'cancelled': {
    label: 'Cancelled',
    icon: <XCircle className="h-4 w-4" />,
    color: 'bg-red-100 text-red-800 border-red-200'
  }
};

export function StatusProgressIndicator({ currentStatus, className }: StatusProgressIndicatorProps) {
  // Handle special statuses that don't follow the normal flow
  if (currentStatus in specialStatuses) {
    const special = specialStatuses[currentStatus];
    if (special) {
      return (
        <div className={cn('flex items-center gap-2', className)}>
          <Badge className={special.color}>
            <span className="flex items-center gap-1">
              {special.icon}
              {special.label}
            </span>
          </Badge>
        </div>
      );
    }
  }

  const currentOrder = statusSteps.find(step => step.status === currentStatus)?.order || 0;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {statusSteps.map((step, index) => {
        const isCompleted = step.order <= currentOrder;
        const isCurrent = step.status === currentStatus;
        const isNext = step.order === currentOrder + 1;

        return (
          <div key={step.status} className="contents">
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                  {
                    'bg-green-100 border-green-500 text-green-700': isCompleted && !isCurrent,
                    'bg-blue-100 border-blue-500 text-blue-700': isCurrent,
                    'bg-gray-100 border-gray-300 text-gray-400': !isCompleted && !isCurrent,
                    'bg-yellow-50 border-yellow-300 text-yellow-600': isNext && !isCompleted
                  }
                )}
              >
                {isCompleted && !isCurrent ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  {
                    'text-green-700': isCompleted && !isCurrent,
                    'text-blue-700': isCurrent,
                    'text-gray-400': !isCompleted && !isCurrent,
                    'text-yellow-600': isNext && !isCompleted
                  }
                )}
              >
                {step.label}
              </span>
            </div>
            {index < statusSteps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 transition-colors min-w-[20px]',
                  {
                    'bg-green-300': step.order < currentOrder,
                    'bg-gray-300': step.order >= currentOrder
                  }
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}