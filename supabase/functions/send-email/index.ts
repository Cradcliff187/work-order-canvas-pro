import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, createCorsResponse, createCorsErrorResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/resend-service.ts";

// Branding constants - hardcoded as we cannot import from src/
const BRANDING_VARIABLES = {
  company_name: "AKC Contracting",
  logo_url: "https://workorderportal.com/branding/logos/akc-logo-horizontal.png",
  support_email: "support@akcllc.com",
  powered_by: "Powered by WorkOrderPortal"
};

// Helper function to add branding variables to any data object
function addBrandingVariables(data: Record<string, any>): Record<string, any> {
  return {
    ...data,
    ...BRANDING_VARIABLES
  };
}

// Rate limiting helper
let lastEmailTime = 0;
const RATE_LIMIT_DELAY = 500; // 500ms = 0.5s to respect 2 requests/second limit with buffer

async function rateLimitedSend(emailData: any): Promise<any> {
  const now = Date.now();
  const timeSinceLastEmail = now - lastEmailTime;
  
  if (timeSinceLastEmail < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastEmail;
    console.log(`🚥 Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastEmailTime = Date.now();
  return await sendEmail(emailData);
}

// URL generation helper
function generateUrls(workOrderId: string, reportId?: string) {
  const baseUrl = 'https://inudoymofztrvxhrlrek.supabase.co'; // Fixed: Use Supabase app URL for functional links
  return {
    work_order_url: `${baseUrl}/work-orders/${workOrderId}`,
    admin_dashboard_url: `${baseUrl}/admin/dashboard`,
    review_url: reportId ? `${baseUrl}/admin/reports/${reportId}` : `${baseUrl}/admin/work-orders/${workOrderId}`,
    report_url: reportId ? `${baseUrl}/reports/${reportId}` : `${baseUrl}/work-orders/${workOrderId}/reports`
  };
}

// Date formatting helper
function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

// Address formatting helper
function formatAddress(workOrder: any): string {
  const parts = [
    workOrder.street_address,
    workOrder.city,
    workOrder.state,
    workOrder.zip_code
  ].filter(Boolean);
  return parts.join(', ');
}

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

// Enhanced helper function to merge custom_data with database data and add branding
function mergeTemplateVariables(databaseData: Record<string, any> = {}, customData: Record<string, any> = {}): Record<string, any> {
  // Add branding variables first, then database data, then custom data (priority order)
  const merged = { ...BRANDING_VARIABLES, ...databaseData, ...customData };
  
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

// Helper function to get or create essential data
async function ensureEssentialDataExists(): Promise<{adminUserId: string, testOrgId: string, testTradeId: string}> {
  console.log('🔧 Ensuring essential data exists...');
  
  // Get any admin user
  const { data: adminUsers, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_type', 'admin')
    .eq('is_active', true)
    .limit(1);

  if (adminError || !adminUsers || adminUsers.length === 0) {
    throw new Error('No admin users found - essential data creation failed');
  }

  const adminUserId = adminUsers[0].id;
  console.log('✅ Found admin user:', adminUserId);

  // Ensure test organization exists
  let testOrgId: string;
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('name', 'Test Organization')
    .single();

  if (existingOrg) {
    testOrgId = existingOrg.id;
    console.log('✅ Found existing test organization:', testOrgId);
  } else {
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Organization',
        contact_email: 'test@workorderportal.com',
        organization_type: 'partner'
      })
      .select('id')
      .single();

    if (orgError) throw orgError;
    testOrgId = newOrg.id;
    console.log('✅ Created test organization:', testOrgId);
  }

  // Ensure test trade exists
  let testTradeId: string;
  const { data: existingTrade } = await supabase
    .from('trades')
    .select('id')
    .eq('name', 'Test Trade')
    .single();

  if (existingTrade) {
    testTradeId = existingTrade.id;
    console.log('✅ Found existing test trade:', testTradeId);
  } else {
    const { data: newTrade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        name: 'Test Trade',
        description: 'Test trade for email testing'
      })
      .select('id')
      .single();

    if (tradeError) throw tradeError;
    testTradeId = newTrade.id;
    console.log('✅ Created test trade:', testTradeId);
  }

  return { adminUserId, testOrgId, testTradeId };
}

// Enhanced helper function to create test data when needed
async function createTestDataForEmail(template_name: string, record_id: string): Promise<any> {
  console.log(`🧪 Creating test data for template: ${template_name}, record_id: ${record_id}`);
  
  try {
    const { adminUserId, testOrgId, testTradeId } = await ensureEssentialDataExists();

    if (template_name === 'work_order_created' && record_id.startsWith('TEST-WORK_ORDER_CREATED-')) {
      // Create a test work order with all required fields
      const testWorkOrder = {
        id: crypto.randomUUID(),
        work_order_number: record_id,
        title: 'Test Work Order Created',
        description: 'This is a test work order for email testing',
        organization_id: testOrgId,
        trade_id: testTradeId,
        status: 'received',
        created_by: adminUserId,
        date_submitted: new Date().toISOString(),
        store_location: 'Test Location',
        street_address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345',
        estimated_hours: 2.0
      };

      console.log('📝 Inserting test work order with data:', testWorkOrder);

      // Insert the test work order
      const { data: insertedWorkOrder, error } = await supabase
        .from('work_orders')
        .insert(testWorkOrder)
        .select(`
          *,
          organizations!organization_id(name),
          trades(name)
        `)
        .single();

      if (error) {
        console.error('❌ Failed to create test work order:', error);
        throw error;
      }

      console.log('✅ Created test work order:', insertedWorkOrder.id);
      return insertedWorkOrder;
    }

    if (template_name === 'work_order_assigned' && record_id.startsWith('TEST-WORK_ORDER_ASSIGNED-')) {
      // First create a work order, then assign it
      const workOrderId = crypto.randomUUID();
      const testWorkOrder = {
        id: workOrderId,
        work_order_number: record_id,
        title: 'Test Work Order Assignment',
        description: 'This is a test work order for assignment email testing',
        organization_id: testOrgId,
        trade_id: testTradeId,
        status: 'assigned',
        created_by: adminUserId,
        assigned_to: adminUserId, // Assign to admin for testing
        date_submitted: new Date().toISOString(),
        date_assigned: new Date().toISOString(),
        store_location: 'Test Location',
        street_address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345',
        estimated_hours: 2.0
      };

      const { data: insertedWorkOrder, error } = await supabase
        .from('work_orders')
        .insert(testWorkOrder)
        .select(`
          *,
          organizations!organization_id(name),
          profiles!assigned_to(email, first_name)
        `)
        .single();

      if (error) {
        console.error('❌ Failed to create assigned test work order:', error);
        throw error;
      }

      console.log('✅ Created assigned test work order:', insertedWorkOrder.id);
      return insertedWorkOrder;
    }

    if (template_name === 'report_submitted' && record_id.startsWith('TEST-REPORT_SUBMITTED-')) {
      // First create a work order, then create a report for it
      const workOrderId = crypto.randomUUID();
      const reportId = crypto.randomUUID();

      // Create work order first
      const testWorkOrder = {
        id: workOrderId,
        work_order_number: 'TEST-WO-FOR-REPORT-001',
        title: 'Test Work Order for Report',
        description: 'Work order created for report testing',
        organization_id: testOrgId,
        trade_id: testTradeId,
        status: 'in_progress',
        created_by: adminUserId,
        assigned_to: adminUserId,
        date_submitted: new Date().toISOString(),
        store_location: 'Test Location',
        street_address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345',
        estimated_hours: 2.0
      };

      const { error: woError } = await supabase
        .from('work_orders')
        .insert(testWorkOrder);

      if (woError) {
        console.error('❌ Failed to create work order for report:', woError);
        throw woError;
      }

      // Create the report
      const testReport = {
        id: reportId,
        work_order_id: workOrderId,
        subcontractor_user_id: adminUserId,
        work_performed: 'Test work performed for email testing',
        invoice_amount: 100.00,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      };

      const { data: insertedReport, error: reportError } = await supabase
        .from('work_order_reports')
        .insert(testReport)
        .select(`
          *,
          work_orders!work_order_id(work_order_number, organizations!organization_id(name))
        `)
        .single();

      if (reportError) {
        console.error('❌ Failed to create test report:', reportError);
        throw reportError;
      }

      console.log('✅ Created test work order report:', insertedReport.id);
      return insertedReport;
    }

    console.log('⚠️ No test data creation logic for template:', template_name);
    return null;

  } catch (error) {
    console.error('❌ Failed to create test data:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Configuration: Set RESEND_API_KEY in Supabase Dashboard > Edge Functions > Secrets
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return createCorsErrorResponse('Email service not configured', 500);
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

    console.log('📧 Processing email request:', { template_name, record_id, record_type, test_mode, test_recipient });

    // Handle test mode with custom recipient
    if (test_mode && test_recipient) {
      console.log('🧪 Test mode enabled with custom recipient:', test_recipient);
      
      // Create mock data for testing with branding variables
      const mockData = addBrandingVariables({
        work_order_number: 'TEST-001',
        organization_name: 'Test Organization',
        first_name: 'Test',
        last_name: 'User',
        status: 'approved',
        title: 'Test Work Order',
        review_notes: 'This is a test email'
      });
      
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_name', template_name)
        .eq('is_active', true)
        .single();
        
      if (templateError || !template) {
        console.error('❌ Template fetch error:', templateError);
        return createCorsErrorResponse('Template not found', 404);
      }
      
      // Merge mock data with custom_data and branding
      const variables = mergeTemplateVariables(mockData, custom_data);
      
      // Replace all variables
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);
      
      console.log('📤 Sending test email to:', test_recipient);
      
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
      
      if (!emailResult.success) {
        console.error('❌ Test email failed:', emailResult.error);
        return createCorsErrorResponse(`Test email failed: ${emailResult.error}`, 500);
      }
      
      console.log('✅ Test email sent successfully');
      return createCorsResponse({
        success: emailResult.success,
        message: 'Test email sent',
        recipients: 1,
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

      console.log('🔐 Processing auth confirmation for:', email);

      // Fetch email template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', 'auth_confirmation')
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error('❌ Auth confirmation template fetch error:', templateError);
        return createCorsErrorResponse('Email template not found', 500);
      }

      // Prepare template variables with branding
      const databaseData = {};
      const variables = mergeTemplateVariables(databaseData, custom_data);

      // Replace variables in subject and HTML content
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      console.log('📧 Processed auth confirmation email subject:', processedSubject);

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
        console.error('❌ Auth confirmation email sending failed:', emailResult.error);
        return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
      }

      console.log('✅ Auth confirmation email sent successfully to:', email);

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

      console.log('🔑 Processing password reset for:', email);

      // Fetch email template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', 'password_reset')
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error('❌ Password reset template fetch error:', templateError);
        return createCorsErrorResponse('Email template not found', 500);
      }

      // Prepare template variables with branding
      const databaseData = {};
      const variables = mergeTemplateVariables(databaseData, custom_data);

      // Replace variables in subject and HTML content
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      console.log('📧 Processed password reset email subject:', processedSubject);

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
        console.error('❌ Password reset email sending failed:', emailResult.error);
        return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
      }

      console.log('✅ Password reset email sent successfully to:', email);

      return createCorsResponse({
        success: true,
        message: 'Password reset email sent successfully',
        email_id: emailResult.id
      });
    }

    // Handle work_order_created emails
    if (template_name === 'work_order_created') {
      console.log('📋 Processing work_order_created email for:', record_id);

      // Fetch work order with comprehensive JOINs
      const { data: workOrderData, error: workOrderError } = await supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name, contact_email, contact_phone),
          trades(name),
          profiles!created_by(first_name, last_name, email)
        `)
        .eq('id', record_id)
        .single();

      if (workOrderError || !workOrderData) {
        console.error('❌ Work order fetch error:', workOrderError);
        return createCorsErrorResponse('Work order not found', 404);
      }

      const workOrder = workOrderData;
      console.log('📋 Found work order:', workOrder.work_order_number);

      // Get admin email addresses
      const { data: adminProfiles, error: adminError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('user_type', 'admin')
        .eq('is_active', true);

      if (adminError || !adminProfiles || adminProfiles.length === 0) {
        console.error('❌ Admin profiles fetch error:', adminError);
        return createCorsErrorResponse('No admin recipients found', 500);
      }

      const adminEmails = adminProfiles.map(profile => profile.email);
      console.log('👥 Found admin recipients:', adminEmails.length);

      // Fetch email template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', template_name)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error('❌ Template fetch error:', templateError);
        return createCorsErrorResponse('Email template not found', 500);
      }

      // Generate URLs
      const urls = generateUrls(workOrder.id);

      // Prepare comprehensive template variables with branding
      const databaseData = {
        // Work Order Details
        work_order_number: workOrder.work_order_number || 'N/A',
        work_order_title: workOrder.title || 'Work Order',
        title: workOrder.title || 'Work Order',
        description: workOrder.description || 'No description provided',
        
        // Organization Details
        organization_name: workOrder.organizations?.name || 'Unknown Organization',
        organization_email: workOrder.organizations?.contact_email || '',
        organization_phone: workOrder.organizations?.contact_phone || '',
        
        // Location Details
        store_location: workOrder.store_location || workOrder.location_name || '',
        street_address: workOrder.street_address || workOrder.location_street_address || '',
        city: workOrder.city || workOrder.location_city || '',
        state: workOrder.state || workOrder.location_state || '',
        zip_code: workOrder.zip_code || workOrder.location_zip_code || '',
        location_address: formatAddress(workOrder),
        
        // Trade Details
        trade_name: workOrder.trades?.name || 'General',
        
        // Dates
        date_submitted: formatDate(workOrder.date_submitted),
        submitted_date: formatDate(workOrder.date_submitted),
        estimated_completion_date: formatDate(workOrder.estimated_completion_date),
        due_date: formatDate(workOrder.due_date),
        
        // URLs
        work_order_url: urls.work_order_url,
        admin_dashboard_url: urls.admin_dashboard_url,
        
        // System Details
        current_date: formatDate(new Date().toISOString()),
        system_url: 'https://workorderportal.com'
      };

      const variables = mergeTemplateVariables(databaseData, custom_data);
      console.log('🔧 Template variables count:', Object.keys(variables).length);

      // Replace variables in subject and HTML content
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      console.log('📧 Processed email subject:', processedSubject);

      // Send email with rate limiting
      const emailResult = await rateLimitedSend({
        to: adminEmails,
        subject: processedSubject,
        html: processedHtml
      });

      // Log email attempt to database
      const logPromises = adminEmails.map(email => 
        supabase.from('email_logs').insert({
          work_order_id: workOrder.id,
          template_used: template_name,
          recipient_email: email,
          status: emailResult.success ? 'sent' : 'failed',
          error_message: emailResult.success ? null : emailResult.error
        })
      );

      await Promise.all(logPromises);
      console.log('📝 Email logs created for', adminEmails.length, 'recipients');

      if (!emailResult.success) {
        console.error('❌ Email sending failed:', emailResult.error);
        return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
      }

      console.log('✅ Email sent successfully to', adminEmails.length, 'recipients');

      return createCorsResponse({
        success: true,
        message: 'Work order created email sent successfully',
        recipients: adminEmails.length,
        email_id: emailResult.id
      });
    }

    // Handle work_order_assigned emails
    if (template_name === 'work_order_assigned') {
      console.log('👤 Processing work_order_assigned email for:', record_id);

      // Fetch work order with comprehensive JOINs
      const { data: workOrderData, error: workOrderError } = await supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name, contact_email, contact_phone),
          trades(name),
          profiles!assigned_to(email, first_name, last_name, company_name)
        `)
        .eq('id', record_id)
        .single();

      if (workOrderError || !workOrderData) {
        console.error('❌ Assigned work order fetch error:', workOrderError);
        return createCorsErrorResponse('Assigned work order not found', 404);
      }

      const workOrder = workOrderData;

      if (!workOrder?.profiles?.email) {
        return createCorsErrorResponse('No assignee found for work order', 404);
      }

      console.log('👤 Found assignee:', workOrder.profiles.email);

      // Fetch email template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', 'work_order_assigned')
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        return createCorsErrorResponse('Email template not found', 500);
      }

      // Generate URLs
      const urls = generateUrls(workOrder.id);

      // Prepare comprehensive template variables with branding
      const databaseData = {
        // Subcontractor Details
        subcontractor_name: `${workOrder.profiles.first_name || ''} ${workOrder.profiles.last_name || ''}`.trim(),
        first_name: workOrder.profiles.first_name || '',
        user_email: workOrder.profiles.email,
        company_name: workOrder.profiles.company_name || '',
        
        // Work Order Details
        work_order_number: workOrder.work_order_number || 'N/A',
        work_order_title: workOrder.title || 'Work Order',
        title: workOrder.title || 'Work Order',
        description: workOrder.description || 'No description provided',
        
        // Organization Details
        organization_name: workOrder.organizations?.name || 'Unknown Organization',
        organization_email: workOrder.organizations?.contact_email || '',
        organization_phone: workOrder.organizations?.contact_phone || '',
        
        // Location Details
        store_location: workOrder.store_location || workOrder.location_name || '',
        street_address: workOrder.street_address || workOrder.location_street_address || '',
        city: workOrder.city || workOrder.location_city || '',
        state: workOrder.state || workOrder.location_state || '',
        zip_code: workOrder.zip_code || workOrder.location_zip_code || '',
        location_address: formatAddress(workOrder),
        
        // Trade Details
        trade_name: workOrder.trades?.name || 'General',
        
        // Dates
        estimated_completion_date: formatDate(workOrder.estimated_completion_date),
        due_date: formatDate(workOrder.due_date),
        date_assigned: formatDate(workOrder.date_assigned),
        
        // URLs
        work_order_url: urls.work_order_url,
        
        // System Details
        current_date: formatDate(new Date().toISOString()),
        system_url: 'https://workorderportal.com'
      };

      const variables = mergeTemplateVariables(databaseData, custom_data);
      console.log('🔧 Template variables count:', Object.keys(variables).length);

      // Replace variables in subject and HTML content
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      console.log('📧 Processed email subject:', processedSubject);

      // Send email with rate limiting
      const emailResult = await rateLimitedSend({
        to: [workOrder.profiles.email],
        subject: processedSubject,
        html: processedHtml
      });

      // Log email attempt to database
      await supabase.from('email_logs').insert({
        work_order_id: workOrder.id,
        template_used: 'work_order_assigned',
        recipient_email: workOrder.profiles.email,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.error || null
      });

      if (!emailResult.success) {
        console.error('❌ Email sending failed:', emailResult.error);
        return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
      }

      console.log('✅ Work order assigned email sent successfully');

      return createCorsResponse({
        success: true,
        message: 'Work order assigned email sent successfully',
        recipients: 1,
        email_id: emailResult.id
      });
    }

    // Handle report_submitted emails
    if (template_name === 'report_submitted') {
      console.log('📝 Processing report_submitted email for:', record_id);

      // Fetch work order report with comprehensive JOINs
      const { data: reportData, error: reportError } = await supabase
        .from('work_order_reports')
        .select(`
          *,
          work_orders!work_order_id(
            id,
            work_order_number,
            title,
            store_location,
            street_address,
            city,
            state,
            zip_code,
            organizations!organization_id(name, contact_email, contact_phone)
          ),
          profiles!subcontractor_user_id(email, first_name, last_name, company_name)
        `)
        .eq('id', record_id)
        .single();

      if (reportError || !reportData || !reportData.profiles?.email) {
        console.error('❌ Report fetch error:', reportError);
        return createCorsErrorResponse('Report not found', 404);
      }

      const report = reportData;
      console.log('📝 Found report for work order:', report.work_orders?.work_order_number);

      // Get admin email addresses
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('user_type', 'admin')
        .eq('is_active', true);

      if (adminError || !admins?.length) {
        return createCorsErrorResponse('No admin recipients found', 404);
      }

      // Fetch email template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', 'report_submitted')
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        return createCorsErrorResponse('Email template not found', 500);
      }

      // Generate URLs
      const urls = generateUrls(report.work_order_id, report.id);

      // Prepare comprehensive template variables with branding
      const databaseData = {
        // Work Order Details
        work_order_number: report.work_orders?.work_order_number || 'N/A',
        
        // Subcontractor Details
        subcontractor_name: `${report.profiles?.first_name || ''} ${report.profiles?.last_name || ''}`.trim(),
        
        // Organization Details
        organization_name: report.work_orders?.organizations?.name || 'Unknown Organization',
        
        // Location Details
        store_location: report.work_orders?.store_location || '',
        
        // Work Summary
        work_performed: report.work_performed || 'No work description provided',
        hours_worked: report.hours_worked ? report.hours_worked.toString() : '',
        invoice_amount: report.invoice_amount ? `$${parseFloat(report.invoice_amount.toString()).toFixed(2)}` : '$0.00',
        
        // Report Details
        submitted_date: formatDate(report.submitted_at),
        
        // URLs
        review_url: urls.review_url,
        
        // System Details
        current_date: formatDate(new Date().toISOString()),
        system_url: 'https://workorderportal.com'
      };

      const variables = mergeTemplateVariables(databaseData, custom_data);
      console.log('🔧 Template variables count:', Object.keys(variables).length);

      // Replace variables in subject and HTML content
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      console.log('📧 Processed email subject:', processedSubject);

      // Send email with rate limiting
      const emailResult = await rateLimitedSend({
        to: admins.map(a => a.email),
        subject: processedSubject,
        html: processedHtml
      });

      // Log email attempt to database
      const logPromises = admins.map(admin => 
        supabase.from('email_logs').insert({
          work_order_id: report.work_order_id,
          template_used: template_name,
          recipient_email: admin.email,
          status: emailResult.success ? 'sent' : 'failed',
          error_message: emailResult.error || null
        })
      );

      await Promise.all(logPromises);
      console.log('📝 Email logs created for', admins.length, 'recipients');

      if (!emailResult.success) {
        console.error('❌ Email sending failed:', emailResult.error);
        return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
      }

      console.log('✅ Report submitted email sent successfully');

      return createCorsResponse({
        success: true,
        message: 'Report submitted email sent successfully',
        recipients: admins.length,
        email_id: emailResult.id
      });
    }

    // Handle report_reviewed emails  
    if (template_name === 'report_reviewed') {
      console.log('📋 Processing report_reviewed email for:', record_id);

      // Fetch work order report with comprehensive JOINs
      const { data: reportData, error: reportError } = await supabase
        .from('work_order_reports')
        .select(`
          *,
          work_orders!work_order_id(
            id,
            work_order_number,
            title,
            store_location,
            organizations!organization_id(name, contact_email, contact_phone)
          ),
          profiles!subcontractor_user_id(email, first_name, last_name, company_name)
        `)
        .eq('id', record_id)
        .single();

      if (reportError || !reportData || !reportData.profiles?.email) {
        console.error('❌ Report fetch error:', reportError);
        return createCorsErrorResponse('Report not found', 404);
      }

      const report = reportData;
      console.log('📋 Found report for work order:', report.work_orders?.work_order_number);

      // Fetch email template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', 'report_reviewed')
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        return createCorsErrorResponse('Email template not found', 500);
      }

      // Generate URLs
      const urls = generateUrls(report.work_order_id, report.id);

      // Prepare comprehensive template variables with branding
      const databaseData = {
        // Subcontractor Details
        subcontractor_name: `${report.profiles?.first_name || ''} ${report.profiles?.last_name || ''}`.trim(),
        first_name: report.profiles?.first_name || '',
        
        // Work Order Details
        work_order_number: report.work_orders?.work_order_number || 'N/A',
        work_order_title: report.work_orders?.title || 'Work Order',
        
        // Organization Details
        organization_name: report.work_orders?.organizations?.name || 'Unknown Organization',
        
        // Location Details
        store_location: report.work_orders?.store_location || '',
        
        // Review Details
        status: report.status,
        review_notes: report.review_notes || '',
        reviewed_date: formatDate(report.reviewed_at),
        
        // URLs
        report_url: urls.report_url,
        
        // System Details
        current_date: formatDate(new Date().toISOString()),
        system_url: 'https://workorderportal.com'
      };

      const variables = mergeTemplateVariables(databaseData, custom_data);
      console.log('🔧 Template variables count:', Object.keys(variables).length);

      // Replace variables in subject and HTML content
      const processedSubject = replaceTemplateVariables(template.subject, variables);
      const processedHtml = replaceTemplateVariables(template.html_content, variables);

      console.log('📧 Processed email subject:', processedSubject);

      // Send email with rate limiting
      const emailResult = await rateLimitedSend({
        to: [report.profiles.email],
        subject: processedSubject,
        html: processedHtml
      });

      // Log email attempt to database
      await supabase.from('email_logs').insert({
        work_order_id: report.work_order_id,
        template_used: 'report_reviewed',
        recipient_email: report.profiles.email,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.error || null
      });

      if (!emailResult.success) {
        console.error('❌ Email sending failed:', emailResult.error);
        return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
      }

      console.log('✅ Report reviewed email sent successfully');

      return createCorsResponse({
        success: true,
        message: 'Report reviewed email sent successfully',
        recipients: 1,
        email_id: emailResult.id
      });
    }

    // Handle generic templates (for templates not requiring special logic)
    console.log(`🔧 Processing generic template: ${template_name}`);
    
    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', template_name)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error(`❌ Template '${template_name}' fetch error:`, templateError);
      return createCorsErrorResponse(`Email template '${template_name}' not found or inactive`, 404);
    }

    console.log(`📄 Found generic email template: ${template.template_name}`);

    // For generic templates, use custom_data with branding
    const variables = mergeTemplateVariables({}, custom_data || {});
    
    // Add default system variables if not provided
    if (!variables.system_url) {
      variables.system_url = 'https://workorderportal.com';
    }
    if (!variables.current_date) {
      variables.current_date = new Date().toLocaleDateString();
    }

    console.log('🔧 Generic template variables:', variables);

    // Replace variables in subject and HTML content
    const processedSubject = replaceTemplateVariables(template.subject, variables);
    const processedHtml = replaceTemplateVariables(template.html_content, variables);

    console.log(`📧 Processed generic email subject: ${processedSubject}`);

    // Determine recipients - if no custom recipient provided, use admins as fallback
    let recipients: string[] = [];
    
    if (test_mode && test_recipient) {
      recipients = [test_recipient];
      console.log(`🧪 Test mode - sending to: ${test_recipient}`);
    } else if (custom_data?.recipient_email) {
      recipients = [custom_data.recipient_email];
      console.log(`📤 Custom recipient: ${custom_data.recipient_email}`);
    } else {
      // Fallback to admin emails
      const { data: adminProfiles, error: adminError } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_type', 'admin')
        .eq('is_active', true);

      if (adminError || !adminProfiles || adminProfiles.length === 0) {
        console.error('❌ No recipients found for generic template');
        return createCorsErrorResponse('No recipients found - please provide recipient_email in custom_data', 400);
      }

      recipients = adminProfiles.map(profile => profile.email);
      console.log(`👥 Fallback to admin recipients: ${recipients.length}`);
    }

    // Send email using Resend service
    const emailResult = await sendEmail({
      to: recipients,
      subject: processedSubject,
      html: processedHtml
    });

    // Log email attempt to database
    const logPromises = recipients.map(email => 
      supabase.from('email_logs').insert({
        template_used: template_name,
        recipient_email: email,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.success ? null : emailResult.error
      })
    );

    await Promise.all(logPromises);
    console.log(`📝 Email logs created for ${recipients.length} recipients`);

    if (!emailResult.success) {
      console.error(`❌ Generic template '${template_name}' email sending failed:`, emailResult.error);
      return createCorsErrorResponse(`Email sending failed: ${emailResult.error}`, 500);
    }

    console.log(`✅ Generic template '${template_name}' email sent successfully to ${recipients.length} recipients`);

    return createCorsResponse({
      success: true,
      message: `${template_name} email sent successfully`,
      recipients: recipients.length,
      email_id: emailResult.id,
      template_name: template_name
    });

  } catch (error) {
    console.error('❌ Send email function error:', error);
    return createCorsErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
});
