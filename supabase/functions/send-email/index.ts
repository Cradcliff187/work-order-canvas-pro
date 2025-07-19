
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  template_name: string;
  record_id: string;
  record_type: string;
  recipient_email?: string;
  test_mode?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { template_name, record_id, record_type, recipient_email, test_mode = false }: EmailRequest = await req.json();

    console.log(`Processing email request: ${template_name} for ${record_type} record ${record_id}`);

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', template_name)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error(`Template not found: ${template_name}`, templateError);
      return new Response(
        JSON.stringify({ error: 'Email template not found' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Fetch data and build email content based on record type
    let emailData: any = {};
    let toEmail = recipient_email;

    switch (record_type) {
      case 'work_order_assignment':
        emailData = await getWorkOrderAssignmentData(supabase, record_id);
        toEmail = toEmail || emailData.assignee_email;
        break;
      case 'work_order':
        if (template_name === 'work_order_completed') {
          emailData = await getWorkOrderCompletedData(supabase, record_id);
          toEmail = toEmail || emailData.partner_email;
        } else {
          // Default work order data
          emailData = await getWorkOrderData(supabase, record_id);
          toEmail = toEmail || emailData.organization_contact_email;
        }
        break;
      case 'work_order_report':
        if (template_name === 'report_submitted') {
          emailData = await getReportSubmittedData(supabase, record_id);
          toEmail = toEmail || 'admin@workorderpro.com'; // Default admin email
        } else if (template_name === 'report_reviewed') {
          emailData = await getReportReviewedData(supabase, record_id);
          toEmail = toEmail || emailData.subcontractor_email;
        }
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown record type: ${record_type}` }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
    }

    if (!toEmail) {
      console.error(`No recipient email found for ${template_name} on ${record_type}`);
      return new Response(
        JSON.stringify({ error: 'No recipient email found' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Replace template variables
    const subject = replaceVariables(template.subject, emailData);
    const htmlContent = replaceVariables(template.html_content, emailData);
    const textContent = replaceVariables(template.text_content || '', emailData);

    // Send email in test mode or real mode
    if (test_mode) {
      console.log('Test mode - email would be sent to:', toEmail);
      console.log('Subject:', subject);
      return new Response(
        JSON.stringify({ 
          success: true, 
          test_mode: true,
          recipient: toEmail,
          subject,
          html_preview: htmlContent.substring(0, 200) + '...'
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Configure SMTP client for IONOS
    const smtpClient = new SMTPClient({
      connection: {
        hostname: "smtp.ionos.com",
        port: 587,
        tls: false,
        auth: {
          username: Deno.env.get("IONOS_SMTP_USER") ?? '',
          password: Deno.env.get("IONOS_SMTP_PASS") ?? '',
        },
      },
    });

    console.log('Connecting to IONOS SMTP...');

    // Send actual email via IONOS SMTP
    await smtpClient.send({
      from: "WorkOrderPro <support@workorderportal.com>",
      to: toEmail,
      subject: subject,
      content: textContent,
      html: htmlContent,
    });

    console.log('Email sent successfully via IONOS SMTP to:', toEmail);

    // Close SMTP connection
    await smtpClient.close();

    // Log email
    await supabase.from('email_logs').insert({
      template_used: template_name,
      recipient_email: toEmail,
      status: 'sent',
      work_order_id: emailData.work_order_id || null
    });

    return new Response(
      JSON.stringify({ success: true, provider: 'IONOS SMTP' }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error sending email:', error);
    
    // Enhanced error logging for SMTP issues
    if (error.message?.includes('SMTP') || error.message?.includes('connection')) {
      console.error('SMTP Connection Error - Check IONOS credentials and settings');
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        provider: 'IONOS SMTP',
        details: 'Check IONOS_SMTP_USER and IONOS_SMTP_PASS environment variables'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

// Helper functions to fetch data for each record type
async function getWorkOrderAssignmentData(supabase: any, assignmentId: string) {
  const { data } = await supabase
    .from('work_order_assignments')
    .select(`
      *,
      work_order:work_order_id (
        work_order_number,
        title,
        description,
        organization:organization_id (name)
      ),
      assignee:assigned_to (first_name, last_name, email)
    `)
    .eq('id', assignmentId)
    .single();

  return {
    work_order_id: data?.work_order_id,
    work_order_number: data?.work_order?.work_order_number,
    work_order_title: data?.work_order?.title,
    work_order_description: data?.work_order?.description,
    organization_name: data?.work_order?.organization?.name,
    assignee_name: `${data?.assignee?.first_name} ${data?.assignee?.last_name}`,
    assignee_email: data?.assignee?.email,
    assignment_notes: data?.notes,
    first_name: data?.assignee?.first_name
  };
}

async function getWorkOrderData(supabase: any, workOrderId: string) {
  const { data } = await supabase
    .from('work_orders')
    .select(`
      *,
      organization:organization_id (name, contact_email),
      trade:trade_id (name)
    `)
    .eq('id', workOrderId)
    .single();

  return {
    work_order_id: workOrderId,
    work_order_number: data?.work_order_number,
    work_order_title: data?.title,
    organization_name: data?.organization?.name,
    organization_contact_email: data?.organization?.contact_email,
    trade_name: data?.trade?.name,
    created_at: data?.created_at
  };
}

async function getWorkOrderCompletedData(supabase: any, workOrderId: string) {
  const { data } = await supabase
    .from('work_orders')
    .select(`
      *,
      organization:organization_id (name, contact_email),
      trade:trade_id (name)
    `)
    .eq('id', workOrderId)
    .single();

  return {
    work_order_id: workOrderId,
    work_order_number: data?.work_order_number,
    work_order_title: data?.title,
    organization_name: data?.organization?.name,
    partner_email: data?.organization?.contact_email,
    trade_name: data?.trade?.name,
    completed_date: data?.completed_at
  };
}

async function getReportSubmittedData(supabase: any, reportId: string) {
  const { data } = await supabase
    .from('work_order_reports')
    .select(`
      *,
      work_order:work_order_id (
        work_order_number,
        title,
        organization:organization_id (name)
      ),
      subcontractor:subcontractor_user_id (first_name, last_name, email)
    `)
    .eq('id', reportId)
    .single();

  return {
    work_order_id: data?.work_order_id,
    work_order_number: data?.work_order?.work_order_number,
    work_order_title: data?.work_order?.title,
    organization_name: data?.work_order?.organization?.name,
    subcontractor_name: `${data?.subcontractor?.first_name} ${data?.subcontractor?.last_name}`,
    subcontractor_email: data?.subcontractor?.email,
    work_performed: data?.work_performed,
    invoice_amount: data?.invoice_amount,
    submitted_at: data?.submitted_at
  };
}

async function getReportReviewedData(supabase: any, reportId: string) {
  const { data } = await supabase
    .from('work_order_reports')
    .select(`
      *,
      work_order:work_order_id (
        work_order_number,
        title,
        organization:organization_id (name)
      ),
      subcontractor:subcontractor_user_id (first_name, last_name, email)
    `)
    .eq('id', reportId)
    .single();

  return {
    work_order_id: data?.work_order_id,
    work_order_number: data?.work_order?.work_order_number,
    work_order_title: data?.work_order?.title,
    organization_name: data?.work_order?.organization?.name,
    subcontractor_name: `${data?.subcontractor?.first_name} ${data?.subcontractor?.last_name}`,
    subcontractor_email: data?.subcontractor?.email,
    first_name: data?.subcontractor?.first_name,
    status: data?.status,
    review_notes: data?.review_notes,
    reviewed_at: data?.reviewed_at
  };
}

function replaceVariables(template: string, data: any): string {
  let result = template;
  
  // Replace all {{variable}} patterns
  const variablePattern = /\{\{(\w+)\}\}/g;
  result = result.replace(variablePattern, (match, variableName) => {
    return data[variableName] || match;
  });

  return result;
}

serve(handler);
