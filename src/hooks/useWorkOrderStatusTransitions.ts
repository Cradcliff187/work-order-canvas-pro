import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type { Database } from "@/integrations/supabase/types";

interface StatusTransitionData {
  workOrderId: string;
  newStatus: Database['public']['Enums']['work_order_status'];
  reason?: string;
}

export const useWorkOrderStatusTransitions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transitionStatus = useMutation({
    mutationFn: async ({ workOrderId, newStatus, reason }: StatusTransitionData) => {
      const { data, error } = await supabase.rpc('transition_work_order_status', {
        work_order_id: workOrderId,
        new_status: newStatus,
        reason: reason
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      
      toast({
        title: "Status Updated",
        description: `Work order status changed to ${variables.newStatus}`,
      });
    },
    onError: (error) => {
      console.error('Status transition error:', error);
      toast({
        title: "Status Update Failed",
        description: "Failed to update work order status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const checkCompletionStatus = useMutation({
    mutationFn: async (workOrderId: string) => {
      const { data, error } = await supabase.rpc('check_assignment_completion_status', {
        work_order_id: workOrderId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
    onError: (error) => {
      console.error('Completion check error:', error);
    },
  });

  return {
    transitionStatus,
    checkCompletionStatus,
    isTransitioning: transitionStatus.isPending,
    isCheckingCompletion: checkCompletionStatus.isPending,
  };
};

// Hook for getting status color and display info
export const useWorkOrderStatusDisplay = () => {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'received':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Received',
          description: 'Work order received and awaiting assignment'
        };
      case 'assigned':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'Assigned',
          description: 'Work order assigned to contractor(s)'
        };
      case 'estimate_needed':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          label: 'Estimate Needed',
          description: 'Contractor needs to provide estimate before starting'
        };
      case 'estimate_approved':
        return {
          color: 'bg-teal-100 text-teal-800 border-teal-200',
          label: 'Estimate Approved',
          description: 'Estimate has been approved and work can begin'
        };
      case 'in_progress':
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'In Progress',
          description: 'Work is actively being performed'
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          label: 'Completed',
          description: 'All assigned work has been completed'
        };
      case 'cancelled':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          label: 'Cancelled',
          description: 'Work order has been cancelled'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          label: status,
          description: 'Unknown status'
        };
    }
  };

  return { getStatusInfo };
};