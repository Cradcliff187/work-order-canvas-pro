import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Partner invoice PDF generation function started');
    
    const { invoiceId } = await req.json();
    
    if (!invoiceId) {
      console.error('No invoiceId provided');
      return new Response(
        JSON.stringify({ error: 'Invoice ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Generating PDF for partner invoice:', invoiceId);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Fetch partner invoice with related data and line items
    const { data: invoiceData, error: fetchError } = await supabase
      .from('partner_invoices')
      .select(`
        *,
        partner_organization:organizations!partner_organization_id(
          id,
          name,
          contact_email,
          contact_phone,
          address,
          initials
        ),
        partner_invoice_line_items(
          id,
          description,
          amount,
          work_order_report_id
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoiceData) {
      console.error('Error fetching invoice data:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Invoice data fetched successfully');

    // Generate professional PDF using jsPDF
    const pdfBlob = generatePartnerInvoicePDF(invoiceData);
    
    // Generate readable filename
    const invoiceNumber = invoiceData.invoice_number || 'UNKNOWN';
    const partnerName = invoiceData.partner_organization?.name || 'Unknown-Partner';
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const fileName = `Invoice-${invoiceNumber}-${partnerName}-${date}.pdf`
      .replace(/[^a-zA-Z0-9-_.]/g, '-') // Sanitize
      .replace(/--+/g, '-'); // Remove double dashes
    
    const filePath = `invoices/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('partner-invoices')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('partner-invoices')
      .getPublicUrl(filePath);

    // Update invoice with PDF URL
    const { error: updateError } = await supabase
      .from('partner_invoices')
      .update({
        pdf_url: urlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error updating invoice with PDF URL:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update invoice' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create attachments for all related work orders
    console.log('Creating work order attachments for partner invoice PDF...');
    
    // Get all work order reports linked to this invoice
    const { data: lineItems } = await supabase
      .from('partner_invoice_line_items')
      .select('work_order_report_id')
      .eq('partner_invoice_id', invoiceId)
      .not('work_order_report_id', 'is', null);

    if (lineItems && lineItems.length > 0) {
      // Get the work order IDs from those reports
      const { data: reports } = await supabase
        .from('work_order_reports')
        .select('work_order_id')
        .in('id', lineItems.map(li => li.work_order_report_id));

      if (reports && reports.length > 0) {
        // Get unique work order IDs (avoid duplicates)
        const uniqueWorkOrderIds = [...new Set(reports.map(r => r.work_order_id))];
        
        let attachmentsCreated = 0;
        let attachmentErrors = 0;

        for (const workOrderId of uniqueWorkOrderIds) {
          try {
            // Check if attachment already exists to prevent duplicates
            const { data: existing } = await supabase
              .from('work_order_attachments')
              .select('id')
              .eq('work_order_id', workOrderId)
              .eq('file_url', urlData.publicUrl)
              .maybeSingle();

            if (!existing) {
              const { error: attachmentError } = await supabase
                .from('work_order_attachments')
                .insert({
                  work_order_id: workOrderId,
                  file_name: `Partner_Invoice_${invoiceData.invoice_number}.pdf`,
                  file_url: urlData.publicUrl,
                  file_type: 'document',
                  file_size: pdfBlob.size,
                  uploaded_by_user_id: invoiceData.created_by,
                  is_internal: false  // Visible to all parties
                });

              if (attachmentError) {
                console.error(`Failed to create attachment for work order ${workOrderId}:`, attachmentError);
                attachmentErrors++;
              } else {
                attachmentsCreated++;
              }
            }
          } catch (error) {
            console.error(`Error processing attachment for work order ${workOrderId}:`, error);
            attachmentErrors++;
          }
        }

        console.log(`Partner invoice PDF attachments created: ${attachmentsCreated} work orders, ${attachmentErrors} errors`);
        console.log(`Related work orders: ${uniqueWorkOrderIds.length} total`);
      } else {
        console.log('No work order reports found for invoice line items');
      }
    } else {
      console.log('No line items with work order reports found');
    }

    console.log('Partner invoice PDF generated successfully:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: urlData.publicUrl,
        message: 'Partner invoice PDF generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in partner invoice PDF generation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generatePartnerInvoicePDF(invoiceData: any): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // Colors
  const primaryBlue = [0, 128, 255]; // #0080FF
  const lightGray = [243, 244, 246]; // #f3f4f6
  const darkGray = [107, 114, 128]; // #6b7280
  const black = [0, 0, 0];

  // Helper function to add section background
  function addSectionBackground(y: number, height: number, color: number[] = lightGray) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, contentWidth, height, 'F');
  }

  // Helper function to add border
  function addBorder(x: number, y: number, width: number, height: number, color: number[] = darkGray) {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, height);
  }

  // Helper function to format currency
  function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  // Helper function to format date
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Header Section
  addSectionBackground(currentY, 40, primaryBlue);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('AKC CONSTRUCTION SERVICES', margin + 10, currentY + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('INVOICE', pageWidth - margin - 10, currentY + 25, { align: 'right' });
  
  currentY += 50;

  // Invoice Header Information
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Invoice #${invoiceData.invoice_number}`, margin, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Invoice Date: ${formatDate(invoiceData.invoice_date)}`, pageWidth - margin, currentY, { align: 'right' });
  if (invoiceData.due_date) {
    doc.text(`Due Date: ${formatDate(invoiceData.due_date)}`, pageWidth - margin, currentY + 12, { align: 'right' });
  }
  
  currentY += 30;

  // Bill To Section
  addSectionBackground(currentY, 80);
  addBorder(margin, currentY, contentWidth, 80);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('BILL TO:', margin + 10, currentY + 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const partner = invoiceData.partner_organization;
  doc.text(partner?.name || 'Partner Organization', margin + 10, currentY + 28);
  
  if (partner?.address) {
    doc.text(partner.address, margin + 10, currentY + 40);
  }
  
  if (partner?.contact_email) {
    doc.text(`Email: ${partner.contact_email}`, margin + 10, currentY + 52);
  }
  
  if (partner?.contact_phone) {
    doc.text(`Phone: ${partner.contact_phone}`, margin + 10, currentY + 64);
  }
  
  currentY += 90;

  // Line Items Table Header
  const tableStartY = currentY;
  addSectionBackground(currentY, 20, darkGray);
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DESCRIPTION', margin + 5, currentY + 12);
  doc.text('AMOUNT', pageWidth - margin - 5, currentY + 12, { align: 'right' });
  
  currentY += 20;

  // Line Items
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const lineItems = invoiceData.partner_invoice_line_items || [];
  lineItems.forEach((item: any, index: number) => {
    // Add alternating row background
    if (index % 2 === 0) {
      addSectionBackground(currentY, 15, [249, 250, 251]);
    }
    
    addBorder(margin, currentY, contentWidth, 15, [229, 231, 235]);
    
    const description = item.description || `Work Order Report ${item.work_order_report_id}`;
    doc.text(description, margin + 5, currentY + 10);
    doc.text(formatCurrency(item.amount), pageWidth - margin - 5, currentY + 10, { align: 'right' });
    
    currentY += 15;
  });

  // Financial Summary
  currentY += 10;
  const summaryStartY = currentY;
  
  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Subtotal:', pageWidth - margin - 80, currentY);
  doc.text(formatCurrency(invoiceData.subtotal), pageWidth - margin - 5, currentY, { align: 'right' });
  currentY += 15;
  
  // Markup (if applicable)
  if (invoiceData.markup_percentage && invoiceData.markup_percentage > 0) {
    const markupAmount = (invoiceData.subtotal * invoiceData.markup_percentage / 100);
    doc.text(`Markup (${invoiceData.markup_percentage}%):`, pageWidth - margin - 80, currentY);
    doc.text(formatCurrency(markupAmount), pageWidth - margin - 5, currentY, { align: 'right' });
    currentY += 15;
  }
  
  // Total
  addSectionBackground(currentY, 20, primaryBlue);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', pageWidth - margin - 80, currentY + 12);
  doc.text(formatCurrency(invoiceData.total_amount), pageWidth - margin - 5, currentY + 12, { align: 'right' });
  
  currentY += 30;

  // Payment Terms (if available)
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (invoiceData.due_date) {
    doc.text('Payment Terms: Net 30 days', margin, currentY);
    currentY += 12;
  }
  
  doc.text('Please remit payment to the address above.', margin, currentY);
  currentY += 12;
  doc.text('Thank you for your business!', margin, currentY);

  // Footer
  const footerY = pageHeight - 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  
  const generatedTime = new Date().toLocaleString();
  doc.text(`Generated: ${generatedTime}`, margin, footerY);
  doc.text(`Invoice ID: ${invoiceData.id}`, pageWidth - margin, footerY, { align: 'right' });
  doc.text('Page 1', pageWidth/2, footerY, { align: 'center' });

  // Convert to blob
  const pdfArrayBuffer = doc.output('arraybuffer');
  return new Blob([pdfArrayBuffer], { type: 'application/pdf' });
}