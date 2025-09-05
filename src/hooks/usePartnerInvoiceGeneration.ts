import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeneratePartnerInvoiceData {
  partnerOrganizationId: string;
  selectedBillIds: string[];
  markupPercentage: number;
  subtotal: number;
  totalAmount: number;
  invoiceDate?: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
}

interface PartnerInvoiceGenerationResult {
  invoiceId: string;
  invoiceNumber: string;
}

async function generatePartnerInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PI-${year}-`;
  
  // Get the highest existing invoice number for this year
  const { data: existingInvoices, error } = await supabase
    .from('partner_invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);
  
  if (error) {
    console.error('Error fetching existing invoice numbers:', error);
    throw error;
  }
  
  let nextSequence = 1;
  if (existingInvoices && existingInvoices.length > 0) {
    const lastNumber = existingInvoices[0].invoice_number;
    const sequencePart = lastNumber.split('-')[2];
    nextSequence = parseInt(sequencePart, 10) + 1;
  }
  
  return `${prefix}${nextSequence.toString().padStart(5, '0')}`;
}

async function generatePartnerInvoice(data: GeneratePartnerInvoiceData): Promise<PartnerInvoiceGenerationResult> {
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();
    
  if (profileError || !userProfile) {
    throw new Error('Failed to get user profile');
  }

  // Start transaction by generating invoice number
  const invoiceNumber = await generatePartnerInvoiceNumber();
  const invoiceDate = new Date().toISOString().split('T')[0];
  
  // Get selected reports with their costs
  const { data: selectedReports, error: reportsError } = await supabase
    .from('work_order_reports')
    .select(`
      id,
      work_order_id,
      work_performed,
      subcontractor_costs:subcontractor_bill_work_orders!work_order_report_id(amount)
    `)
    .in('id', data.selectedReportIds)
    .eq('status', 'approved');
    
  if (reportsError || !selectedReports) {
    throw new Error('Failed to fetch selected reports');
  }

  // Create partner invoice
  const { data: partnerInvoice, error: invoiceError } = await supabase
    .from('partner_invoices')
    .insert({
      invoice_number: invoiceNumber,
      partner_organization_id: data.partnerOrganizationId,
      invoice_date: data.invoiceDate || invoiceDate,
      due_date: data.dueDate || null,
      subtotal: data.subtotal,
      markup_percentage: data.markupPercentage,
      total_amount: data.totalAmount,
      status: 'draft',
      created_by: userProfile.id
    })
    .select('id')
    .single();
    
  if (invoiceError || !partnerInvoice) {
    throw new Error('Failed to create partner invoice');
  }

  // Create line items
  const lineItems = selectedReports.map(report => {
    const cost = report.subcontractor_costs?.reduce((sum: number, cost: any) => sum + Number(cost.amount), 0) || 0;
    const markupAmount = cost * (data.markupPercentage / 100);
    const totalAmount = cost + markupAmount;
    
    return {
      partner_invoice_id: partnerInvoice.id,
      work_order_report_id: report.id,
      amount: totalAmount,
      description: report.work_performed.substring(0, 200)
    };
  });
  
  const { error: lineItemsError } = await supabase
    .from('partner_invoice_line_items')
    .insert(lineItems);
    
  if (lineItemsError) {
    throw new Error('Failed to create invoice line items');
  }


  // Update work order reports with billing info
  const { error: updateError } = await supabase
    .from('work_order_reports')
    .update({
      partner_invoice_id: partnerInvoice.id,
      partner_billed_at: new Date().toISOString(),
      partner_billed_amount: data.totalAmount
    })
    .in('id', data.selectedReportIds);
    
  if (updateError) {
    throw new Error('Failed to update work order reports');
  }

  return {
    invoiceId: partnerInvoice.id,
    invoiceNumber: invoiceNumber
  };
}

export function usePartnerInvoiceGeneration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: generatePartnerInvoice,
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['partner-unbilled-reports'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      
      toast({
        title: 'Invoice Generated Successfully',
        description: `Partner invoice ${result.invoiceNumber} has been created.`,
      });
    },
    onError: (error) => {
      console.error('Partner invoice generation failed:', error);
      toast({
        title: 'Invoice Generation Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}