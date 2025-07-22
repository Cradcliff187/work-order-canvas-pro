
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
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
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

    console.log(`📧 Processing email: ${template_name} for ${record_id}`);

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

    let recipient: string;
    let variables: { [key: string]: any } = {};

    // Handle work_order_created emails
    if (template_name === 'work_order_created') {
      console.log('📋 Processing work_order_created email for:', record_id);

      // Fetch work order with proper JOINs
      const { data: workOrder, error: workOrderError } = await supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name, contact_email),
          trades(name)
        `)
        .eq('id', record_id)
        .single();

      if (workOrderError || !workOrder) {
        console.error('❌ Work order fetch error:', workOrderError);
        throw new Error('Work order not found');
      }

      // Get admin email addresses for recipients
      const { data: adminProfiles, error: adminError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('user_type', 'admin')
        .eq('is_active', true);

      if (adminError || !adminProfiles || adminProfiles.length === 0) {
        console.error('❌ Admin profiles fetch error:', adminError);
        throw new Error('No admin recipients found');
      }

      // Set recipient (first admin for single email, or test recipient)
      recipient = test_mode && test_recipient ? test_recipient : adminProfiles[0].email;

      // Prepare template variables with proper data mapping
      const workOrderUrl = generateUrl(`/admin/work-orders/${workOrder.id}`);
      variables = {
        work_order_number: workOrder.work_order_number || 'Unknown',
        organization_name: workOrder.organizations?.name || 'Unknown Organization',
        store_location: workOrder.store_location || 'Unknown Location',
        trade_name: workOrder.trades?.name || 'General Maintenance',
        description: workOrder.description || 'No description provided',
        submitted_date: new Date(workOrder.date_submitted).toLocaleDateString(),
        admin_dashboard_url: workOrderUrl,
        ...custom_data
      };

      console.log('📧 Work order variables prepared:', variables);

    } else if (template_name === 'password_reset') {
      // Handle password reset emails
      console.log('🔑 Processing password_reset email');
      
      recipient = test_mode && test_recipient ? test_recipient : custom_data.email;
      
      if (!recipient) {
        throw new Error('No recipient email provided for password reset');
      }

      variables = {
        first_name: custom_data.first_name || 'User',
        email: custom_data.email || '',
        reset_link: custom_data.reset_link || ''
      };

      console.log('🔑 Password reset variables prepared for:', recipient);

    } else {
      // Handle other email types as before
      if (record_type === 'user') {
        const { data: user } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', record_id)
          .single();
        recipient = user?.email || '';
      } else {
        throw new Error(`Unsupported template: ${template_name}`);
      }
    }

    if (!recipient) {
      throw new Error('No recipient email found');
    }

    // Merge variables with branding
    const allVariables = {
      ...variables,
      ...BRANDING_VARIABLES,
      ...custom_data
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

    // Log email event with correct schema
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        template_used: template_name,
        recipient_email: recipient,
        work_order_id: record_type === 'work_order' ? record_id : null,
        status: resendResponse.error ? 'failed' : 'sent',
        error_message: resendResponse.error?.message || null,
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Failed to log email event:', logError);
    }

    if (resendResponse.error) {
      throw new Error(`Resend error: ${resendResponse.error.message}`);
    }

    console.log('✅ Email sent successfully, ID:', resendResponse.data?.id);

    return createCorsResponse({
      success: true,
      message: 'Email sent successfully',
      resendId: resendResponse.data?.id,
    });

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return createCorsResponse({ success: false, error: error.message }, 500);
  }
});
