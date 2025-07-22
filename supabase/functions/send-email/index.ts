
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Resend client
const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
const resend = new Resend(resendApiKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced branding variables for consistent email branding
const BRANDING_VARIABLES = {
  logo_url: 'https://inudoymofztrvxhrlrek.supabase.co/storage/v1/object/public/work-order-attachments/branding/AKC_logo_fixed_header.png',
  company_name: 'AKC Contracting',
  support_email: 'support@akcllc.com',
  powered_by: 'Powered by WorkOrderPortal'
};

// Utility function to generate URLs
const generateUrl = (path: string) => {
  const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://workorderportal.com';
  return `${baseUrl}${path}`;
};

// Handle CORS preflight requests
function createCorsResponse(body: any, statusCode: number = 200) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  console.log('📧 Processing email request:', await req.clone().json());
  
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
      } else if (record_type === 'work_order') {
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('submitted_by')
          .eq('id', record_id)
          .single();

        if (workOrder?.submitted_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', workOrder.submitted_by)
            .single();
          email = profile?.email;
        }
      } else if (record_type === 'report') {
        // Fetch the report and then the associated user's email
        const { data: report } = await supabase
          .from('reports')
          .select('submitted_by')
          .eq('id', record_id)
          .single();

        if (report?.submitted_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', report.submitted_by)
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
      } else if (record_type === 'password_reset') {
        // For password reset, email is provided in custom_data
        email = custom_data.email;
      }

      if (!email) {
        throw new Error(`Recipient email not found for record_id: ${record_id} and record_type: ${record_type}`);
      }
      recipient = email;
    }

    // Get email template
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', template_name)
      .eq('is_active', true)
      .single();

    if (!template) {
      throw new Error(`Template not found: ${template_name}`);
    }

    // Fetch additional data based on template requirements
    let variables: { [key: string]: any } = {};

    if (template_name === 'work_order_assigned') {
      const { data: workOrder } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', record_id)
        .single();

      if (workOrder) {
        const workOrderUrl = generateUrl(`/work-orders/${workOrder.id}`);
        variables = { ...workOrder, workOrderUrl };
      }
    } else if (template_name === 'report_submitted') {
      const { data: report } = await supabase
        .from('reports')
        .select('*')
        .eq('id', record_id)
        .single();

      if (report) {
        const reviewUrl = generateUrl(`/admin/reports/${report.id}`);
        variables = { ...report, reviewUrl };
      }
    } else if (template_name === 'report_reviewed') {
      const { data: report } = await supabase
        .from('reports')
        .select('*')
        .eq('id', record_id)
        .single();

      if (report) {
        const reportUrl = generateUrl(`/admin/reports/${report.id}`);
          variables = { ...report, reportUrl };
      }
    } else if (template_name === 'auth_confirmation' || template_name === 'password_reset') {
      const customData = custom_data || {};
        variables = {
          ...variables,
          first_name: customData.first_name || 'User',
          email: customData.email || '',
          confirmation_link: customData.confirmation_link || '',
          reset_link: customData.reset_link || ''
        };
    } else if (template_name === 'invoice_submitted' || template_name === 'invoice_approved' || template_name === 'invoice_rejected' || template_name === 'invoice_paid') {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', record_id)
          .single();

        if (invoice) {
          const dashboard_url = generateUrl(`/admin/invoices/${invoice.id}`);
          variables = { ...invoice, dashboard_url };
        }
    }

    // Merge variables with branding
    const allVariables = {
      ...variables,
      ...BRANDING_VARIABLES,
      ...custom_data // Custom data can override defaults
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

    // Send email via Resend
    console.log('📤 Sending email to:', recipient);
    
    const emailData = {
      from: `${BRANDING_VARIABLES.company_name} <noreply@akcllc.com>`,
      to: [recipient],
      subject: processedSubject,
      html: processedHtml,
    };

    const resendResponse = await resend.emails.send(emailData);

    // Log email event
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        template_name: template_name,
        recipient: recipient,
        record_id: record_id,
        record_type: record_type,
        subject: processedSubject,
        status: resendResponse.error ? 'failed' : 'sent',
        resend_id: resendResponse.data?.id,
        error_message: resendResponse.error?.message,
        test_mode: test_mode,
      });

    if (logError) {
      console.error('Failed to log email event:', logError);
    }

    if (resendResponse.error) {
      throw new Error(`Resend error: ${resendResponse.error.message}`);
    }

    return createCorsResponse({
      success: true,
      message: 'Email sent successfully',
      resendId: resendResponse.data?.id,
    });

  } catch (error) {
    console.error('Email sending failed:', error);
    return createCorsResponse({ success: false, error: error.message }, 500);
  }
});
