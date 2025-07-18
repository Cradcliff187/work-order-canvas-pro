
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailReportSubmittedRequest {
  reportId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId }: EmailReportSubmittedRequest = await req.json();
    
    console.log('Processing email notification for submitted report:', reportId);

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get report details with work order, organization, and subcontractor info
    const { data: reportData, error: reportError } = await supabase
      .from('work_order_reports')
      .select(`
        *,
        work_orders!work_order_id(
          id,
          work_order_number,
          title,
          organization_id,
          store_location,
          organizations!organization_id(name)
        ),
        profiles!subcontractor_user_id(
          first_name,
          last_name,
          company_name
        )
      `)
      .eq('id', reportId)
      .single();

    if (reportError || !reportData) {
      console.error('Failed to fetch report data:', reportError);
      throw new Error('Report not found');
    }

    // Get admin users to notify
    const { data: adminUsers } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_type', 'admin')
      .eq('is_active', true);

    if (!adminUsers || adminUsers.length === 0) {
      console.error('No admin users found to notify');
      throw new Error('No admin users found');
    }

    // Get email template for report submitted
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'report_submitted')
      .eq('is_active', true)
      .single();

    const subject = template?.subject || `Work Report Submitted - ${reportData.work_orders?.work_order_number}`;
    
    let emailContent = template?.html_content || `
      <h2>Work Report Submitted</h2>
      <p>A work completion report has been submitted and is ready for review.</p>
      <p><strong>Work Order:</strong> {{work_order_number}}</p>
      <p><strong>Subcontractor:</strong> {{subcontractor_name}}</p>
      <p><strong>Organization:</strong> {{organization_name}}</p>
      <p><strong>Location:</strong> {{store_location}}</p>
      <p><strong>Work Performed:</strong> {{work_performed}}</p>
      <p><strong>Invoice Amount:</strong> ${{invoice_amount}}</p>
      <p>Please review and approve or request changes.</p>
    `;

    const subcontractorName = reportData.profiles?.company_name || 
      `${reportData.profiles?.first_name || ''} ${reportData.profiles?.last_name || ''}`.trim() || 
      'Unknown Contractor';

    // Replace template variables
    emailContent = emailContent
      .replace(/{{work_order_number}}/g, reportData.work_orders?.work_order_number || 'N/A')
      .replace(/{{subcontractor_name}}/g, subcontractorName)
      .replace(/{{organization_name}}/g, reportData.work_orders?.organizations?.name || 'N/A')
      .replace(/{{store_location}}/g, reportData.work_orders?.store_location || 'N/A')
      .replace(/{{work_performed}}/g, reportData.work_performed || 'No details provided')
      .replace(/{{invoice_amount}}/g, reportData.invoice_amount?.toString() || '0.00');

    // Send emails to all admin users
    const emailPromises = adminUsers.map(async (admin) => {
      try {
        const { error: emailError } = await supabase.auth.admin.sendEmail({
          email: admin.email,
          subject: subject,
          html: emailContent,
        });

        // Log email attempt
        await supabase
          .from('email_logs')
          .insert({
            work_order_id: reportData.work_order_id,
            recipient_email: admin.email,
            template_used: 'report_submitted',
            status: emailError ? 'failed' : 'sent',
            error_message: emailError?.message || null,
            sent_at: new Date().toISOString()
          });

        return { email: admin.email, success: !emailError, error: emailError };
      } catch (error: any) {
        console.error(`Failed to send email to ${admin.email}:`, error);
        return { email: admin.email, success: false, error: error.message };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter(r => r.success).length;

    console.log(`Sent ${successCount}/${emailResults.length} emails successfully`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Report submission notifications sent to ${successCount} admin users`,
        details: emailResults
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in email-report-submitted function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
