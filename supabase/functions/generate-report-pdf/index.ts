import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

    // Fetch work order report with related data
    const { data: reportData, error: fetchError } = await supabase
      .from('work_order_reports')
      .select(`
        *,
        work_orders (
          *,
          organizations (*),
          trades (*)
        ),
        profiles:subcontractor_user_id (*)
      `)
      .eq('id', reportId)
      .single();

    if (fetchError || !reportData) {
      console.error('Error fetching report data:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Report data fetched successfully');

    // Create a simple PDF content (for now, just text-based)
    const pdfContent = generateSimplePDFContent(reportData);
    
    // Convert to blob
    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
    
    // Upload PDF to storage
    const fileName = `report_${reportId}_${Date.now()}.pdf`;
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

function generateSimplePDFContent(reportData: any): string {
  // Simple text-based PDF content (placeholder for actual PDF generation)
  const content = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
72 720 Td
(Work Order Report) Tj
0 -20 Td
(Work Order: ${reportData.work_orders?.work_order_number || 'N/A'}) Tj
0 -20 Td
(Organization: ${reportData.work_orders?.organizations?.name || 'N/A'}) Tj
0 -20 Td
(Work Performed: ${reportData.work_performed || 'N/A'}) Tj
0 -20 Td
(Hours Worked: ${reportData.hours_worked || 'N/A'}) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000369 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
620
%%EOF`;

  return content;
}