
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  templateName: string;
  recordId: string;
  recipientEmail?: string;
  testMode?: boolean;
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

    const { templateName, recordId, recipientEmail, testMode = false }: EmailRequest = await req.json();

    console.log(`Processing email request: ${templateName} for record ${recordId}`);

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', templateName)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error(`Template not found: ${templateName}`, templateError);
      return new Response(
        JSON.stringify({ error: 'Email template not found' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Fetch data and build email content based on template type
    let emailData: any = {};
    let toEmail = recipientEmail;

    switch (templateName) {
      case 'work_order_assigned':
        emailData = await getWorkOrderAssignedData(supabase, recordId);
        toEmail = toEmail || emailData.assignee_email;
        break;
      case 'work_order_completed':
        emailData = await getWorkOrderCompletedData(supabase, recordId);
        toEmail = toEmail || emailData.partner_email;
        break;
      case 'report_submitted':
        emailData = await getReportSubmittedData(supabase, recordId);
        toEmail = toEmail || 'admin@workorderpro.com'; // Default admin email
        break;
      case 'report_reviewed':
        emailData = await getReportReviewedData(supabase, recordId);
        toEmail = toEmail || emailData.subcontractor_email;
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown template type' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
    }

    if (!toEmail) {
      console.error(`No recipient email found for ${templateName}`);
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
    if (testMode) {
      console.log('Test mode - email would be sent to:', toEmail);
      console.log('Subject:', subject);
      return new Response(
        JSON.stringify({ 
          success: true, 
          testMode: true,
          recipient: toEmail,
          subject,
          htmlPreview: htmlContent.substring(0, 200) + '...'
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Send actual email
    const emailResult = await resend.emails.send({
      from: 'WorkOrderPro <noreply@workorderpro.com>',
      to: [toEmail],
      subject,
      html: htmlContent,
      text: textContent,
    });

    // Log email
    await supabase.from('email_logs').insert({
      template_used: templateName,
      recipient_email: toEmail,
      status: 'sent',
      work_order_id: emailData.work_order_id || null
    });

    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.data?.id }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

// Helper functions to fetch data for each email type
async function getWorkOrderAssignedData(supabase: any, assignmentId: string) {
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
