import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateEstimateBeforeWork } from "@/lib/validations/estimate-validations";

import type { Database } from "@/integrations/supabase/types";

interface StatusTransitionData {
  workOrderId: string;
  newStatus: Database['public']['Enums']['work_order_status'];
  reason?: string;
}

// Helper function to update work order status in cache
function updateWorkOrderStatusInCache(
  queryClient: QueryClient, 
  workOrderId: string, 
  newStatus: Database['public']['Enums']['work_order_status']
) {
  // Update paginated work orders list
  queryClient.setQueriesData({ queryKey: ['work-orders'] }, (oldData: any) => {
    if (!oldData?.data) return oldData;
    
    return {
      ...oldData,
      data: oldData.data.map((wo: any) => 
        wo.id === workOrderId 
          ? { ...wo, status: newStatus, updated_at: new Date().toISOString() }
          : wo
      )
    };
  });
  
  // Update individual work order
  queryClient.setQueryData(['work-order', workOrderId], (oldData: any) => {
    if (!oldData) return oldData;
    return { 
      ...oldData, 
      status: newStatus, 
      updated_at: new Date().toISOString() 
    };
  });

  // Update organization work orders
  queryClient.setQueriesData({ queryKey: ['organization-work-orders'] }, (oldData: any) => {
    if (!oldData) return oldData;
    
    return oldData.map((wo: any) => 
      wo.id === workOrderId 
        ? { ...wo, status: newStatus, updated_at: new Date().toISOString() }
        : wo
    );
  });
}

export const useWorkOrderStatusTransitions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transitionStatus = useMutation({
    mutationFn: async ({ workOrderId, newStatus, reason }: StatusTransitionData) => {
      // Get current work order data for validation
      const { data: workOrder, error: fetchError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();

      if (fetchError) throw fetchError;

      // Validate estimate requirements based on current and target status
      if (workOrder.status === 'estimate_needed' && newStatus !== 'cancelled' && newStatus !== 'estimate_pending_approval') {
        throw new Error("Estimate must be submitted first");
      }

      if ((workOrder.status === 'estimate_pending_approval' || workOrder.status === 'estimate_approved') && newStatus === 'in_progress') {
        if (!workOrder.partner_estimate_approved) {
          throw new Error("Estimate must be approved by partner before work can begin");
        }
      }

      // Legacy validation for direct transitions to in_progress
      if (newStatus === 'in_progress') {
        const validation = validateEstimateBeforeWork(workOrder);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }
      }

      const { data, error } = await supabase.rpc('transition_work_order_status', {
        work_order_id: workOrderId,
        new_status: newStatus,
        reason: reason
      });

      if (error) throw error;
      return data;
    },
    onMutate: async ({ workOrderId, newStatus }) => {
      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['work-orders'] });
      await queryClient.cancelQueries({ queryKey: ['work-order', workOrderId] });
      await queryClient.cancelQueries({ queryKey: ['organization-work-orders'] });
      
      // Get previous data for rollback
      const previousWorkOrders = queryClient.getQueryData(['work-orders']);
      const previousWorkOrder = queryClient.getQueryData(['work-order', workOrderId]);
      const previousOrgWorkOrders = queryClient.getQueryData(['organization-work-orders']);
      
      // Optimistically update the cache
      updateWorkOrderStatusInCache(queryClient, workOrderId, newStatus);
      
      return { previousWorkOrders, previousWorkOrder, previousOrgWorkOrders };
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['organization-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      
      toast({
        title: "Status Updated",
        description: `Work order status changed to ${variables.newStatus}`,
      });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousWorkOrders) {
        queryClient.setQueryData(['work-orders'], context.previousWorkOrders);
      }
      if (context?.previousWorkOrder) {
        queryClient.setQueryData(['work-order', variables.workOrderId], context.previousWorkOrder);
      }
      if (context?.previousOrgWorkOrders) {
        queryClient.setQueryData(['organization-work-orders'], context.previousOrgWorkOrders);
      }
      
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
      case 'estimate_pending_approval':
        return {
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          label: 'Pending Approval',
          description: 'Estimate submitted and awaiting partner approval'
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