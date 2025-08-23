import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

interface StatusChangeParams {
  workOrderId: string;
  newStatus: WorkOrderStatus;
  reason?: string;
}

interface StatusChangeResult {
  success: boolean;
  error?: string;
}

/**
 * CRITICAL: This is the ONLY approved way to change work order status.
 * Direct status updates bypass audit logs, email triggers, and completion logic.
 * 
 * DO NOT use: supabase.from('work_orders').update({ status: ... })
 * ALWAYS use: statusManager.changeStatus(id, newStatus, reason)
 * 
 * This hook centralizes ALL work order status changes through the database function
 * transition_work_order_status() which ensures proper:
 * - Audit logging
 * - Email notifications
 * - Business rule validation
 * - State transition validation
 */
export function useWorkOrderStatusManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const statusChangeMutation = useMutation({
    mutationFn: async ({ workOrderId, newStatus, reason }: StatusChangeParams): Promise<StatusChangeResult> => {
      try {
        const { data, error } = await supabase.rpc('transition_work_order_status', {
          work_order_id: workOrderId,
          new_status: newStatus,
          reason: reason || `Status changed to ${newStatus}`,
          user_id: undefined // Let the function determine the current user
        });

        if (error) {
          console.error('Status transition error:', error);
          return {
            success: false,
            error: error.message
          };
        }

        return {
          success: true
        };
      } catch (error: any) {
        console.error('Status change failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to change work order status'
        };
      }
    },
    onSuccess: (result, { workOrderId, newStatus }) => {
      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Work order status changed to ${newStatus.replace('_', ' ')}`,
        });

        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
        queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
        queryClient.invalidateQueries({ queryKey: ['admin-report-detail'] });
      } else {
        toast({
          title: "Status Update Failed",
          description: result.error || "Failed to update work order status",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Status Update Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  /**
   * Change work order status using the database function.
   * This is the ONLY approved method for status changes.
   * 
   * @param workOrderId - The ID of the work order
   * @param newStatus - The new status to transition to
   * @param reason - Optional reason for the status change (recommended)
   * @returns Promise with success boolean and any error
   */
  const changeStatus = async (
    workOrderId: string, 
    newStatus: WorkOrderStatus, 
    reason?: string
  ): Promise<StatusChangeResult> => {
    const result = await statusChangeMutation.mutateAsync({
      workOrderId,
      newStatus,
      reason
    });
    return result;
  };

  return {
    changeStatus,
    isChangingStatus: statusChangeMutation.isPending,
  };
}

// Export the type for use in other components
export type { WorkOrderStatus, StatusChangeResult };