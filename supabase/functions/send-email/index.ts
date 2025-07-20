
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, createCorsResponse, createCorsErrorResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/resend-service.ts";

// Create Supabase client with service role
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface SendEmailRequest {
  template_name: string;
  record_id: string;
  record_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Configuration: Set RESEND_API_KEY in Supabase Dashboard > Edge Functions > Secrets
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500 });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return createCorsErrorResponse('Method not allowed', 405);
    }

    const { template_name, record_id, record_type }: SendEmailRequest = await req.json();

    // Validate required parameters
    if (!template_name || !record_id || !record_type) {
      return createCorsErrorResponse('Missing required parameters: template_name, record_id, record_type', 400);
    }

    // Only handle work_order_created for now
    if (template_name !== 'work_order_created') {
      return createCorsErrorResponse(`Template '${template_name}' not supported yet. Only 'work_order_created' is currently supported.`, 400);
    }

    console.log('Processing email request:', { template_name, record_id, record_type });

    // Fetch work order with organization data
    const { data: workOrder, error: workOrderError } = await supabase
      .from('work_orders')
      .select(`
        *,
        organizations!inner(name),
        trades(name)
      `)
      .eq('id', record_id)
      .single();

    if (workOrderError || !workOrder) {
      console.error('Work order fetch error:', workOrderError);
      return createCorsErrorResponse('Work order not found', 404);
    }

    console.log('Found work order:', workOrder.work_order_number);

    // Get admin email addresses
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_type', 'admin')
      .eq('is_active', true);

    if (adminError || !adminProfiles || adminProfiles.length === 0) {
      console.error('Admin profiles fetch error:', adminError);
      return createCorsErrorResponse('No admin recipients found', 500);
    }

    const adminEmails = adminProfiles.map(profile => profile.email);
    console.log('Found admin recipients:', adminEmails.length);

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', template_name)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Template fetch error:', templateError);
      return createCorsErrorResponse('Email template not found', 500);
    }

    console.log('Found email template:', template.template_name);

    // Prepare template variables
    const variables = {
      work_order_number: workOrder.work_order_number || 'N/A',
      organization_name: workOrder.organizations?.name || 'Unknown Organization'
    };

    console.log('Template variables:', variables);

    // Replace variables in subject and HTML content
    let processedSubject = template.subject;
    let processedHtml = template.html_content;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
      processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
    });

    console.log('Processed email subject:', processedSubject);

    // Send email using Resend service
    const emailResult = await sendEmail({
      to: adminEmails,
      subject: processedSubject,
      html: processedHtml
    });

    // Log email attempt to database
    const logPromises = adminEmails.map(email => 
      supabase.from('email_logs').insert({
        work_order_id: record_id,
        template_used: template_name,
        recipient_email: email,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.success ? null : emailResult.error
      })
    );

    await Promise.all(logPromises);
    console.log('Email logs created for', adminEmails.length, 'recipients');

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
    }

    console.log('Email sent successfully to', adminEmails.length, 'recipients');

    return createCorsResponse({
      success: true,
      message: 'Email sent successfully',
      recipients: adminEmails.length,
      email_id: emailResult.id
    });

  } catch (error) {
    console.error('Send email function error:', error);
    return createCorsErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
});
