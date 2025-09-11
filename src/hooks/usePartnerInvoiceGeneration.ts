import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeneratePartnerInvoiceData {
  partnerOrganizationId: string;
  selectedBillIds: string[];
  selectedReportIds?: string[];
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
  
  // Get selected bills with their details
  const { data: selectedBills, error: billsError } = await supabase
    .from('subcontractor_bills')
    .select(`
      id,
      internal_bill_number,
      external_bill_number,
      total_amount,
      subcontractor_organization_id
    `)
    .in('id', data.selectedBillIds)
    .eq('status', 'approved');
    
  if (billsError || !selectedBills) {
    throw new Error('Failed to fetch selected bills');
  }

  // Fetch internal work order reports if provided
  let internalReports = [];
  if (data.selectedReportIds && data.selectedReportIds.length > 0) {
    const { data: reportsData, error: reportsError } = await supabase
      .from('work_order_reports')
      .select('*, work_orders(work_order_number, title)')
      .in('id', data.selectedReportIds);
      
    if (reportsError) {
      throw new Error('Failed to fetch internal reports');
    }
    internalReports = reportsData || [];
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

  // Create line items from both bills and employee reports
  const lineItems = [];
  
  // Add bill line items
  selectedBills.forEach(bill => {
    const cost = bill.total_amount || 0;
    const markupAmount = cost * (data.markupPercentage / 100);
    const totalAmount = cost + markupAmount;
    
    lineItems.push({
      partner_invoice_id: partnerInvoice.id,
      work_order_report_id: null, // Bills don't have specific work order reports
      amount: totalAmount,
      description: `Bill ${bill.internal_bill_number}${bill.external_bill_number ? ` (${bill.external_bill_number})` : ''}`
    });
  });
  
  // Add internal report line items
  internalReports.forEach(report => {
    const cost = report.bill_amount || 0;
    const markupAmount = cost * (data.markupPercentage / 100);
    const totalAmount = cost + markupAmount;
    
    lineItems.push({
      partner_invoice_id: partnerInvoice.id,
      work_order_report_id: report.id,
      amount: totalAmount,
      description: `Internal Work - ${report.work_orders?.work_order_number}: ${report.work_orders?.title}`
    });
  });
  
  const { error: lineItemsError } = await supabase
    .from('partner_invoice_line_items')
    .insert(lineItems);
    
  if (lineItemsError) {
    throw new Error('Failed to create invoice line items');
  }


  // Update bills with partner billing info
  const { error: updateError } = await supabase
    .from('subcontractor_bills')
    .update({
      partner_billing_status: 'invoiced'
    })
    .in('id', data.selectedBillIds);
    
  if (updateError) {
    throw new Error('Failed to update bill status');
  }

  // Update internal reports with partner invoice info
  if (data.selectedReportIds && data.selectedReportIds.length > 0) {
    const { error: reportsUpdateError } = await supabase
      .from('work_order_reports')
      .update({
        partner_invoice_id: partnerInvoice.id
      })
      .in('id', data.selectedReportIds);
      
    if (reportsUpdateError) {
      throw new Error('Failed to update report status');
    }
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
      queryClient.invalidateQueries({ queryKey: ['partner-ready-bills'] });
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