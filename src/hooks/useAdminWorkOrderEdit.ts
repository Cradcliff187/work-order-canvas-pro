import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkOrderStatusTransitions } from "@/hooks/useWorkOrderStatusTransitions";
import type { Database } from "@/integrations/supabase/types";

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];
type WorkOrderUpdate = Database['public']['Tables']['work_orders']['Update'];

interface WorkOrderUpdateData extends Omit<WorkOrderUpdate, 'status'> {
  id: string;
  status?: WorkOrderStatus;
  originalStatus?: WorkOrderStatus;
}

export const useAdminWorkOrderEdit = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { transitionStatus } = useWorkOrderStatusTransitions();

  const updateWorkOrder = useMutation({
    mutationFn: async (data: WorkOrderUpdateData) => {
      const { id, status, originalStatus, ...updateData } = data;

      // First update the work order details (without status)
      const { data: workOrder, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If status changed, use the proper transition function
      if (status && status !== originalStatus) {
        await transitionStatus.mutateAsync({
          workOrderId: id,
          newStatus: status,
          reason: `Status updated via edit form from ${originalStatus} to ${status}`
        });
      }

      return workOrder;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['work-order-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      
      toast({
        title: "Work Order Updated",
        description: "Work order has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error('Work order update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update work order. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    updateWorkOrder,
    isUpdating: updateWorkOrder.isPending,
  };
};