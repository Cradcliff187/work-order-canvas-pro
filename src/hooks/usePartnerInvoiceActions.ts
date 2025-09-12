import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isValidUUID } from '@/lib/utils/validation';

import { useRetry } from './useRetry';

interface GeneratePdfParams {
  invoiceId: string;
}

interface SendInvoiceParams {
  invoiceId: string;
}

interface UpdateStatusParams {
  invoiceId: string;
  status: string;
  paymentDate?: string;
}

interface DeleteInvoiceParams {
  invoiceId: string;
}

export function usePartnerInvoiceActions() {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Enhanced retry mechanism for PDF generation
  const { executeWithRetry: retryPdfGeneration } = useRetry(
    async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-partner-invoice-pdf', {
        body: { invoiceId }
      });
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'PDF generation failed');
      return data;
    },
    { maxAttempts: 3, delay: 2000, backoff: true }
  );

  const generatePdfMutation = useMutation({
    mutationFn: async ({ invoiceId }: GeneratePdfParams) => {
      setIsGeneratingPdf(true);
      return await retryPdfGeneration(invoiceId);
    },
    onSuccess: async (data, variables) => {
      toast({
        title: 'PDF Generated',
        description: 'Partner invoice PDF has been generated successfully.',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice-audit-logs', variables.invoiceId] });

      // Open PDF in new tab if URL provided
      if (data.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      }
    },
    onError: (error: any) => {
      console.error('PDF generation error:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error.message || 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsGeneratingPdf(false);
    }
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId }: SendInvoiceParams) => {
      // Update status to 'sent' and set sent_at timestamp
      const { error } = await supabase
        .from('partner_invoices')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) {
        throw new Error(error.message);
      }

      return { invoiceId };
    },
    onSuccess: async (data) => {
      toast({
        title: 'Invoice Sent',
        description: 'Invoice has been sent to partner organization.',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice', data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice-audit-logs', data.invoiceId] });
    },
    onError: (error: any) => {
      console.error('Send invoice error:', error);
      toast({
        title: 'Failed to Send Invoice',
        description: error.message || 'Failed to send invoice. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, status, paymentDate }: UpdateStatusParams) => {
      const updateData: any = { status };
      
      // Set payment_date if marking as paid
      if (status === 'paid') {
        updateData.payment_date = paymentDate || new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('partner_invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) {
        throw new Error(error.message);
      }

      return { invoiceId, status };
    },
    onSuccess: async (data) => {
      toast({
        title: 'Status Updated',
        description: `Invoice status changed to ${data.status.replace('_', ' ')}.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice', data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice-audit-logs', data.invoiceId] });
    },
    onError: (error: any) => {
      console.error('Status update error:', error);
      toast({
        title: 'Status Update Failed',
        description: error.message || 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId }: DeleteInvoiceParams) => {
      // Validate UUID format
      if (!isValidUUID(invoiceId)) {
        throw new Error('Invalid invoice ID format');
      }

      console.log('Deleting partner invoice with ID:', invoiceId);

      // Step 1: Delete audit log entries first (foreign key constraint)
      const { error: auditLogError } = await supabase
        .from('partner_invoice_audit_log')
        .delete()
        .eq('invoice_id', invoiceId);

      if (auditLogError) {
        throw new Error(`Failed to delete audit log entries: ${auditLogError.message}`);
      }

      // Step 2: Unlink any dependent reports that reference this invoice
      const { error: workOrderReportsError } = await supabase
        .from('work_order_reports')
        .update({ partner_invoice_id: null })
        .eq('partner_invoice_id', invoiceId);

      if (workOrderReportsError) {
        throw new Error(`Failed to unlink work order reports: ${workOrderReportsError.message}`);
      }

      const { error: employeeReportsError } = await supabase
        .from('employee_reports')
        .update({ partner_invoice_id: null })
        .eq('partner_invoice_id', invoiceId);

      if (employeeReportsError) {
        throw new Error(`Failed to unlink employee reports: ${employeeReportsError.message}`);
      }

      // Step 3: Delete line items
      const { error: lineItemsError } = await supabase
        .from('partner_invoice_line_items')
        .delete()
        .eq('partner_invoice_id', invoiceId);

      if (lineItemsError) {
        throw new Error(`Failed to delete line items: ${lineItemsError.message}`);
      }

      // Step 4: Finally delete the invoice
      const { error: invoiceError } = await supabase
        .from('partner_invoices')
        .delete()
        .eq('id', invoiceId);

      if (invoiceError) {
        throw new Error(`Failed to delete invoice: ${invoiceError.message}`);
      }

      return { invoiceId };
    },
    onSuccess: async (data) => {
      toast({
        title: 'Invoice Deleted',
        description: 'Invoice has been successfully deleted.',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice', data.invoiceId] });
    },
    onError: (error: any) => {
      console.error('Delete invoice error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete invoice. Please try again.',
        variant: 'destructive',
      });
    }
  });

  return {
    generatePdf: generatePdfMutation.mutate,
    sendInvoice: sendInvoiceMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    deleteInvoice: deleteInvoiceMutation.mutate,
    isGeneratingPdf,
    isSendingInvoice: sendInvoiceMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeletingInvoice: deleteInvoiceMutation.isPending,
  };
}