
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

    console.log('Processing email request:', { template_name, record_id, record_type });

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

      // Get status and notes from the report
      const status = report.status;
      const reviewNotes = report.admin_notes || '';

      // Replace variables
      let subject = template.subject
        .replace(/{{work_order_number}}/g, report.work_orders?.work_order_number || '')
        .replace(/{{status}}/g, status);

      let html = template.html_content
        .replace(/{{first_name}}/g, report.profiles?.first_name || '')
        .replace(/{{work_order_number}}/g, report.work_orders?.work_order_number || '')
        .replace(/{{work_order_title}}/g, report.work_orders?.title || '')
        .replace(/{{organization_name}}/g, report.work_orders?.organizations?.name || '')
        .replace(/{{status}}/g, status)
        .replace(/{{review_notes}}/g, reviewNotes);

      const emailResult = await sendEmail({
        to: [report.profiles.email],
        subject: subject,
        html: html
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

      let subject = template.subject.replace(/{{work_order_number}}/g, workOrder.work_order_number);
      let html = template.html_content
        .replace(/{{work_order_number}}/g, workOrder.work_order_number)
        .replace(/{{first_name}}/g, workOrder.profiles.first_name || '');

      const emailResult = await sendEmail({
        to: [workOrder.profiles.email],
        subject: subject,
        html: html
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

      let subject = template.subject.replace(/{{work_order_number}}/g, report.work_orders?.work_order_number || '');
      let html = template.html_content.replace(/{{work_order_number}}/g, report.work_orders?.work_order_number || '');

      const emailResult = await sendEmail({
        to: admins.map(a => a.email),
        subject: subject,
        html: html
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

      let subject = template.subject.replace(/{{work_order_number}}/g, workOrder.work_order_number);
      let html = template.html_content
        .replace(/{{work_order_number}}/g, workOrder.work_order_number)
        .replace(/{{organization_name}}/g, workOrder.organizations?.name || '');

      // Send to partner who created it
      const emailResult = await sendEmail({
        to: [workOrder.profiles.email],
        subject: subject,
        html: html
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

      let html = template.html_content
        .replace(/{{first_name}}/g, profile.first_name || '')
        .replace(/{{user_type}}/g, profile.user_type || '');

      const emailResult = await sendEmail({
        to: [profile.email],
        subject: template.subject,
        html: html
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
