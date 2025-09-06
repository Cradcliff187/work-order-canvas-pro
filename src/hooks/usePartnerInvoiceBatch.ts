import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BatchOperation {
  invoiceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export const usePartnerInvoiceBatch = () => {
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const queryClient = useQueryClient();

  const batchGeneratePdf = useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      setOperations(invoiceIds.map(id => ({ invoiceId: id, status: 'pending' })));
      
      const results = [];
      
      for (const invoiceId of invoiceIds) {
        try {
          setOperations(prev => 
            prev.map(op => 
              op.invoiceId === invoiceId ? { ...op, status: 'processing' } : op
            )
          );

          const { data, error } = await supabase.functions.invoke('generate-partner-invoice-pdf', {
            body: { invoiceId }
          });

          if (error) throw error;

          setOperations(prev =>
            prev.map(op => 
              op.invoiceId === invoiceId ? { ...op, status: 'completed' } : op
            )
          );
          
          results.push({ invoiceId, success: true, data });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          setOperations(prev => 
            prev.map(op => 
              op.invoiceId === invoiceId ? { ...op, status: 'failed', error: errorMessage } : op
            )
          );
          
          results.push({ invoiceId, success: false, error: errorMessage });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      toast({
        title: "Batch PDF Generation Complete",
        description: `${successCount} PDFs generated successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        variant: failCount > 0 ? "destructive" : "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
    },
    onError: (error) => {
      toast({
        title: "Batch Operation Failed",
        description: error instanceof Error ? error.message : 'Failed to generate PDFs',
        variant: "destructive",
      });
    },
  });

  const batchSendEmails = useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      setOperations(invoiceIds.map(id => ({ invoiceId: id, status: 'pending' })));
      
      const results = [];
      
      for (const invoiceId of invoiceIds) {
        try {
          setOperations(prev => 
            prev.map(op => 
              op.invoiceId === invoiceId ? { ...op, status: 'processing' } : op
            )
          );

          const { error } = await supabase
            .from('partner_invoices')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', invoiceId);

          if (error) throw error;

          setOperations(prev =>
            prev.map(op => 
              op.invoiceId === invoiceId ? { ...op, status: 'completed' } : op
            )
          );
          
          results.push({ invoiceId, success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          setOperations(prev => 
            prev.map(op => 
              op.invoiceId === invoiceId ? { ...op, status: 'failed', error: errorMessage } : op
            )
          );
          
          results.push({ invoiceId, success: false, error: errorMessage });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      toast({
        title: "Batch Email Send Complete",
        description: `${successCount} emails sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        variant: failCount > 0 ? "destructive" : "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
    },
    onError: (error) => {
      toast({
        title: "Batch Operation Failed",
        description: error instanceof Error ? error.message : 'Failed to send emails',
        variant: "destructive",
      });
    },
  });

  const clearOperations = () => {
    setOperations([]);
  };

  return {
    batchGeneratePdf: batchGeneratePdf.mutate,
    batchSendEmails: batchSendEmails.mutate,
    operations,
    isProcessing: batchGeneratePdf.isPending || batchSendEmails.isPending,
    clearOperations,
  };
};