
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

// UUID validation helper
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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

    console.log(`Processing email request: ${template_name} for ${record_type} record ${record_id}, test_mode: ${test_mode}`);

    // Validate UUID format unless in test mode
    if (!test_mode && !isValidUUID(record_id)) {
      console.error(`Invalid UUID format: ${record_id}`);
      return new Response(
        JSON.stringify({ error: `Invalid UUID format: ${record_id}` }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Get email template with better error handling
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', template_name)
      .eq('is_active', true)
      .maybeSingle();

    if (templateError) {
      console.error(`Template query error for ${template_name}:`, templateError);
      return new Response(
        JSON.stringify({ error: `Template query failed: ${templateError.message}` }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    if (!template) {
      console.error(`Template not found: ${template_name}`);
      
      // Create basic templates if they don't exist
      const basicTemplate = {
        template_name: template_name,
        subject: `${template_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        html_content: `<h1>${template_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1><p>This is a system notification.</p>`,
        text_content: `${template_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\nThis is a system notification.`,
        is_active: true
      };

      const { error: createError } = await supabase
        .from('email_templates')
        .insert(basicTemplate);

      if (createError) {
        console.error(`Failed to create template ${template_name}:`, createError);
        return new Response(
          JSON.stringify({ error: `Template not found and could not be created: ${template_name}` }),
          { 
            status: 404, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log(`Created basic template: ${template_name}`);
      
      // Use the basic template we just created
      const createdTemplate = basicTemplate;
      
      // In test mode, just return success with template creation info
      if (test_mode) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            test_mode: true,
            template_created: true,
            template_name: template_name,
            recipient: recipient_email || 'test@workorderpro.com',
            subject: createdTemplate.subject
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }
    }

    // Handle test mode early
    if (test_mode) {
      console.log('Test mode - email would be sent to:', recipient_email || 'test@workorderpro.com');
      console.log('Subject:', template?.subject || 'Test Email');
      return new Response(
        JSON.stringify({ 
          success: true, 
          test_mode: true,
          recipient: recipient_email || 'test@workorderpro.com',
          subject: template?.subject || 'Test Email',
          template_found: !!template
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Fetch data and build email content based on record type
    let emailData: any = {};
    let toEmail = recipient_email;

    // Only fetch real data if not in test mode
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
          emailData = await getWorkOrderData(supabase, record_id);
          toEmail = toEmail || emailData.organization_contact_email;
        }
        break;
      case 'work_order_report':
        if (template_name === 'report_submitted') {
          emailData = await getReportSubmittedData(supabase, record_id);
          toEmail = toEmail || 'admin@workorderpro.com';
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
    const subject = replaceVariables(template!.subject, emailData);
    const htmlContent = replaceVariables(template!.html_content, emailData);
    const textContent = replaceVariables(template!.text_content || '', emailData);

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
    .maybeSingle();

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
    .maybeSingle();

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
    .maybeSingle();

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
    .maybeSingle();

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
    .maybeSingle();

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
