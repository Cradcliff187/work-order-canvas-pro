import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Mail, 
  MoreVertical, 
  Download,
  Send,
  Clock,
  CheckCircle,
  DollarSign,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface PartnerInvoice {
  id: string;
  invoice_number: string;
  status: string;
  pdf_url?: string | null;
  sent_at?: string | null;
  partner_organization?: {
    name: string;
    contact_email?: string;
  } | null;
}

interface PartnerInvoiceActionsProps {
  invoice: PartnerInvoice;
  onStatusChange?: () => void;
}

export function PartnerInvoiceActions({ 
  invoice, 
  onStatusChange 
}: PartnerInvoiceActionsProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-partner-invoice-pdf', {
        body: { invoiceId: invoice.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast({
          title: 'PDF Generated',
          description: 'Partner invoice PDF has been generated successfully.',
        });
        
        // Refresh invoice data
        queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['partner-invoice', invoice.id] });
        onStatusChange?.();

        // Open PDF in new tab
        if (data.pdfUrl) {
          window.open(data.pdfUrl, '_blank');
        }
      } else {
        throw new Error(data.error || 'PDF generation failed');
      }
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error.message || 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice.partner_organization?.contact_email) {
      toast({
        title: 'Email Address Missing',
        description: 'Partner organization does not have an email address configured.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      // Update status to 'sent' and set sent_at timestamp
      const { error: updateError } = await supabase
        .from('partner_invoices')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast({
        title: 'Invoice Sent',
        description: `Invoice ${invoice.invoice_number} has been sent to ${invoice.partner_organization.name}.`,
      });

      // Refresh invoice data
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice', invoice.id] });
      onStatusChange?.();

    } catch (error: any) {
      console.error('Email sending error:', error);
      toast({
        title: 'Failed to Send Invoice',
        description: error.message || 'Failed to send invoice email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const updateData: any = { status: newStatus };
      
      // Set payment_date if marking as paid
      if (newStatus === 'paid') {
        updateData.payment_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('partner_invoices')
        .update(updateData)
        .eq('id', invoice.id);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Status Updated',
        description: `Invoice ${invoice.invoice_number} status changed to ${newStatus.replace('_', ' ')}.`,
      });

      // Refresh invoice data
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoice', invoice.id] });
      onStatusChange?.();

    } catch (error: any) {
      console.error('Status update error:', error);
      toast({
        title: 'Status Update Failed',
        description: error.message || 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const canGeneratePdf = invoice.status !== 'paid';
  const canSendEmail = invoice.status === 'draft' && !!invoice.pdf_url;
  const canMarkPaid = invoice.status === 'sent';
  const canReturnToDraft = invoice.status === 'sent';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canGeneratePdf && (
          <DropdownMenuItem
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
          >
            <FileText className="h-4 w-4 mr-2" />
            {isGeneratingPdf ? 'Regenerating PDF...' : 'Regenerate PDF'}
          </DropdownMenuItem>
        )}

        {invoice.pdf_url && (
          <DropdownMenuItem
            onClick={() => window.open(invoice.pdf_url!, '_blank')}
          >
            <Eye className="h-4 w-4 mr-2" />
            View PDF
          </DropdownMenuItem>
        )}

        {invoice.pdf_url && (
          <DropdownMenuItem
            onClick={() => {
              const link = document.createElement('a');
              link.href = invoice.pdf_url!;
              link.download = `invoice-${invoice.invoice_number}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />


        {canSendEmail && (
          <DropdownMenuItem
            onClick={handleSendEmail}
            disabled={isSendingEmail}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSendingEmail ? 'Sending...' : 'Send Invoice'}
          </DropdownMenuItem>
        )}

        {canMarkPaid && (
          <DropdownMenuItem
            onClick={() => handleStatusChange('paid')}
            disabled={isUpdatingStatus}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Mark as Paid
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {canReturnToDraft && (
          <DropdownMenuItem
            onClick={() => handleStatusChange('draft')}
            disabled={isUpdatingStatus}
          >
            <Clock className="h-4 w-4 mr-2" />
            Return to Draft
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}