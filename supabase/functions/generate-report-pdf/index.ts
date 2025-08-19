import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "https://esm.sh/jspdf@2.5.1";
import QRCode from "https://esm.sh/qrcode-generator@1.4.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateQRCode(data: string): string {
  const qr = QRCode(0, 'L');
  qr.addData(data);
  qr.make();
  return qr.createDataURL(4);
}

function generatePDF(reportData: any, reportId: string): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 30;

  // Set font to Helvetica throughout
  doc.setFont('helvetica');

  // Professional Header Section
  function addHeader() {
    // Company branding header
    doc.setFillColor(24, 105, 218); // AKC Blue #1869DA
    doc.rect(margin, yPos - 15, pageWidth - (margin * 2), 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AKC Construction Services', margin + 10, yPos);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Streamline Your Construction Projects', margin + 10, yPos + 10);
    
    // Generation date in header
    const generationDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    doc.text(`Generated: ${generationDate}`, margin + 10, yPos + 20);
    
    // Generate QR Code for report link
    try {
      const reportUrl = `${Deno.env.get('SUPABASE_URL') || 'https://your-domain.com'}/admin/reports/${reportId}`;
      const qrDataUrl = generateQRCode(reportUrl);
      
      // Add QR code to top right (simplified text for now)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Scan for online report', pageWidth - 80, yPos + 5);
      doc.text('Report ID:', pageWidth - 80, yPos + 15);
      doc.text(reportId.substring(0, 8), pageWidth - 80, yPos + 20);
    } catch (error) {
      console.log('QR code generation skipped:', error);
    }
    
    yPos += 50;
    doc.setTextColor(0, 0, 0); // Reset to black text
  }

  // Section header styling
  function addSectionHeader(title: string) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 30;
      addPageHeader();
    }
    
    doc.setFillColor(243, 244, 246); // Light gray background
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 20, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 20, 'S');
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55); // Dark gray
    doc.text(title, margin + 10, yPos + 8);
    doc.setTextColor(0, 0, 0);
    yPos += 25;
  }

  // Content box styling
  function addContentBox(content: any, fields: Array<{key: string, label: string, format?: (val: any) => string}>) {
    const boxHeight = fields.length * 12 + 20;
    
    if (yPos + boxHeight > pageHeight - 40) {
      doc.addPage();
      yPos = 30;
      addPageHeader();
    }
    
    // Box border
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, yPos, pageWidth - (margin * 2), boxHeight, 'S');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    let fieldY = yPos + 15;
    fields.forEach(field => {
      const value = field.key.split('.').reduce((obj, key) => obj?.[key], content);
      if (value) {
        const displayValue = field.format ? field.format(value) : value;
        doc.setFont('helvetica', 'bold');
        doc.text(`${field.label}:`, margin + 10, fieldY);
        doc.setFont('helvetica', 'normal');
        doc.text(String(displayValue), margin + 80, fieldY);
        fieldY += 12;
      }
    });
    
    yPos += boxHeight + 10;
  }

  // Text content with wrapping
  function addTextContent(text: string, width: number = 150) {
    if (!text) return;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(text, width);
    
    const textHeight = splitText.length * 6 + 20;
    if (yPos + textHeight > pageHeight - 40) {
      doc.addPage();
      yPos = 30;
      addPageHeader();
    }
    
    // Text box
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, yPos, pageWidth - (margin * 2), textHeight, 'S');
    
    doc.text(splitText, margin + 10, yPos + 15);
    yPos += textHeight + 10;
  }

  // Page header for additional pages
  function addPageHeader() {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Work Order Report (Continued)', margin, yPos);
    yPos += 20;
  }

  // Footer with page numbers
  function addFooter(pageNum: number, totalPages: number) {
    const footerY = pageHeight - 20;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // Gray text
    
    // Page numbers
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
    
    // Copyright
    doc.text('© 2024 AKC Contracting - All Rights Reserved', margin, footerY);
    
    // Report ID
    doc.text(`Report ID: ${reportId}`, pageWidth - margin, footerY, { align: 'right' });
    
    doc.setTextColor(0, 0, 0); // Reset color
  }

  // Start building PDF
  addHeader();

  // Work Order Information Section
  const workOrder = reportData.work_orders;
  if (workOrder) {
    addSectionHeader('Work Order Information');
    addContentBox(workOrder, [
      { key: 'work_order_number', label: 'Work Order #' },
      { key: 'title', label: 'Title' },
      { key: 'organizations.name', label: 'Organization' },
      { key: 'trades.name', label: 'Trade' },
      { key: 'store_location', label: 'Location' },
      { 
        key: 'street_address', 
        label: 'Address',
        format: (val) => `${val}${workOrder.city ? ', ' + workOrder.city : ''}${workOrder.state ? ', ' + workOrder.state : ''}${workOrder.zip_code ? ' ' + workOrder.zip_code : ''}`
      }
    ]);
  }

  // Work Performed Section
  if (reportData.work_performed) {
    addSectionHeader('Work Performed');
    addTextContent(reportData.work_performed);
  }

  // Materials Used Section
  if (reportData.materials_used) {
    addSectionHeader('Materials Used');
    addTextContent(reportData.materials_used);
  }

  // Hours Worked Section
  if (reportData.labor_hours || reportData.labor_cost) {
    addSectionHeader('Labor Information');
    addContentBox(reportData, [
      { key: 'labor_hours', label: 'Hours Worked', format: (val) => `${val} hours` },
      { key: 'labor_cost', label: 'Labor Cost', format: (val) => `$${parseFloat(val).toFixed(2)}` },
      { key: 'materials_cost', label: 'Materials Cost', format: (val) => `$${parseFloat(val).toFixed(2)}` },
      { key: 'total_cost', label: 'Total Cost', format: (val) => `$${parseFloat(val).toFixed(2)}` }
    ]);
  }

  // Subcontractor Information Section
  if (reportData.subcontractor) {
    addSectionHeader('Subcontractor Information');
    addContentBox(reportData, [
      { 
        key: 'subcontractor_organization.name', 
        label: 'Company',
        format: (val) => `${val}${reportData.subcontractor_organization?.initials ? ' (' + reportData.subcontractor_organization.initials + ')' : ''}`
      },
      { 
        key: 'subcontractor', 
        label: 'Contact',
        format: (val) => `${val.first_name} ${val.last_name}`
      },
      { key: 'subcontractor.email', label: 'Email' },
      { key: 'subcontractor.phone', label: 'Phone' }
    ]);
  }

  // Attachments Section
  if (reportData.work_order_attachments?.length > 0) {
    addSectionHeader('Attachments');
    
    const attachmentHeight = reportData.work_order_attachments.length * 10 + 30;
    if (yPos + attachmentHeight > pageHeight - 40) {
      doc.addPage();
      yPos = 30;
      addPageHeader();
    }
    
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, yPos, pageWidth - (margin * 2), attachmentHeight, 'S');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    let attachY = yPos + 15;
    reportData.work_order_attachments.forEach((attachment: any, index: number) => {
      const uploadDate = attachment.uploaded_at ? 
        new Date(attachment.uploaded_at).toLocaleDateString() : 'Unknown date';
      doc.text(`${index + 1}. ${attachment.file_name}`, margin + 10, attachY);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(107, 114, 128);
      doc.text(`(${attachment.file_type} - ${uploadDate})`, margin + 15, attachY + 6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      attachY += 10;
    });
    
    yPos += attachmentHeight + 10;
  }

  // Report Metadata Section
  addSectionHeader('Report Metadata');
  const submitDate = reportData.submitted_at ? 
    new Date(reportData.submitted_at).toLocaleDateString() : 'Unknown';
  const reviewDate = reportData.reviewed_at ? 
    new Date(reportData.reviewed_at).toLocaleDateString() : 'Not reviewed';
  
  addContentBox(reportData, [
    { 
      key: 'subcontractor', 
      label: 'Submitted By',
      format: (val) => `${val.first_name} ${val.last_name}`
    },
    { key: 'submitted_at', label: 'Submitted Date', format: () => submitDate },
    { key: 'status', label: 'Status', format: (val) => val.charAt(0).toUpperCase() + val.slice(1) },
    { 
      key: 'reviewed_by', 
      label: 'Reviewed By',
      format: (val) => val ? `${val.first_name} ${val.last_name}` : 'Not reviewed'
    },
    { key: 'reviewed_at', label: 'Review Date', format: () => reviewDate }
  ]);

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc.output('arraybuffer');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json();

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: 'reportId parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Fetching report data for reportId: ${reportId}`);

    // Fetch comprehensive report data using the same pattern as useAdminReportDetail
    const { data: reportData, error } = await supabase
      .from('work_order_reports')
      .select(`
        *,
        work_orders!work_order_id(
          *,
          organizations!organization_id(name),
          trades!trade_id(name)
        ),
        subcontractor:profiles!subcontractor_user_id(
          first_name,
          last_name,
          email,
          phone,
          organization_members(
            role,
            organizations(
              id,
              name,
              organization_type
            )
          )
        ),
        subcontractor_organization:organizations!subcontractor_organization_id(
          id,
          name,
          initials
        ),
        reviewed_by:profiles!reviewed_by_user_id(
          first_name,
          last_name
        ),
        submitted_by:profiles!submitted_by_user_id(
          first_name,
          last_name,
          email,
          organization_members(
            role,
            organizations(
              id,
              name,
              organization_type
            )
          )
        ),
        work_order_attachments!work_order_report_id(
          id,
          file_name,
          file_url,
          file_type,
          uploaded_at
        )
      `)
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch report data', details: error.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!reportData) {
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully fetched report data for: ${reportData.work_orders?.work_order_number}`);

    // Generate PDF
    console.log('Generating PDF...');
    const pdfBuffer = generatePDF(reportData, reportId);
    
    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report-${reportId}-${timestamp}.pdf`;
    
    // Upload to Supabase Storage
    console.log(`Uploading PDF to storage: ${filename}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('work-order-attachments')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF to storage', details: uploadError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('work-order-attachments')
      .getPublicUrl(filename);
    
    const pdfUrl = urlData.publicUrl;
    
    // Update report record with PDF URL
    const { error: updateError } = await supabase
      .from('work_order_reports')
      .update({ 
        pdf_url: pdfUrl,
        pdf_generated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Don't fail the request, just log the error
      console.log('PDF generated but failed to update database record');
    }

    console.log(`PDF generated successfully: ${pdfUrl}`);

    // Return success response with actual PDF URL
    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF generated successfully',
        reportId,
        pdfUrl,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-report-pdf function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});