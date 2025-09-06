import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export function usePartnerInvoiceActions() {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generatePdfMutation = useMutation({
    mutationFn: async ({ invoiceId }: GeneratePdfParams) => {
      setIsGeneratingPdf(true);
      
      const { data, error } = await supabase.functions.invoke('generate-partner-invoice-pdf', {
        body: { invoiceId }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'PDF generation failed');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'PDF Generated',
        description: 'Partner invoice PDF has been generated successfully.',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice', variables.invoiceId] });

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
    onSuccess: (data) => {
      toast({
        title: 'Invoice Sent',
        description: 'Invoice has been sent to partner organization.',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice', data.invoiceId] });
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
    onSuccess: (data) => {
      toast({
        title: 'Status Updated',
        description: `Invoice status changed to ${data.status.replace('_', ' ')}.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice', data.invoiceId] });
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

  return {
    generatePdf: generatePdfMutation.mutate,
    sendInvoice: sendInvoiceMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    isGeneratingPdf,
    isSendingInvoice: sendInvoiceMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
}