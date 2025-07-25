
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WorkOrderInsert = Database['public']['Tables']['work_orders']['Insert'];

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workOrderData: Partial<WorkOrderInsert>) => {
      // Generate work order number first
      let workOrderNumber: string;
      
      // Determine location code
      let locationCode = workOrderData.partner_location_number;
      
      // If organization doesn't use partner location numbers, auto-generate
      if (!locationCode) {
        const { data: nextLocationCode, error: locationError } = await supabase.rpc(
          'generate_next_location_number',
          { org_id: workOrderData.organization_id! }
        );
        
        if (locationError) throw new Error(`Error generating location number: ${locationError.message}`);
        if (!nextLocationCode) throw new Error('Failed to generate location number');
        
        locationCode = nextLocationCode;
      }
      
      // Generate the actual work order number (this increments the sequence)
      const { data: generatedNumber, error: numberError } = await supabase.rpc(
        'generate_work_order_number_per_location',
        { 
          org_id: workOrderData.organization_id!,
          location_code: locationCode
        }
      );
      
      if (numberError) throw new Error(`Error generating work order number: ${numberError.message}`);
      if (!generatedNumber) throw new Error('Failed to generate work order number');
      
      workOrderNumber = generatedNumber;

      const { data, error } = await supabase
        .from('work_orders')
        .insert([{
          work_order_number: workOrderNumber,
          title: workOrderData.title!,
          description: workOrderData.description || '',
          organization_id: workOrderData.organization_id!,
          trade_id: workOrderData.trade_id!,
          store_location: workOrderData.store_location || '',
          street_address: workOrderData.street_address || '',
          city: workOrderData.city || '',
          state: workOrderData.state || '',
          zip_code: workOrderData.zip_code || '',
          location_street_address: workOrderData.location_street_address || '',
          location_city: workOrderData.location_city || '',
          location_state: workOrderData.location_state || '',
          location_zip_code: workOrderData.location_zip_code || '',
          location_name: workOrderData.location_name || '',
          partner_po_number: workOrderData.partner_po_number || '',
          partner_location_number: locationCode,
          status: 'received',
          created_by: workOrderData.created_by!,
          date_submitted: new Date().toISOString(),
        }])
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
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create work order',
      });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WorkOrderInsert>) => {
      const { data, error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order'] });
      toast({
        title: 'Success',
        description: 'Work order updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update work order',
      });
    },
  });
}
