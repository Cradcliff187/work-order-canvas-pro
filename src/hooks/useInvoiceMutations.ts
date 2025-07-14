import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  const approveInvoice = useMutation({
    mutationFn: async ({ invoiceId, notes }: ApproveInvoiceData) => {
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

      // Send status change notification

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast({
        title: 'Invoice Approved',
        description: 'The invoice has been successfully approved and the subcontractor has been notified.',
      });
    },
    onError: (error) => {
      console.error('Error approving invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve invoice. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const rejectInvoice = useMutation({
    mutationFn: async ({ invoiceId, notes }: RejectInvoiceData) => {
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

      // Send status change notification

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast({
        title: 'Invoice Rejected',
        description: 'The invoice has been rejected and the subcontractor has been notified.',
      });
    },
    onError: (error) => {
      console.error('Error rejecting invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject invoice. Please try again.',
        variant: 'destructive',
      });
    },
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast({
        title: 'Invoice Marked as Paid',
        description: 'The invoice has been marked as paid and the subcontractor has been notified.',
      });
    },
    onError: (error) => {
      console.error('Error marking invoice as paid:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark invoice as paid. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    approveInvoice,
    rejectInvoice,
    markAsPaid,
  };
};