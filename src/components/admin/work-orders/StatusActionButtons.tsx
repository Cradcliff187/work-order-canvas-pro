import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Play, 
  Clock, 
  XCircle, 
  UserPlus,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useWorkOrderStatusTransitions } from '@/hooks/useWorkOrderStatusTransitions';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

interface StatusActionButtonsProps {
  workOrderId: string;
  currentStatus: WorkOrderStatus;
  hasAssignments: boolean;
}

interface StatusTransition {
  status: WorkOrderStatus;
  label: string;
  icon: React.ReactNode;
  variant: "default" | "outline" | "destructive" | "secondary";
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  requiresAssignment?: boolean;
}

export function StatusActionButtons({ 
  workOrderId, 
  currentStatus, 
  hasAssignments 
}: StatusActionButtonsProps) {
  const { transitionStatus, isTransitioning } = useWorkOrderStatusTransitions();
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    status: WorkOrderStatus;
    label: string;
    message: string;
  }>({
    open: false,
    status: 'received',
    label: '',
    message: ''
  });

  const getAvailableTransitions = (status: WorkOrderStatus): StatusTransition[] => {
    switch (status) {
      case 'received':
        return [
          {
            status: 'assigned',
            label: 'Assign',
            icon: <UserPlus className="h-4 w-4" />,
            variant: 'default',
            requiresAssignment: true
          },
          {
            status: 'cancelled',
            label: 'Cancel',
            icon: <XCircle className="h-4 w-4" />,
            variant: 'destructive',
            requiresConfirmation: true,
            confirmationMessage: 'This will cancel the work order and it cannot be undone.'
          }
        ];
      
      case 'assigned':
        return [
          {
            status: 'estimate_needed',
            label: 'Request Estimate',
            icon: <Clock className="h-4 w-4" />,
            variant: 'outline'
          },
          {
            status: 'in_progress',
            label: 'Start Work',
            icon: <Play className="h-4 w-4" />,
            variant: 'default'
          },
          {
            status: 'completed',
            label: 'Mark Complete',
            icon: <CheckCircle className="h-4 w-4" />,
            variant: 'default',
            requiresConfirmation: true,
            confirmationMessage: 'This will mark the work order as completed.'
          },
          {
            status: 'cancelled',
            label: 'Cancel',
            icon: <XCircle className="h-4 w-4" />,
            variant: 'destructive',
            requiresConfirmation: true,
            confirmationMessage: 'This will cancel the work order and it cannot be undone.'
          }
        ];
      
      case 'estimate_needed':
        return [
          {
            status: 'in_progress',
            label: 'Start Work',
            icon: <Play className="h-4 w-4" />,
            variant: 'default'
          },
          {
            status: 'cancelled',
            label: 'Cancel',
            icon: <XCircle className="h-4 w-4" />,
            variant: 'destructive',
            requiresConfirmation: true,
            confirmationMessage: 'This will cancel the work order and it cannot be undone.'
          }
        ];
      
      case 'in_progress':
        return [
          {
            status: 'completed',
            label: 'Mark Complete',
            icon: <CheckCircle className="h-4 w-4" />,
            variant: 'default',
            requiresConfirmation: true,
            confirmationMessage: 'This will mark the work order as completed.'
          },
          {
            status: 'assigned',
            label: 'Back to Assigned',
            icon: <UserPlus className="h-4 w-4" />,
            variant: 'outline'
          }
        ];
      
      case 'completed':
        return [
          {
            status: 'in_progress',
            label: 'Reopen',
            icon: <AlertCircle className="h-4 w-4" />,
            variant: 'outline',
            requiresConfirmation: true,
            confirmationMessage: 'This will reopen the completed work order.'
          }
        ];
      
      case 'cancelled':
        return [
          {
            status: 'received',
            label: 'Restore',
            icon: <AlertCircle className="h-4 w-4" />,
            variant: 'outline',
            requiresConfirmation: true,
            confirmationMessage: 'This will restore the cancelled work order.'
          }
        ];
      
      default:
        return [];
    }
  };

  const handleStatusTransition = async (newStatus: WorkOrderStatus) => {
    try {
      await transitionStatus.mutateAsync({
        workOrderId,
        newStatus,
        reason: `Status changed from ${currentStatus} to ${newStatus} by admin`
      });
    } catch (error) {
      console.error('Failed to transition status:', error);
    }
  };

  const handleTransitionClick = (transition: StatusTransition) => {
    // Check if assignment is required but missing
    if (transition.requiresAssignment && !hasAssignments) {
      toast({
        title: "Assignment Required",
        description: "Please assign this work order to a contractor before changing the status to assigned.",
        variant: "destructive",
      });
      return;
    }

    if (transition.requiresConfirmation) {
      setConfirmDialog({
        open: true,
        status: transition.status,
        label: transition.label,
        message: transition.confirmationMessage || `Are you sure you want to ${transition.label.toLowerCase()}?`
      });
    } else {
      handleStatusTransition(transition.status);
    }
  };

  const handleConfirmTransition = () => {
    handleStatusTransition(confirmDialog.status);
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const availableTransitions = getAvailableTransitions(currentStatus);

  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Quick Actions:</span>
          <ChevronRight className="h-3 w-3" />
        </div>
        {availableTransitions.map((transition) => {
          const isDisabled = transition.requiresAssignment && !hasAssignments;
          
          return (
            <Button
              key={transition.status}
              size="sm"
              variant={transition.variant}
              onClick={() => handleTransitionClick(transition)}
              disabled={isTransitioning || isDisabled}
              className="flex items-center gap-1"
              title={isDisabled ? 'Assignment required before this action' : undefined}
            >
              {transition.icon}
              {transition.label}
            </Button>
          );
        })}
      </div>

      <DeleteConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        onConfirm={handleConfirmTransition}
        itemName={confirmDialog.label}
        itemType="status change"
        isLoading={isTransitioning}
      />
    </>
  );
}