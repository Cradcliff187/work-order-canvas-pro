import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaterialsAllocation {
  id: string;
  receipt_id: string;
  time_entry_id: string;
  allocated_amount: number;
  allocation_percentage?: number;
  created_at: string;
  receipt?: {
    id: string;
    vendor_name: string;
    amount: number;
    receipt_date: string;
    description?: string;
  };
}

export function useMaterialsCost(timeEntryId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['materials-cost', timeEntryId],
    queryFn: async (): Promise<MaterialsAllocation[]> => {
      const { data, error } = await supabase
        .from('receipt_time_entries')
        .select(`
          id,
          receipt_id,
          time_entry_id,
          allocated_amount,
          allocation_percentage,
          created_at,
          receipt:receipts(
            id,
            vendor_name,
            amount,
            receipt_date,
            description
          )
        `)
        .eq('time_entry_id', timeEntryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!timeEntryId,
  });

  const addAllocationMutation = useMutation({
    mutationFn: async (allocation: { 
      receiptId: string; 
      allocatedAmount: number; 
      allocationPercentage?: number; 
    }) => {
      const { error } = await supabase
        .from('receipt_time_entries')
        .insert({
          receipt_id: allocation.receiptId,
          time_entry_id: timeEntryId,
          allocated_amount: allocation.allocatedAmount,
          allocation_percentage: allocation.allocationPercentage,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-cost', timeEntryId] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({ title: 'Materials allocation added successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to add materials allocation', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const removeAllocationMutation = useMutation({
    mutationFn: async (allocationId: string) => {
      const { error } = await supabase
        .from('receipt_time_entries')
        .delete()
        .eq('id', allocationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-cost', timeEntryId] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({ title: 'Materials allocation removed successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to remove materials allocation', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const totalMaterialsCost = allocations.reduce(
    (sum, allocation) => sum + allocation.allocated_amount, 
    0
  );

  return {
    allocations,
    isLoading,
    totalMaterialsCost,
    addAllocation: addAllocationMutation.mutate,
    removeAllocation: removeAllocationMutation.mutate,
  };
}