import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApproveSubcontractorBillData {
  billId: string;
  notes?: string;
}

interface RejectSubcontractorBillData {
  billId: string;
  notes: string;
}

interface MarkAsPaidData {
  billId: string;
  paymentReference: string;
  paymentDate: Date;
}

export const useSubcontractorBillMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Stabilize success/error callbacks
  const handleSuccess = useCallback((message: string, description: string) => {
    queryClient.invalidateQueries({ queryKey: ['subcontractor-bills'] });
    queryClient.invalidateQueries({ queryKey: ['subcontractor-bill'] });
    queryClient.invalidateQueries({ queryKey: ['bill-approval-queue'] });
    toast({ title: message, description });
  }, [queryClient, toast]);

  const handleError = useCallback((error: any, message: string) => {
    console.error(`Subcontractor bill mutation error:`, error);
    toast({
      title: 'Error',
      description: `${message} Please try again.`,
      variant: 'destructive',
    });
  }, [toast]);

  const approveSubcontractorBill = useMutation({
    mutationFn: async ({ billId, notes }: ApproveSubcontractorBillData) => {
      // Validate input
      if (!billId || typeof billId !== 'string') {
        throw new Error('Invalid bill ID');
      }
      return performSubcontractorBillApproval({ billId, notes });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['subcontractor-bills'] });
      await queryClient.cancelQueries({ queryKey: ['subcontractor-bill'] });

      const previousQueries = queryClient.getQueriesData<{ data: any[]; count: number }>({ queryKey: ['subcontractor-bills'] });

      previousQueries.forEach(([key, oldData]) => {
        if (!oldData) return;
        const updated = {
          ...oldData,
          data: oldData.data.map((bill: any) =>
            bill.id === variables.billId
              ? { ...bill, status: 'approved', approved_at: new Date().toISOString(), approval_notes: variables.notes || bill.approval_notes }
              : bill
          ),
        };
        queryClient.setQueryData(key, updated);
      });

      return { previousQueries };
    },
    onError: (_error, _vars, context) => {
      // rollback
      context?.previousQueries?.forEach(([key, data]: any) => {
        queryClient.setQueryData(key, data);
      });
      handleError(_error, 'Failed to approve bill.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bills'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bill'] });
      queryClient.invalidateQueries({ queryKey: ['bill-approval-queue'] });
    },
    onSuccess: () => {
      handleSuccess('Bill Approved', 'The bill has been successfully approved.');
    },
    retry: 2,
  });

  // Extracted approval logic
  const performSubcontractorBillApproval = async ({ billId, notes }: ApproveSubcontractorBillData) => {
    const { data, error } = await supabase
      .from('subcontractor_bills')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approval_notes: notes || null,
      })
      .eq('id', billId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const rejectSubcontractorBill = useMutation({
    mutationFn: async ({ billId, notes }: RejectSubcontractorBillData) => {
      if (!billId || typeof billId !== 'string') {
        throw new Error('Invalid bill ID');
      }
      return performSubcontractorBillRejection({ billId, notes });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['subcontractor-bills'] });
      await queryClient.cancelQueries({ queryKey: ['subcontractor-bill'] });

      const previousQueries = queryClient.getQueriesData<{ data: any[]; count: number }>({ queryKey: ['subcontractor-bills'] });

      previousQueries.forEach(([key, oldData]) => {
        if (!oldData) return;
        const updated = {
          ...oldData,
          data: oldData.data.map((bill: any) =>
            bill.id === variables.billId
              ? { ...bill, status: 'rejected', approval_notes: variables.notes }
              : bill
          ),
        };
        queryClient.setQueryData(key, updated);
      });

      return { previousQueries };
    },
    onError: (_error, _vars, context) => {
      context?.previousQueries?.forEach(([key, data]: any) => {
        queryClient.setQueryData(key, data);
      });
      handleError(_error, 'Failed to reject bill.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bills'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bill'] });
      queryClient.invalidateQueries({ queryKey: ['bill-approval-queue'] });
    },
    onSuccess: () => {
      handleSuccess('Bill Rejected', 'The bill has been rejected.');
    },
    retry: 2,
  });

  // Extracted rejection logic
  const performSubcontractorBillRejection = async ({ billId, notes }: RejectSubcontractorBillData) => {
    const { data, error } = await supabase
      .from('subcontractor_bills')
      .update({
        status: 'rejected',
        approval_notes: notes,
      })
      .eq('id', billId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const markAsPaid = useMutation({
    mutationFn: async ({ billId, paymentReference, paymentDate }: MarkAsPaidData) => {
      const { data, error } = await supabase
        .from('subcontractor_bills')
        .update({
          status: 'paid',
          paid_at: paymentDate.toISOString(),
          payment_reference: paymentReference,
        })
        .eq('id', billId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['subcontractor-bills'] });
      await queryClient.cancelQueries({ queryKey: ['subcontractor-bill'] });

      const previousQueries = queryClient.getQueriesData<{ data: any[]; count: number }>({ queryKey: ['subcontractor-bills'] });

      previousQueries.forEach(([key, oldData]) => {
        if (!oldData) return;
        const updated = {
          ...oldData,
          data: oldData.data.map((bill: any) =>
            bill.id === variables.billId
              ? { ...bill, status: 'paid', paid_at: variables.paymentDate.toISOString(), payment_reference: variables.paymentReference }
              : bill
          ),
        };
        queryClient.setQueryData(key, updated);
      });

      return { previousQueries };
    },
    onError: (_error, _vars, context) => {
      context?.previousQueries?.forEach(([key, data]: any) => {
        queryClient.setQueryData(key, data);
      });
      handleError(_error, 'Failed to mark bill as paid.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bills'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bill'] });
    },
    onSuccess: () => handleSuccess(
      'Bill Marked as Paid',
      'The bill has been marked as paid and the subcontractor has been notified.'
    ),
    retry: 2,
  });

  return {
    approveSubcontractorBill,
    rejectSubcontractorBill,
    markAsPaid,
  };
};