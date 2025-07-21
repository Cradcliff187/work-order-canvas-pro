
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'];

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workOrderData: Omit<WorkOrder, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('work_orders')
        .insert([workOrderData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({
        title: 'Success',
        description: 'Work order created successfully',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}
