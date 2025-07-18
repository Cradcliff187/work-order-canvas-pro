
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

    const recipientEmail = reportData.profiles?.email;
    const recipientName = `${reportData.profiles?.first_name || ''} ${reportData.profiles?.last_name || ''}`.trim();

    if (!recipientEmail) {
      console.error('No recipient email found for report:', reportId);
      throw new Error('Recipient email not found');
    }

    // Prepare email content
    const subject = `Work Order Report ${status.charAt(0).toUpperCase() + status.slice(1)} - ${reportData.work_orders?.work_order_number}`;
    
    let emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Report ${status === 'approved' ? 'Approved' : 'Needs Revision'}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${status === 'approved' ? '#059669' : '#dc2626'}; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Work Report ${status === 'approved' ? 'Approved' : 'Needs Revision'}
        </h2>
        <p>Hello {{first_name}},</p>
        <p>Your report for work order {{work_order_number}} has been ${status}.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Work Order:</strong> {{work_order_number}}</p>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Status:</strong> <span style="color: ${status === 'approved' ? '#059669' : '#dc2626'}; font-weight: bold;">${status.toUpperCase()}</span></p>
          ${reviewNotes ? `<p><strong>Review Notes:</strong> ${reviewNotes}</p>` : ''}
        </div>
        ${status === 'approved' ? 
          '<p style="color: #059669;"><strong>Congratulations!</strong> Your work has been approved. You should expect payment processing to begin.</p>' :
          '<p style="color: #dc2626;"><strong>Action Required:</strong> Please review the feedback and make necessary revisions to your report.</p>'
        }
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          This email was sent by WorkOrderPro - Work Order Management System
        </p>
      </body>
      </html>
    `;

    // Replace template variables
    emailContent = emailContent
      .replace(/{{first_name}}/g, reportData.profiles?.first_name || 'Contractor')
      .replace(/{{work_order_number}}/g, reportData.work_orders?.work_order_number || 'N/A')
      .replace(/{{organization_name}}/g, reportData.work_orders?.organizations?.name || 'Client');

    // Create plain text version
    const textContent = emailContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    try {
      console.log(`Attempting to send email to ${recipientEmail}`);
      
      // Create SMTP client for email
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.ionos.com",
          port: 587,
          tls: true,
          auth: {
            username: Deno.env.get('IONOS_SMTP_USER') || '',
            password: Deno.env.get('IONOS_SMTP_PASS') || '',
          },
        },
      });

      // Send email with proper MIME headers
      await client.send({
        from: "WorkOrderPro <support@workorderportal.com>",
        to: recipientEmail,
        subject: subject,
        content: textContent,
        html: emailContent,
        headers: {
          "MIME-Version": "1.0",
          "Content-Type": "text/html; charset=utf-8",
        },
      });

      // Close the client
      await client.close();

      // Log email attempt
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          recipient_email: recipientEmail,
          template_used: 'report_reviewed',
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Failed to log email:', logError);
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
