import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeneratePartnerInvoiceData {
  partnerOrganizationId: string;
  selectedBillIds: string[];
  internalReportIds?: string[];
  employeeTimeIds?: string[];
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

  // Fetch internal work order reports and employee time entries if provided
  const { data: internalReports } = data.internalReportIds?.length ? 
    await supabase
      .from('work_order_reports')
      .select(`
        *,
        work_orders!inner(
          work_order_number,
          title,
          assigned_organization_id
        )
      `)
      .in('id', data.internalReportIds)
    : { data: [] };

  const { data: employeeTimeEntries } = data.employeeTimeIds?.length ?
    await supabase
      .from('employee_reports')
      .select(`
        *,
        work_orders!inner(
          work_order_number,
          title
        ),
        profiles!employee_user_id(
          first_name,
          last_name
        )
      `)
      .in('id', data.employeeTimeIds)
    : { data: [] };

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
  const workOrderAssociations = [];
  
  // Add bill line items and work order associations
  for (const bill of selectedBills) {
    const cost = bill.total_amount || 0;
    const markupAmount = cost * (data.markupPercentage / 100);
    const totalAmount = cost + markupAmount;
    
    lineItems.push({
      partner_invoice_id: partnerInvoice.id,
      work_order_report_id: null, // Bills don't have specific work order reports
      amount: totalAmount,
      description: `Bill ${bill.internal_bill_number}${bill.external_bill_number ? ` (${bill.external_bill_number})` : ''}`
    });

    // Create work order associations from bills
    const { data: billWorkOrders } = await supabase
      .from('subcontractor_bill_work_orders')
      .select('work_order_id, amount, description')
      .eq('subcontractor_bill_id', bill.id);

    if (billWorkOrders) {
      billWorkOrders.forEach(billWO => {
        const markupAmount = (billWO.amount || 0) * (data.markupPercentage / 100);
        const totalWithMarkup = (billWO.amount || 0) + markupAmount;
        
        workOrderAssociations.push({
          partner_invoice_id: partnerInvoice.id,
          work_order_id: billWO.work_order_id,
          amount: totalWithMarkup,
          description: billWO.description || `Work order from bill ${bill.internal_bill_number}`
        });
      });
    }
  }
  
  // Add internal reports to line items and work order associations
  internalReports?.forEach(report => {
    const cost = report.bill_amount || 0;
    const markupAmount = cost * (data.markupPercentage / 100);
    const totalWithMarkup = cost + markupAmount;
    
    lineItems.push({
      partner_invoice_id: partnerInvoice.id,
      work_order_report_id: report.id,
      amount: totalWithMarkup,
      description: `Internal Work - ${report.work_orders.work_order_number}: ${report.work_orders.title}`
    });

    // Add work order association for internal reports
    workOrderAssociations.push({
      partner_invoice_id: partnerInvoice.id,
      work_order_id: report.work_orders.id,
      amount: totalWithMarkup,
      description: `Internal Work - ${report.work_orders.work_order_number}: ${report.work_orders.title}`
    });
  });

  // Add employee time entries to line items and work order associations
  employeeTimeEntries?.forEach(entry => {
    const cost = (entry.hours_worked * entry.hourly_rate_snapshot) || 0;
    const markupAmount = cost * (data.markupPercentage / 100);
    const totalWithMarkup = cost + markupAmount;
    
    const employeeName = `${entry.profiles?.first_name || ''} ${entry.profiles?.last_name || ''}`.trim();
    
    lineItems.push({
      partner_invoice_id: partnerInvoice.id,
      work_order_report_id: null, // Employee time entries don't link to work_order_reports
      amount: totalWithMarkup,
      description: `Employee Time - ${entry.work_orders.work_order_number}: ${employeeName} (${entry.hours_worked}h)`
    });

    // Add work order association for employee time entries
    workOrderAssociations.push({
      partner_invoice_id: partnerInvoice.id,
      work_order_id: entry.work_orders.id,
      amount: totalWithMarkup,
      description: `Employee Time - ${entry.work_orders.work_order_number}: ${employeeName} (${entry.hours_worked}h)`
    });
  });
  
  // Insert line items
  const { error: lineItemsError } = await supabase
    .from('partner_invoice_line_items')
    .insert(lineItems);
    
  if (lineItemsError) {
    throw new Error('Failed to create invoice line items');
  }

  // Insert work order associations
  if (workOrderAssociations.length > 0) {
    // Filter out any invalid entries
    const validAssociations = workOrderAssociations.filter(
      assoc => assoc.work_order_id && assoc.partner_invoice_id && assoc.amount
    );
    
    if (validAssociations.length > 0) {
      const { error: workOrdersError } = await supabase
        .from('partner_invoice_work_orders')
        .insert(validAssociations);
        
      if (workOrdersError) {
        throw new Error('Failed to create work order associations');
      }
    }
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
  if (data.internalReportIds?.length) {
    // Calculate total for each report (with markup)
    const reportAmounts = internalReports?.map(report => {
      const cost = report.bill_amount || 0;
      const markup = cost * (data.markupPercentage / 100);
      return {
        id: report.id,
        amount: cost + markup
      };
    }) || [];
    
    // Update each report with its billed amount
    for (const reportAmount of reportAmounts) {
      await supabase
        .from('work_order_reports')
        .update({ 
          partner_invoice_id: partnerInvoice.id,
          partner_billed_at: new Date().toISOString(),
          partner_billed_amount: reportAmount.amount
        })
        .eq('id', reportAmount.id);
    }
  }

  // Update employee time entries with partner invoice info
  if (data.employeeTimeIds?.length) {
    const { error: employeeUpdateError } = await supabase
      .from('employee_reports')
      .update({ 
        partner_invoice_id: partnerInvoice.id
      })
      .in('id', data.employeeTimeIds);
      
    if (employeeUpdateError) {
      throw new Error('Failed to update employee time entries');
    }
  }

  // Automatically generate PDF after invoice creation
  try {
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-partner-invoice-pdf', {
      body: { invoiceId: partnerInvoice.id }
    });

    if (pdfError || !pdfData?.success) {
      console.warn('PDF generation failed after invoice creation:', pdfError || pdfData?.error);
      // Don't throw error here - invoice creation was successful, PDF can be generated later
    }
  } catch (pdfError) {
    console.warn('PDF generation failed after invoice creation:', pdfError);
    // Don't throw error here - invoice creation was successful, PDF can be generated later
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
        description: `Partner invoice ${result.invoiceNumber} has been created and is ready for review.`,
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