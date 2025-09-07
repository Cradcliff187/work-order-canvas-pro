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
    console.log('PDF generation function started');
    
    const { reportId } = await req.json();
    
    if (!reportId) {
      console.error('No reportId provided');
      return new Response(
        JSON.stringify({ error: 'Report ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Generating PDF for report:', reportId);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Fetch work order report with related data and attachments
    const { data: reportData, error: fetchError } = await supabase
      .from('work_order_reports')
      .select(`
        *,
        work_orders (
          *,
          organizations!work_orders_organization_id_fkey (*),
          trades (*)
        ),
        profiles:subcontractor_user_id (*)
      `)
      .eq('id', reportId)
      .single();

    // Fetch attachments separately
    const { data: attachments } = await supabase
      .from('work_order_attachments')
      .select('*')
      .eq('work_order_report_id', reportId);

    if (fetchError || !reportData) {
      console.error('Error fetching report data:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Report data fetched successfully');

    // Generate professional PDF using jsPDF
    const pdfBlob = generateProfessionalPDF(reportData, attachments || []);
    
    // Generate readable filename
    const workOrderNumber = reportData.work_orders?.work_order_number || 'UNKNOWN';
    const submitterName = reportData.profiles?.first_name && reportData.profiles?.last_name
      ? `${reportData.profiles.first_name}-${reportData.profiles.last_name}`
      : 'Unknown';
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const fileName = `WO-${workOrderNumber}-${submitterName}-${date}.pdf`
      .replace(/[^a-zA-Z0-9-_.]/g, '-') // Sanitize
      .replace(/--+/g, '-'); // Remove double dashes
    
    const filePath = `reports/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('work-order-attachments')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
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
      .from('work-order-attachments')
      .getPublicUrl(filePath);

    // Update report with PDF URL
    const { error: updateError } = await supabase
      .from('work_order_reports')
      .update({
        pdf_url: urlData.publicUrl,
        pdf_generated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('Error updating report with PDF URL:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update report' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create internal attachment record for the generated PDF
    const { error: attachmentError } = await supabase
      .from('work_order_attachments')
      .insert({
        work_order_id: reportData.work_orders.id,
        work_order_report_id: reportId,
        file_name: fileName,
        file_url: filePath,
        file_type: 'document',
        file_size: pdfBlob.size,
        uploaded_by_user_id: reportData.subcontractor_user_id,
        is_internal: false  // Visible to all parties
      });

    if (attachmentError) {
      console.error('Failed to create attachment record for PDF:', attachmentError);
    } else {
      console.log('Internal attachment record created successfully for PDF:', fileName);
    }

    console.log('PDF generated successfully:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: urlData.publicUrl,
        message: 'PDF generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in PDF generation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateProfessionalPDF(reportData: any, attachments: any[]): Blob {
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

  // Helper function to add wrapped text
  function addWrappedText(text: string, x: number, y: number, maxWidth: number, fontSize: number = 11): number {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return lines.length * (fontSize * 0.35);
  }

  // Header Section
  addSectionBackground(currentY, 30, primaryBlue);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AKC CONSTRUCTION SERVICES', margin + 10, currentY + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const currentDate = new Date().toLocaleDateString();
  doc.text(`Work Order Report - ${currentDate}`, pageWidth - margin - 10, currentY + 20, { align: 'right' });
  
  currentY += 40;

  // Work Order Info Box
  doc.setTextColor(0, 0, 0);
  addSectionBackground(currentY, 60);
  addBorder(margin, currentY, contentWidth, 60);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Work Order Information', margin + 10, currentY + 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const workOrder = reportData.work_orders;
  const organization = workOrder?.organizations;
  const trade = workOrder?.trades;
  
  const infoY = currentY + 25;
  doc.text(`Work Order: ${workOrder?.work_order_number || 'N/A'}`, margin + 10, infoY);
  doc.text(`Status: ${workOrder?.status || 'N/A'}`, margin + 10, infoY + 12);
  doc.text(`Organization: ${organization?.name || 'N/A'}`, pageWidth/2, infoY);
  doc.text(`Trade: ${trade?.name || 'N/A'}`, pageWidth/2, infoY + 12);
  doc.text(`Location: ${workOrder?.store_location || 'N/A'}`, margin + 10, infoY + 24);
  doc.text(`Address: ${workOrder?.street_address || 'N/A'}`, pageWidth/2, infoY + 24);
  
  currentY += 70;

  // Report Details Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Report Details', margin, currentY);
  currentY += 15;

  // Work Performed
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Work Performed:', margin, currentY);
  currentY += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const workPerformed = reportData.work_performed || 'No description provided';
  const workPerformedHeight = addWrappedText(workPerformed, margin, currentY, contentWidth, 11);
  currentY += workPerformedHeight + 15;

  // Materials Used (if available)
  if (reportData.materials_used) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Materials Used:', margin, currentY);
    currentY += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const materialsHeight = addWrappedText(reportData.materials_used, margin, currentY, contentWidth, 11);
    currentY += materialsHeight + 15;
  }

  // Hours and Cost Information
  addSectionBackground(currentY, 25);
  addBorder(margin, currentY, contentWidth, 25);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Hours Worked: ${reportData.hours_worked || '0'}`, margin + 10, currentY + 15);
  doc.text(`Labor Cost: $${reportData.total_labor_cost || '0.00'}`, pageWidth/2, currentY + 15);
  
  currentY += 35;

  // Attachments Section
  if (attachments && attachments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Attachments', margin, currentY);
    currentY += 15;

    addSectionBackground(currentY, Math.min(attachments.length * 12 + 10, 50));
    addBorder(margin, currentY, contentWidth, Math.min(attachments.length * 12 + 10, 50));
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    attachments.forEach((attachment, index) => {
      if (currentY + 12 > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
      }
      
      const fileName = attachment.file_name || `Attachment ${index + 1}`;
      const fileType = attachment.file_type || 'Unknown';
      doc.text(`• ${fileName} (${fileType})`, margin + 10, currentY + 15 + (index * 12));
    });
    
    currentY += Math.min(attachments.length * 12 + 20, 60);
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  
  const generatedTime = new Date().toLocaleString();
  doc.text(`Generated: ${generatedTime}`, margin, footerY);
  doc.text(`Report ID: ${reportData.id}`, pageWidth - margin, footerY, { align: 'right' });
  doc.text('Page 1', pageWidth/2, footerY, { align: 'center' });

  // Convert to blob
  const pdfArrayBuffer = doc.output('arraybuffer');
  return new Blob([pdfArrayBuffer], { type: 'application/pdf' });
}