import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { Resend } from 'npm:resend@4.0.0';

// Initialize Supabase and Resend clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Branding variables for all emails
const BRANDING_VARIABLES = {
  company_name: 'WorkOrderPro',
  support_email: 'support@workorderportal.com',
  company_address: 'Austin, TX',
  company_logo_url: 'https://workorderportal.com/logo.png',
  company_website: 'https://workorderportal.com',
  primary_color: '#2563eb',
  secondary_color: '#1e40af'
};

/**
 * Generate a full URL from a path
 */
function generateUrl(path: string): string {
  const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://workorderportal.com';
  return `${baseUrl}${path}`;
}

/**
 * Create a JSON response with CORS headers
 */
function createCorsResponse(body: any, statusCode: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req) => {
  console.log('📧 Processing email request');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { 
      template_name, 
      record_id, 
      record_type = 'work_order',
      test_mode = false,
      test_recipient,
      custom_data = {}
    } = await req.json();

    // Validate required fields
    if (!template_name) {
      throw new Error('template_name is required');
    }

    // Determine recipient based on test mode
    let recipient: string;
    if (test_mode) {
      recipient = test_recipient || 'test@example.com';
      console.log('⚠️  Test mode enabled. Sending to test recipient:', recipient);
    } else {
      // Fetch recipient email from the database based on record type
      let email: string | null = null;

      if (record_type === 'user') {
        const { data: user } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', record_id)
          .single();
        email = user?.email;
      } else if (record_type === 'auth_user') {
        // Handle auth_user record type - lookup by user_id instead of id
        const { data: user } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', record_id)
          .single();
        email = user?.email;
      } else if (record_type === 'work_order') {
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('created_by')
          .eq('id', record_id)
          .single();

        if (workOrder?.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', workOrder.created_by)
            .single();
          email = profile?.email;
        }
      } else if (record_type === 'work_order_assignment') {
        // For assignment emails, get organization email from assigned_organization_id
        const assignedOrgId = custom_data.assigned_organization_id;
        if (assignedOrgId) {
          const { data: organization } = await supabase
            .from('organizations')
            .select('contact_email')
            .eq('id', assignedOrgId)
            .single();
          email = organization?.contact_email;
        }
      } else if (record_type === 'work_order_report') {
        // Fixed: use work_order_reports table instead of 'reports'
        const { data: report } = await supabase
          .from('work_order_reports')
          .select('subcontractor_user_id')
          .eq('id', record_id)
          .single();

        if (report?.subcontractor_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', report.subcontractor_user_id)
            .single();
          email = profile?.email;
        }
      } else if (record_type === 'invoice') {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('subcontractor_id')
          .eq('id', record_id)
          .single();

        if (invoice?.subcontractor_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', invoice.subcontractor_id)
            .single();
          email = profile?.email;
        }
      } else if (record_type === 'password_reset' || record_type === 'auth_confirmation') {
        // For auth emails, email is provided in custom_data
        email = custom_data.email;
      }

      if (!email) {
        throw new Error(`Recipient email not found for record_id: ${record_id} and record_type: ${record_type}`);
      }
      recipient = email;
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', template_name)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error(`Template not found: ${template_name}. Error: ${templateError?.message}`);
    }

    // Fetch additional data based on template requirements
    let variables: { [key: string]: any } = {};

    if (template_name === 'work_order_assigned' || template_name === 'work_order_created' || template_name === 'work_order_completed') {
      if (record_type === 'work_order_assignment') {
        // For assignment emails, fetch comprehensive data including assignee and work order details
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select(`
            *,
            organizations!inner(name),
            trades!inner(name),
            partner_locations(location_name)
          `)
          .eq('id', record_id)
          .single();

        if (workOrder) {
          // Get assignee information from custom_data
          const assignedToId = custom_data.assigned_to;
          let assigneeData = {};
          
          if (assignedToId) {
            const { data: assignee } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', assignedToId)
              .single();
            
            if (assignee) {
              assigneeData = {
                first_name: assignee.first_name,
                last_name: assignee.last_name,
                assignee_name: `${assignee.first_name} ${assignee.last_name}`,
                assignee_email: assignee.email
              };
            }
          }

          const workOrderUrl = generateUrl(`/subcontractor/work-orders/${workOrder.id}`);
          variables = { 
            ...workOrder, 
            ...assigneeData,
            workOrderUrl,
            work_order_number: workOrder.work_order_number || 'N/A',
            organization_name: workOrder.organizations?.name || 'N/A',
            trade_name: workOrder.trades?.name || 'N/A',
            location_name: workOrder.partner_locations?.location_name || workOrder.store_location || 'N/A',
            description: workOrder.description || 'No description provided'
          };
        }
      } else {
        // Regular work order emails
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('*')
          .eq('id', record_id)
          .single();

        if (workOrder) {
          const workOrderUrl = generateUrl(`/work-orders/${workOrder.id}`);
          variables = { 
            ...workOrder, 
            workOrderUrl,
            work_order_number: workOrder.work_order_number || 'N/A'
          };
        }
      }
    } else if (template_name === 'report_submitted' || template_name === 'report_reviewed') {
      const { data: report } = await supabase
        .from('work_order_reports')
        .select('*, work_orders!inner(work_order_number)')
        .eq('id', record_id)
        .single();

      if (report) {
        const reportUrl = generateUrl(`/admin/reports/${report.id}`);
        variables = { 
          ...report, 
          reportUrl,
          work_order_number: report.work_orders?.work_order_number || 'N/A'
        };
      }
    } else if (template_name === 'auth_confirmation' || template_name === 'password_reset') {
      // Auth emails use custom_data
      variables = {
        first_name: custom_data.first_name || 'User',
        email: custom_data.email || recipient,
        confirmation_link: custom_data.confirmation_link || '',
        reset_link: custom_data.reset_link || ''
      };
    } else if (template_name.includes('invoice')) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('*, organizations!inner(name)')
        .eq('id', record_id)
        .single();

      if (invoice) {
        const dashboard_url = generateUrl(`/admin/invoices/${invoice.id}`);
        variables = { 
          ...invoice, 
          dashboard_url,
          organizationName: invoice.organizations?.name || 'N/A'
        };
      }
    }

    // Merge variables with branding
    const allVariables = {
      ...variables,
      ...BRANDING_VARIABLES,
      ...custom_data, // Custom data can override defaults
      current_time: new Date().toISOString() // For test emails
    };

    // Process template with variables
    let processedHtml = template.html_content;
    let processedSubject = template.subject;

    // Replace variables in content and subject
    Object.entries(allVariables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement = value?.toString() || '';
      processedHtml = processedHtml.replaceAll(placeholder, replacement);
      processedSubject = processedSubject.replaceAll(placeholder, replacement);
    });

    // Get the correct "from" email based on environment
    const fromDomain = Deno.env.get('EMAIL_FROM_DOMAIN') || 'workorderportal.com';
    const fromEmail = `noreply@${fromDomain}`;
    const fromName = BRANDING_VARIABLES.company_name;

    // Send email via Resend
    console.log(`📤 Sending email from ${fromEmail} to: ${recipient}`);
    
    const emailData = {
      from: `${fromName} <${fromEmail}>`,
      to: [recipient],
      subject: processedSubject,
      html: processedHtml,
    };

    // Check if Resend API key is configured
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured in Edge Function environment variables');
    }

    const resendResponse = await resend.emails.send(emailData);

    // Log email event with correct column names
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        template_used: template_name,  // Changed from template_name
        recipient_email: recipient,     // Changed from recipient
        work_order_id: record_type === 'work_order' || record_type === 'work_order_assignment' ? record_id : null,
        status: resendResponse.error ? 'failed' : 'sent',
        error_message: resendResponse.error?.message,
        record_id: record_id,
        record_type: record_type,
        test_mode: test_mode
      });

    if (logError) {
      console.error('Failed to log email event:', logError);
    }

    if (resendResponse.error) {
      throw new Error(`Resend error: ${resendResponse.error.message}`);
    }

    console.log('✅ Email sent successfully');
    
    return createCorsResponse({
      success: true,
      message: 'Email sent successfully',
      recipient,
      template_name,
      email_id: resendResponse.data?.id
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    return createCorsResponse({
      success: false,
      error: error.message
    }, 500);
  }
});