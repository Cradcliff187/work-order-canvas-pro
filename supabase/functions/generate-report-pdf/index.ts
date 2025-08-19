import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePDF(reportData: any): Uint8Array {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Work Order Report', 20, 30);
  
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);
  
  // Work Order Information
  doc.setFontSize(16);
  doc.text('Work Order Information', 20, 60);
  
  doc.setFontSize(12);
  const workOrder = reportData.work_orders;
  let yPos = 70;
  
  if (workOrder?.work_order_number) {
    doc.text(`Work Order #: ${workOrder.work_order_number}`, 20, yPos);
    yPos += 10;
  }
  
  if (workOrder?.title) {
    doc.text(`Title: ${workOrder.title}`, 20, yPos);
    yPos += 10;
  }
  
  if (workOrder?.organizations?.name) {
    doc.text(`Organization: ${workOrder.organizations.name}`, 20, yPos);
    yPos += 10;
  }
  
  if (workOrder?.trades?.name) {
    doc.text(`Trade: ${workOrder.trades.name}`, 20, yPos);
    yPos += 10;
  }
  
  if (workOrder?.store_location) {
    doc.text(`Location: ${workOrder.store_location}`, 20, yPos);
    yPos += 10;
  }
  
  if (workOrder?.street_address) {
    doc.text(`Address: ${workOrder.street_address}, ${workOrder.city}, ${workOrder.state} ${workOrder.zip_code}`, 20, yPos);
    yPos += 20;
  }
  
  // Subcontractor Information
  doc.setFontSize(16);
  doc.text('Subcontractor Information', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(12);
  if (reportData.subcontractor_organization?.name) {
    doc.text(`Company: ${reportData.subcontractor_organization.name} (${reportData.subcontractor_organization.initials})`, 20, yPos);
    yPos += 10;
  }
  
  if (reportData.subcontractor) {
    doc.text(`Contact: ${reportData.subcontractor.first_name} ${reportData.subcontractor.last_name}`, 20, yPos);
    yPos += 10;
    if (reportData.subcontractor.email) {
      doc.text(`Email: ${reportData.subcontractor.email}`, 20, yPos);
      yPos += 10;
    }
    if (reportData.subcontractor.phone) {
      doc.text(`Phone: ${reportData.subcontractor.phone}`, 20, yPos);
      yPos += 20;
    }
  }
  
  // Report Details
  doc.setFontSize(16);
  doc.text('Report Details', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(12);
  if (reportData.labor_hours) {
    doc.text(`Labor Hours: ${reportData.labor_hours}`, 20, yPos);
    yPos += 10;
  }
  
  if (reportData.labor_cost) {
    doc.text(`Labor Cost: $${reportData.labor_cost}`, 20, yPos);
    yPos += 10;
  }
  
  if (reportData.materials_cost) {
    doc.text(`Materials Cost: $${reportData.materials_cost}`, 20, yPos);
    yPos += 10;
  }
  
  if (reportData.total_cost) {
    doc.text(`Total Cost: $${reportData.total_cost}`, 20, yPos);
    yPos += 20;
  }
  
  // Work Performed
  if (reportData.work_performed) {
    doc.setFontSize(16);
    doc.text('Work Performed', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(reportData.work_performed, 170);
    doc.text(splitText, 20, yPos);
    yPos += splitText.length * 5 + 10;
  }
  
  // Materials Used
  if (reportData.materials_used) {
    doc.setFontSize(16);
    doc.text('Materials Used', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(reportData.materials_used, 170);
    doc.text(splitText, 20, yPos);
    yPos += splitText.length * 5 + 10;
  }
  
  // Attachments
  if (reportData.work_order_attachments?.length > 0) {
    doc.setFontSize(16);
    doc.text('Attachments', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    reportData.work_order_attachments.forEach((attachment: any) => {
      doc.text(`- ${attachment.file_name} (${attachment.file_type})`, 25, yPos);
      yPos += 8;
    });
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
    const pdfBuffer = generatePDF(reportData);
    
    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report-${reportId}-${timestamp}.pdf`;
    
    // Upload to Supabase Storage
    console.log(`Uploading PDF to storage: ${filename}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('work-order-reports')
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
      .from('work-order-reports')
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