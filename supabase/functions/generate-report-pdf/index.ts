import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Return success response with placeholder structure
    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF generation placeholder - report data fetched successfully',
        reportId,
        reportData,
        pdfUrl: null, // Will be implemented in next step
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