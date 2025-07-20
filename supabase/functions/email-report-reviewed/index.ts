import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailReportRequest {
  reportId: string;
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, status, reviewNotes }: EmailReportRequest = await req.json();
    
    console.log('Processing email notification for report:', { reportId, status });

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get report details with subcontractor and work order info
    const { data: reportData, error: reportError } = await supabase
      .from('work_order_reports')
      .select(`
        *,
        work_orders!work_order_id(
          id,
          work_order_number,
          title,
          organization_id,
          organizations!organization_id(name)
        ),
        profiles!subcontractor_user_id(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', reportId)
      .single();

    if (reportError || !reportData) {
      console.error('Failed to fetch report data:', reportError);
      throw new Error('Report not found');
    }

    // Get email template for report reviewed
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'report_reviewed')
      .eq('is_active', true)
      .single();

    const recipientEmail = reportData.profiles?.email;
    const recipientName = `${reportData.profiles?.first_name || ''} ${reportData.profiles?.last_name || ''}`.trim();

    if (!recipientEmail) {
      console.error('No recipient email found for report:', reportId);
      throw new Error('Recipient email not found');
    }

    // Prepare email content
    const subject = template?.subject || `Work Order Report ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    
    let emailContent = template?.html_content || `
      <h2>Your work order report has been ${status}</h2>
      <p>Hello {{first_name}},</p>
      <p>Your report for work order {{work_order_number}} - {{work_order_title}} has been ${status}.</p>
      {{#if review_notes}}<p><strong>Review Notes:</strong> {{review_notes}}</p>{{/if}}
      <p>Best regards,<br/>WorkOrderPro Team</p>
    `;

    // Simple template variable replacement
    emailContent = emailContent
      .replace(/{{first_name}}/g, reportData.profiles?.first_name || 'Contractor')
      .replace(/{{work_order_number}}/g, reportData.work_orders?.work_order_number || 'N/A')
      .replace(/{{work_order_title}}/g, reportData.work_orders?.title || 'N/A')
      .replace(/{{status}}/g, status)
      .replace(/{{organization_name}}/g, reportData.work_orders?.organizations?.name || 'Client');

    // Handle review notes conditionally
    if (reviewNotes) {
      emailContent = emailContent.replace(/{{#if review_notes}}.*?{{\/if}}/gs, `<p><strong>Review Notes:</strong> ${reviewNotes}</p>`);
    } else {
      emailContent = emailContent.replace(/{{#if review_notes}}.*?{{\/if}}/gs, '');
    }

    try {
      // Use Supabase Auth admin to send email
      const { error: emailError } = await supabase.auth.admin.sendEmail({
        email: recipientEmail,
        subject: subject,
        html: emailContent,
      });

      // Log email attempt
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          recipient_email: recipientEmail,
          template_used: 'report_reviewed',
          status: emailError ? 'failed' : 'sent',
          error_message: emailError?.message || null,
          sent_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Failed to log email:', logError);
      }

      if (emailError) {
        console.error('Failed to send email:', emailError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: emailError.message,
            logged: !logError 
          }),
          {
            status: 200, // Don't fail the main operation if email fails
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      console.log('Email sent successfully to:', recipientEmail);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email notification sent successfully',
          recipient: recipientEmail 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      
      // Log the failure
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: recipientEmail,
          template_used: 'report_reviewed',
          status: 'failed',
          error_message: emailError.message,
          sent_at: new Date().toISOString()
        });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service unavailable',
          details: emailError.message 
        }),
        {
          status: 200, // Don't fail the main operation
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error('Error in email-report-reviewed function:', error);
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