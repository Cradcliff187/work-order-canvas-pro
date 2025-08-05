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
      // Add timeout wrapper
      return Promise.race([
        performInvoiceApproval({ invoiceId, notes }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Invoice approval timed out after 20 seconds')), 20000)
        )
      ]);
    },
    onSuccess: () => {
      // Staggered cache invalidation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }, 50);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['invoice'] });
      }, 100);
      
      handleSuccess(
        'Invoice Approved',
        'The invoice has been successfully approved and the subcontractor has been notified.'
      );
    },
    onError: (error) => {
      console.error('Invoice approval error:', error);
      handleError(error, 'Failed to approve invoice.');
    },
    retry: (failureCount, error) => {
      // Don't retry timeout errors
      if (error?.message?.includes('timed out')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
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
      // Add timeout wrapper
      return Promise.race([
        performInvoiceRejection({ invoiceId, notes }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Invoice rejection timed out after 20 seconds')), 20000)
        )
      ]);
    },
    onSuccess: () => {
      // Staggered cache invalidation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }, 50);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['invoice'] });
      }, 100);
      
      handleSuccess(
        'Invoice Rejected',
        'The invoice has been rejected and the subcontractor has been notified.'
      );
    },
    onError: (error) => {
      console.error('Invoice rejection error:', error);
      handleError(error, 'Failed to reject invoice.');
    },
    retry: (failureCount, error) => {
      // Don't retry timeout errors
      if (error?.message?.includes('timed out')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
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

      // Send payment notification

      return data;
    },
    onSuccess: () => handleSuccess(
      'Invoice Marked as Paid',
      'The invoice has been marked as paid and the subcontractor has been notified.'
    ),
    onError: (error) => handleError(error, 'Failed to mark invoice as paid.'),
    retry: 2,
  });

  return {
    approveInvoice,
    rejectInvoice,
    markAsPaid,
  };
};