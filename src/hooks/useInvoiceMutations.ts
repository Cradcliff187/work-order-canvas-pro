import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApproveInvoiceData {
  invoiceId: string;
  notes?: string;
}

interface RejectInvoiceData {
  invoiceId: string;
  notes: string;
}

interface MarkAsPaidData {
  invoiceId: string;
  paymentReference: string;
  paymentDate: Date;
}

export const useInvoiceMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Stabilize success/error callbacks
  const handleSuccess = useCallback((message: string, description: string) => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['invoice'] });
    queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    toast({ title: message, description });
  }, [queryClient, toast]);

  const handleError = useCallback((error: any, message: string) => {
    console.error(`Invoice mutation error:`, error);
    toast({
      title: 'Error',
      description: `${message} Please try again.`,
      variant: 'destructive',
    });
  }, [toast]);

  const approveInvoice = useMutation({
    mutationFn: async ({ invoiceId, notes }: ApproveInvoiceData) => {
      // Validate input
      if (!invoiceId || typeof invoiceId !== 'string') {
        throw new Error('Invalid invoice ID');
      }
      return performInvoiceApproval({ invoiceId, notes });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] });
      await queryClient.cancelQueries({ queryKey: ['invoice'] });

      const previousQueries = queryClient.getQueriesData<{ data: any[]; count: number }>({ queryKey: ['invoices'] });

      previousQueries.forEach(([key, oldData]) => {
        if (!oldData) return;
        const updated = {
          ...oldData,
          data: oldData.data.map((inv: any) =>
            inv.id === variables.invoiceId
              ? { ...inv, status: 'approved', approved_at: new Date().toISOString(), approval_notes: variables.notes || inv.approval_notes }
              : inv
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
      handleError(_error, 'Failed to approve invoice.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    },
    onSuccess: () => {
      handleSuccess('Invoice Approved', 'The invoice has been successfully approved.');
    },
    retry: 2,
  });

  // Extracted approval logic
  const performInvoiceApproval = async ({ invoiceId, notes }: ApproveInvoiceData) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approval_notes: notes || null,
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const rejectInvoice = useMutation({
    mutationFn: async ({ invoiceId, notes }: RejectInvoiceData) => {
      if (!invoiceId || typeof invoiceId !== 'string') {
        throw new Error('Invalid invoice ID');
      }
      return performInvoiceRejection({ invoiceId, notes });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] });
      await queryClient.cancelQueries({ queryKey: ['invoice'] });

      const previousQueries = queryClient.getQueriesData<{ data: any[]; count: number }>({ queryKey: ['invoices'] });

      previousQueries.forEach(([key, oldData]) => {
        if (!oldData) return;
        const updated = {
          ...oldData,
          data: oldData.data.map((inv: any) =>
            inv.id === variables.invoiceId
              ? { ...inv, status: 'rejected', approval_notes: variables.notes }
              : inv
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
      handleError(_error, 'Failed to reject invoice.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    },
    onSuccess: () => {
      handleSuccess('Invoice Rejected', 'The invoice has been rejected.');
    },
    retry: 2,
  });

  // Extracted rejection logic
  const performInvoiceRejection = async ({ invoiceId, notes }: RejectInvoiceData) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'rejected',
        approval_notes: notes,
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const markAsPaid = useMutation({
    mutationFn: async ({ invoiceId, paymentReference, paymentDate }: MarkAsPaidData) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: paymentDate.toISOString(),
          payment_reference: paymentReference,
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] });
      await queryClient.cancelQueries({ queryKey: ['invoice'] });

      const previousQueries = queryClient.getQueriesData<{ data: any[]; count: number }>({ queryKey: ['invoices'] });

      previousQueries.forEach(([key, oldData]) => {
        if (!oldData) return;
        const updated = {
          ...oldData,
          data: oldData.data.map((inv: any) =>
            inv.id === variables.invoiceId
              ? { ...inv, status: 'paid', paid_at: variables.paymentDate.toISOString(), payment_reference: variables.paymentReference }
              : inv
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
      handleError(_error, 'Failed to mark invoice as paid.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
    },
    onSuccess: () => handleSuccess(
      'Invoice Marked as Paid',
      'The invoice has been marked as paid and the subcontractor has been notified.'
    ),
    retry: 2,
  });

  return {
    approveInvoice,
    rejectInvoice,
    markAsPaid,
  };
};