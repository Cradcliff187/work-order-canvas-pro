import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

import { 
  CheckCircle, 
  Play, 
  Clock, 
  XCircle, 
  UserPlus,
  AlertCircle,
  ChevronRight,
  FileText,
  ListChecks
} from 'lucide-react';
import { useWorkOrderStatusTransitions } from '@/hooks/useWorkOrderStatusTransitions';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { AssignWorkOrderModal } from './AssignWorkOrderModal';
import type { Database } from '@/integrations/supabase/types';
import type { WorkOrderDetail } from '@/hooks/useWorkOrderDetail';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

interface StatusActionButtonsProps {
  workOrder: WorkOrderDetail;
  hasAssignments: boolean;
  onUpdate: () => void;
}

interface StatusTransition {
  status: WorkOrderStatus;
  label: string;
  icon: React.ReactNode;
  variant: "default" | "outline" | "destructive" | "secondary";
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  requiresAssignment?: boolean;
  isSpecialAction?: boolean;
}

export function StatusActionButtons({ 
  workOrder, 
  hasAssignments,
  onUpdate 
}: StatusActionButtonsProps) {
  const { transitionStatus, isTransitioning } = useWorkOrderStatusTransitions();
  const { toast } = useToast();
  const [showAssignModal, setShowAssignModal] = useState(false);
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

  const [mobileOpen, setMobileOpen] = useState(false);

  const getAvailableTransitions = (status: WorkOrderStatus): StatusTransition[] => {
    switch (status) {
      case 'received':
        return [
          {
            status: 'assigned',
            label: 'Assign',
            icon: <UserPlus className="h-4 w-4" />,
            variant: 'default',
            requiresAssignment: false,
            isSpecialAction: true
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
            status: 'estimate_approved',
            label: 'Approve Estimate',
            icon: <CheckCircle className="h-4 w-4" />,
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
      
      case 'estimate_approved':
        return [
          {
            status: 'in_progress',
            label: 'Start Work',
            icon: <Play className="h-4 w-4" />,
            variant: 'default'
          },
          {
            status: 'estimate_needed',
            label: 'Revise Estimate',
            icon: <FileText className="h-4 w-4" />,
            variant: 'outline'
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
        workOrderId: workOrder.id,
        newStatus,
        reason: `Status changed from ${workOrder.status} to ${newStatus} by admin`
      });
    } catch (error) {
      console.error('Failed to transition status:', error);
    }
  };

  const handleTransitionClick = (transition: StatusTransition) => {
    // Special handling for assign action
    if (transition.isSpecialAction && transition.status === 'assigned') {
      setShowAssignModal(true);
      return;
    }

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

  const availableTransitions = getAvailableTransitions(workOrder.status);

  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile: Bottom sheet trigger */}
      <div className="md:hidden">
        <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
          <DrawerTrigger asChild>
            <Button size="sm" className="w-full h-11">
              <ListChecks className="h-4 w-4 mr-2" />
              Update Status
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Update Status</DrawerTitle>
              <DrawerDescription>Choose an action for this work order.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pt-0 space-y-2">
              {availableTransitions.map((transition) => {
                const isDisabled = transition.requiresAssignment && !hasAssignments;
                return (
                  <Button
                    key={`mobile-${transition.status}`}
                    size="sm"
                    variant={transition.variant}
                    className="w-full h-11 justify-start gap-2"
                    onClick={() => {
                      setMobileOpen(false);
                      handleTransitionClick(transition);
                    }}
                    disabled={isTransitioning || isDisabled}
                    title={isDisabled ? 'Assignment required before this action' : undefined}
                  >
                    {transition.icon}
                    {transition.label}
                  </Button>
                );
              })}
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="secondary" className="w-full">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Desktop: Inline quick actions */}
      <div className="hidden md:flex md:flex-wrap md:items-center gap-2">
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
              className="flex items-center gap-1 min-h-[44px] h-11 whitespace-nowrap"
              title={isDisabled ? 'Assignment required before this action' : undefined}
            >
              {transition.icon}
              {transition.label}
            </Button>
          );
        })}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransitioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTransition}
              disabled={isTransitioning}
            >
              {isTransitioning ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showAssignModal && (
        <AssignWorkOrderModal
          isOpen={showAssignModal}
          workOrders={[workOrder]}
          onClose={() => {
            setShowAssignModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
}