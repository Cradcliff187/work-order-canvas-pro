
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
  test_mode?: boolean;
  test_recipient?: string;
  custom_data?: Record<string, any>;
}

// Helper function for variable replacement
function replaceTemplateVariables(content: string, variables: Record<string, any>): string {
  let processedContent = content;
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value || ''));
  });
  return processedContent;
}

// Enhanced helper function to merge custom_data with database data
function mergeTemplateVariables(databaseData: Record<string, any> = {}, customData: Record<string, any> = {}): Record<string, any> {
  // Custom data takes priority over database data
  const merged = { ...databaseData, ...customData };
  
  // Ensure all values are properly converted to strings for template replacement
  const processed: Record<string, any> = {};
  Object.entries(merged).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      processed[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    } else {
      processed[key] = '';
    }
  });
  
  return processed;
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

    const { template_name, record_id, record_type, test_mode, test_recipient, custom_data }: SendEmailRequest = await req.json();

    // Validate required parameters
    if (!template_name || !record_id || !record_type) {
      return createCorsErrorResponse('Missing required parameters: template_name, record_id, record_type', 400);
    }

    console.log('Processing email request:', { template_name, record_id, record_type, test_mode });

    // Handle test mode
    if (test_mode && test_recipient) {
      // Create mock data for testing
      const mockData = {
        work_order_number: 'TEST-001',
        organization_name: 'Test Organization',
        first_name: 'Test',
        last_name: 'User',
        status: 'approved',
        title: 'Test Work Order',
        review_notes: 'This is a test email'
      };
      
      // Get template
      const { data: template } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_name', template_name)
        .single();
        
      if (!template) {
        return createCorsErrorResponse('Template not found', 404);
      }
      
      // Merge mock data with custom_data
      const variables = mergeTemplateVariables(mockData, custom_data);
      
      // Replace all variables
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);
      
      // Send test email
      const emailResult = await sendEmail({
        to: [test_recipient],
        subject: `[TEST] ${processedSubject}`,
        html: processedHtml
      });
      
      // Log as test
      await supabase.from('email_logs').insert({
        template_used: template_name,
        recipient_email: test_recipient,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.error || null
      });
      
      return createCorsResponse({
        success: emailResult.success,
        message: 'Test email sent',
        test: true
      });
    }

    // Handle auth_confirmation emails
    if (template_name === 'auth_confirmation') {
      if (!custom_data) {
        return createCorsErrorResponse('custom_data is required for auth_confirmation template', 400);
      }

      const { email, first_name, confirmation_link } = custom_data;

      if (!email || !confirmation_link) {
        return createCorsErrorResponse('email and confirmation_link are required in custom_data', 400);
      }

      console.log('Processing auth confirmation for:', email);

      // Fetch email template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', 'auth_confirmation')
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error('Auth confirmation template fetch error:', templateError);
        return createCorsErrorResponse('Email template not found', 500);
      }

      // Prepare template variables using enhanced merging
      const databaseData = {};
      const variables = mergeTemplateVariables(databaseData, custom_data);

      // Replace variables in subject and HTML content
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      console.log('Processed auth confirmation email subject:', processedSubject);

      // Send email using Resend service
      const emailResult = await sendEmail({
        to: [email],
        subject: processedSubject,
        html: processedHtml
      });

      // Log email attempt to database
      await supabase.from('email_logs').insert({
        template_used: template_name,
        recipient_email: email,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.success ? null : emailResult.error
      });

      if (!emailResult.success) {
        console.error('Auth confirmation email sending failed:', emailResult.error);
        return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
      }

      console.log('Auth confirmation email sent successfully to:', email);

      return createCorsResponse({
        success: true,
        message: 'Auth confirmation email sent successfully',
        email_id: emailResult.id
      });
    }

    // Handle password_reset emails
    if (template_name === 'password_reset') {
      if (!custom_data) {
        return createCorsErrorResponse('custom_data is required for password_reset template', 400);
      }

      const { email, first_name, reset_link } = custom_data;

      if (!email || !reset_link) {
        return createCorsErrorResponse('email and reset_link are required in custom_data', 400);
      }

      console.log('Processing password reset for:', email);

      // Fetch email template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', 'password_reset')
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error('Password reset template fetch error:', templateError);
        return createCorsErrorResponse('Email template not found', 500);
      }

      // Prepare template variables using enhanced merging
      const databaseData = {};
      const variables = mergeTemplateVariables(databaseData, custom_data);

      // Replace variables in subject and HTML content
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      console.log('Processed password reset email subject:', processedSubject);

      // Send email using Resend service
      const emailResult = await sendEmail({
        to: [email],
        subject: processedSubject,
        html: processedHtml
      });

      // Log email attempt to database
      await supabase.from('email_logs').insert({
        template_used: template_name,
        recipient_email: email,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.success ? null : emailResult.error
      });

      if (!emailResult.success) {
        console.error('Password reset email sending failed:', emailResult.error);
        return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
      }

      console.log('Password reset email sent successfully to:', email);

      return createCorsResponse({
        success: true,
        message: 'Password reset email sent successfully',
        email_id: emailResult.id
      });
    }

    // Handle work_order_created emails
    if (template_name === 'work_order_created') {
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

      // Prepare template variables using enhanced merging
      const databaseData = {
        work_order_number: workOrder.work_order_number || 'N/A',
        organization_name: workOrder.organizations?.name || 'Unknown Organization'
      };
      const variables = mergeTemplateVariables(databaseData, custom_data);

      console.log('Template variables:', variables);

      // Replace variables in subject and HTML content
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

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
    }

    // Handle report_reviewed emails  
    if (template_name === 'report_reviewed') {
      // This is a work_order_report, not a work_order
      const { data: report } = await supabase
        .from('work_order_reports')
        .select(`
          *,
          work_orders!work_order_id(work_order_number, title, organizations!organization_id(name)),
          profiles!subcontractor_user_id(email, first_name)
        `)
        .eq('id', record_id)
        .single();

      if (!report || !report.profiles?.email) {
        return createCorsErrorResponse('Report or recipient not found', 404);
      }

      const { data: template } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_name', 'report_reviewed')
        .single();

      if (!template) {
        return createCorsErrorResponse('Email template not found', 500);
      }

      // Prepare template variables using enhanced merging
      const databaseData = {
        first_name: report.profiles?.first_name || '',
        work_order_number: report.work_orders?.work_order_number || '',
        work_order_title: report.work_orders?.title || '',
        organization_name: report.work_orders?.organizations?.name || '',
        status: report.status,
        review_notes: report.admin_notes || ''
      };
      const variables = mergeTemplateVariables(databaseData, custom_data);

      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      const emailResult = await sendEmail({
        to: [report.profiles.email],
        subject: processedSubject,
        html: processedHtml
      });

      await supabase.from('email_logs').insert({
        work_order_id: report.work_order_id,
        template_used: 'report_reviewed',
        recipient_email: report.profiles.email,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.error || null
      });

      return createCorsResponse({
        success: emailResult.success,
        message: emailResult.success ? 'Email sent successfully' : emailResult.error
      });
    }

    // Handle work_order_assigned emails
    if (template_name === 'work_order_assigned') {
      const { data: workOrder } = await supabase
        .from('work_orders')
        .select('*, organizations!organization_id(name), profiles!assigned_to(email, first_name)')
        .eq('id', record_id)
        .single();

      if (!workOrder?.profiles?.email) {
        return new Response(JSON.stringify({ error: 'No assignee found' }), { status: 404 });
      }

      const { data: template } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_name', 'work_order_assigned')
        .single();

      // Prepare template variables using enhanced merging
      const databaseData = {
        work_order_number: workOrder.work_order_number,
        first_name: workOrder.profiles.first_name || ''
      };
      const variables = mergeTemplateVariables(databaseData, custom_data);

      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      const emailResult = await sendEmail({
        to: [workOrder.profiles.email],
        subject: processedSubject,
        html: processedHtml
      });

      await supabase.from('email_logs').insert({
        work_order_id: workOrder.id,
        template_used: 'work_order_assigned',
        recipient_email: workOrder.profiles.email,
        status: emailResult.success ? 'sent' : 'failed'
      });

      return new Response(JSON.stringify({ success: emailResult.success }), { status: 200, headers: corsHeaders });
    }

    // Handle report_submitted emails
    if (template_name === 'report_submitted') {
      const { data: report } = await supabase
        .from('work_order_reports')
        .select('*, work_orders!work_order_id(work_order_number)')
        .eq('id', record_id)
        .single();

      const { data: admins } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_type', 'admin')
        .eq('is_active', true);

      if (!admins?.length) return new Response(JSON.stringify({ error: 'No admins' }), { status: 404 });

      const { data: template } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_name', 'report_submitted')
        .single();

      // Prepare template variables using enhanced merging
      const databaseData = {
        work_order_number: report.work_orders?.work_order_number || ''
      };
      const variables = mergeTemplateVariables(databaseData, custom_data);

      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      const emailResult = await sendEmail({
        to: admins.map(a => a.email),
        subject: processedSubject,
        html: processedHtml
      });

      await supabase.from('email_logs').insert({
        work_order_id: report.work_order_id,
        template_used: 'report_submitted',
        recipient_email: admins.map(a => a.email).join(', '),
        status: emailResult.success ? 'sent' : 'failed'
      });

      return new Response(JSON.stringify({ success: emailResult.success }), { status: 200, headers: corsHeaders });
    }

    // Handle work_order_completed emails  
    if (template_name === 'work_order_completed') {
      const { data: workOrder } = await supabase
        .from('work_orders')
        .select('*, organizations!organization_id(name), profiles!created_by(email)')
        .eq('id', record_id)
        .single();

      const { data: template } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_name', 'work_order_completed')
        .single();

      // Prepare template variables using enhanced merging
      const databaseData = {
        work_order_number: workOrder.work_order_number,
        organization_name: workOrder.organizations?.name || ''
      };
      const variables = mergeTemplateVariables(databaseData, custom_data);

      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      // Send to partner who created it
      const emailResult = await sendEmail({
        to: [workOrder.profiles.email],
        subject: processedSubject,
        html: processedHtml
      });

      await supabase.from('email_logs').insert({
        work_order_id: workOrder.id,
        template_used: 'work_order_completed',
        recipient_email: workOrder.profiles.email,
        status: emailResult.success ? 'sent' : 'failed'
      });

      return new Response(JSON.stringify({ success: emailResult.success }), { status: 200, headers: corsHeaders });
    }

    // Handle welcome_email
    if (template_name === 'welcome_email') {
      // For welcome emails, record_id is the profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, user_type')
        .eq('id', record_id)
        .single();

      if (!profile?.email) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
      }

      const { data: template } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_name', 'welcome_email')
        .single();

      // Prepare template variables using enhanced merging
      const databaseData = {
        first_name: profile.first_name || '',
        user_type: profile.user_type || ''
      };
      const variables = mergeTemplateVariables(databaseData, custom_data);

      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      const emailResult = await sendEmail({
        to: [profile.email],
        subject: template.subject,
        html: processedHtml
      });

      await supabase.from('email_logs').insert({
        template_used: 'welcome_email',
        recipient_email: profile.email,
        status: emailResult.success ? 'sent' : 'failed'
      });

      return new Response(JSON.stringify({ success: emailResult.success }), { status: 200, headers: corsHeaders });
    }

    // For all other templates (not implemented yet)
    return createCorsErrorResponse(`Template ${template_name} not implemented yet`, 501);

  } catch (error) {
    console.error('Send email function error:', error);
    return createCorsErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
});
