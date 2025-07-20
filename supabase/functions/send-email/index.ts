
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

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

// URL configuration
const getBaseUrl = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (supabaseUrl?.includes('localhost')) {
    return 'http://localhost:5173'; // Local development
  }
  return 'https://workorderpro.com'; // Production - update this to actual domain
};

const generateUrls = (recordId: string, recordType: string) => {
  const baseUrl = getBaseUrl();
  
  return {
    admin_dashboard_url: `${baseUrl}/admin/dashboard`,
    work_order_url: `${baseUrl}/admin/work-orders/${recordId}`,
    review_url: `${baseUrl}/admin/work-order-reports/${recordId}`,
    report_url: `${baseUrl}/subcontractor/reports/${recordId}`,
    system_url: baseUrl,
    dashboard_url: baseUrl,
  };
};

const serve_handler = async (req: Request): Promise<Response> => {
  console.log('=== EMAIL FUNCTION INVOKED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_name, record_id, record_type, recipient_email, test_mode = false }: EmailRequest = await req.json();
    
    console.log(`Processing email request: ${template_name} for ${record_type} record ${record_id}, test_mode: ${test_mode}`);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(record_id)) {
      throw new Error(`Invalid UUID format: ${record_id}`);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch email template
    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', template_name)
      .eq('is_active', true)
      .single();

    if (templateError || !templateData) {
      console.error('Template fetch error:', templateError);
      throw new Error(`Email template '${template_name}' not found or inactive`);
    }

    // Generate URLs
    const urls = generateUrls(record_id, record_type);

    let emailData: any = { ...urls };
    let recipientEmail = recipient_email;

    // Fetch record data based on record type
    switch (record_type) {
      case 'work_order': {
        const { data: workOrder, error } = await supabase
          .from('work_orders')
          .select(`
            *,
            organization:organizations(*),
            trade:trades(*),
            created_by_profile:profiles!created_by(*),
            assigned_to_profile:profiles!assigned_to(*)
          `)
          .eq('id', record_id)
          .single();

        if (error) throw new Error(`Work order not found: ${error.message}`);

        emailData = {
          ...emailData,
          work_order_number: workOrder.work_order_number || 'N/A',
          work_order_title: workOrder.title || 'Work Order',
          title: workOrder.title || 'Work Order',
          description: workOrder.description || 'No description provided',
          organization_name: workOrder.organization?.name || 'Unknown Organization',
          store_location: workOrder.store_location || 'N/A',
          street_address: workOrder.street_address || 'N/A',
          city: workOrder.city || 'N/A',
          state: workOrder.state || 'N/A',
          zip_code: workOrder.zip_code || 'N/A',
          trade_name: workOrder.trade?.name || 'N/A',
          estimated_completion_date: workOrder.estimated_completion_date || 'TBD',
          due_date: workOrder.due_date || 'TBD',
          submitted_date: new Date(workOrder.date_submitted).toLocaleDateString(),
          current_date: new Date().toLocaleDateString(),
        };

        // Set recipient based on template type
        if (!recipientEmail) {
          if (template_name === 'work_order_created') {
            recipientEmail = 'admin@workorderpro.com'; // All admins get new work order notifications
          } else if (template_name === 'work_order_assigned' && workOrder.assigned_to_profile) {
            recipientEmail = workOrder.assigned_to_profile.email;
            emailData.subcontractor_name = `${workOrder.assigned_to_profile.first_name} ${workOrder.assigned_to_profile.last_name}`;
          } else if (template_name === 'work_order_completed') {
            recipientEmail = workOrder.organization?.contact_email || 'admin@workorderpro.com';
          }
        }
        break;
      }

      case 'work_order_assignment': {
        const { data: assignment, error } = await supabase
          .from('work_order_assignments')
          .select(`
            *,
            work_order:work_orders(*,
              organization:organizations(*),
              trade:trades(*)
            ),
            assigned_to_profile:profiles!assigned_to(*),
            assigned_by_profile:profiles!assigned_by(*)
          `)
          .eq('id', record_id)
          .single();

        if (error) throw new Error(`Assignment not found: ${error.message}`);

        const workOrder = assignment.work_order;
        emailData = {
          ...emailData,
          work_order_number: workOrder.work_order_number || 'N/A',
          work_order_title: workOrder.title || 'Work Order',
          description: workOrder.description || 'No description provided',
          organization_name: workOrder.organization?.name || 'Unknown Organization',
          store_location: workOrder.store_location || 'N/A',
          street_address: workOrder.street_address || 'N/A',
          city: workOrder.city || 'N/A',
          state: workOrder.state || 'N/A',
          zip_code: workOrder.zip_code || 'N/A',
          trade_name: workOrder.trade?.name || 'N/A',
          estimated_completion_date: workOrder.estimated_completion_date || 'TBD',
          subcontractor_name: `${assignment.assigned_to_profile.first_name} ${assignment.assigned_to_profile.last_name}`,
          current_date: new Date().toLocaleDateString(),
        };

        if (!recipientEmail) {
          recipientEmail = assignment.assigned_to_profile.email;
        }
        break;
      }

      case 'work_order_report': {
        const { data: report, error } = await supabase
          .from('work_order_reports')
          .select(`
            *,
            work_order:work_orders(*,
              organization:organizations(*),
              trade:trades(*)
            ),
            subcontractor_profile:profiles!subcontractor_user_id(*),
            reviewed_by_profile:profiles!reviewed_by_user_id(*)
          `)
          .eq('id', record_id)
          .single();

        if (error) throw new Error(`Report not found: ${error.message}`);

        const workOrder = report.work_order;
        emailData = {
          ...emailData,
          work_order_number: workOrder.work_order_number || 'N/A',
          work_order_title: workOrder.title || 'Work Order',
          organization_name: workOrder.organization?.name || 'Unknown Organization',
          store_location: workOrder.store_location || 'N/A',
          subcontractor_name: `${report.subcontractor_profile.first_name} ${report.subcontractor_profile.last_name}`,
          work_performed: report.work_performed || 'No details provided',
          hours_worked: report.hours_worked || 0,
          invoice_amount: report.invoice_amount || 0,
          materials_used: report.materials_used || 'None specified',
          submitted_date: new Date(report.submitted_at).toLocaleDateString(),
          reviewed_date: report.reviewed_at ? new Date(report.reviewed_at).toLocaleDateString() : 'Not reviewed',
          review_notes: report.review_notes || 'No notes provided',
          status: report.status || 'submitted',
          current_date: new Date().toLocaleDateString(),
        };

        if (!recipientEmail) {
          if (template_name === 'report_submitted') {
            recipientEmail = 'admin@workorderpro.com'; // Admins get report submissions
          } else if (template_name === 'report_reviewed') {
            recipientEmail = report.subcontractor_profile.email; // Subcontractor gets review notification
          }
        }
        break;
      }

      case 'user':
      case 'profile': {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', record_id)
          .single();

        if (error) throw new Error(`Profile not found: ${error.message}`);

        emailData = {
          ...emailData,
          user_name: `${profile.first_name} ${profile.last_name}`,
          first_name: profile.first_name,
          last_name: profile.last_name,
          user_email: profile.email,
          company_name: profile.company_name || 'Not specified',
          user_type: profile.user_type,
          current_date: new Date().toLocaleDateString(),
        };

        if (!recipientEmail) {
          recipientEmail = profile.email;
        }
        break;
      }

      case 'invoice': {
        const { data: invoice, error } = await supabase
          .from('invoices')
          .select(`
            *,
            subcontractor_organization:organizations!subcontractor_organization_id(*),
            submitted_by_profile:profiles!submitted_by(*),
            approved_by_profile:profiles!approved_by(*)
          `)
          .eq('id', record_id)
          .single();

        if (error) throw new Error(`Invoice not found: ${error.message}`);

        emailData = {
          ...emailData,
          internal_invoice_number: invoice.internal_invoice_number || 'N/A',
          external_invoice_number: invoice.external_invoice_number || 'N/A',
          total_amount: invoice.total_amount || 0,
          status: invoice.status || 'submitted',
          subcontractor_name: invoice.subcontractor_organization?.name || 'Unknown',
          submitted_date: invoice.submitted_at ? new Date(invoice.submitted_at).toLocaleDateString() : 'N/A',
          approved_date: invoice.approved_at ? new Date(invoice.approved_at).toLocaleDateString() : 'N/A',
          paid_date: invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : 'N/A',
          approval_notes: invoice.approval_notes || 'No notes provided',
          payment_reference: invoice.payment_reference || 'N/A',
          current_date: new Date().toLocaleDateString(),
        };

        if (!recipientEmail) {
          if (template_name === 'invoice_submitted') {
            recipientEmail = 'admin@workorderpro.com';
          } else if (invoice.submitted_by_profile) {
            recipientEmail = invoice.submitted_by_profile.email;
          }
        }
        break;
      }

      default:
        throw new Error(`Unsupported record type: ${record_type}`);
    }

    if (!recipientEmail) {
      throw new Error('No recipient email found or provided');
    }

    // Interpolate template content
    const interpolateContent = (content: string, data: any): string => {
      return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? String(data[key]) : match;
      });
    };

    const subject = interpolateContent(templateData.subject, emailData);
    const htmlContent = interpolateContent(templateData.html_content, emailData);
    const textContent = templateData.text_content 
      ? interpolateContent(templateData.text_content, emailData)
      : htmlContent.replace(/<[^>]*>/g, ''); // Strip HTML for text version

    // Test mode - return preview instead of sending
    if (test_mode) {
      console.log('Test mode - returning email preview');
      return new Response(JSON.stringify({
        success: true,
        test_mode: true,
        recipient: recipientEmail,
        subject: subject,
        html_preview: htmlContent.substring(0, 500) + '...',
        data_used: emailData,
        template_name: template_name,
        message: 'Email preview generated successfully (test mode)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Send actual email via IONOS SMTP
    console.log('Connecting to IONOS SMTP...');
    
    const smtpConfig = {
      hostname: 'smtp.ionos.com',
      port: 465,
      username: Deno.env.get('IONOS_EMAIL_USER'),
      password: Deno.env.get('IONOS_EMAIL_PASSWORD'),
    };

    // Create email message
    const boundary = `boundary_${Date.now()}`;
    const emailMessage = [
      `From: WorkOrderPro <${smtpConfig.username}>`,
      `To: ${recipientEmail}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      textContent,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      htmlContent,
      ``,
      `--${boundary}--`,
    ].join('\r\n');

    // Connect and send via IONOS SMTP
    const conn = await Deno.connect({
      hostname: smtpConfig.hostname,
      port: smtpConfig.port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Upgrade to TLS
    const tlsConn = await Deno.startTls(conn, { hostname: smtpConfig.hostname });

    // SMTP conversation
    await tlsConn.write(encoder.encode(`EHLO ${smtpConfig.hostname}\r\n`));
    await new Promise(resolve => setTimeout(resolve, 1000));

    await tlsConn.write(encoder.encode(`AUTH LOGIN\r\n`));
    await new Promise(resolve => setTimeout(resolve, 500));

    await tlsConn.write(encoder.encode(`${btoa(smtpConfig.username!)}\r\n`));
    await new Promise(resolve => setTimeout(resolve, 500));

    await tlsConn.write(encoder.encode(`${btoa(smtpConfig.password!)}\r\n`));
    await new Promise(resolve => setTimeout(resolve, 500));

    await tlsConn.write(encoder.encode(`MAIL FROM:<${smtpConfig.username}>\r\n`));
    await new Promise(resolve => setTimeout(resolve, 500));

    await tlsConn.write(encoder.encode(`RCPT TO:<${recipientEmail}>\r\n`));
    await new Promise(resolve => setTimeout(resolve, 500));

    await tlsConn.write(encoder.encode(`DATA\r\n`));
    await new Promise(resolve => setTimeout(resolve, 500));

    await tlsConn.write(encoder.encode(`${emailMessage}\r\n.\r\n`));
    await new Promise(resolve => setTimeout(resolve, 1000));

    await tlsConn.write(encoder.encode(`QUIT\r\n`));
    tlsConn.close();

    console.log(`Email sent successfully via IONOS SMTP to: ${recipientEmail}`);

    // Log the email in database
    try {
      await supabase.from('email_logs').insert({
        template_used: template_name,
        recipient_email: recipientEmail,
        status: 'sent',
        work_order_id: record_type === 'work_order' ? record_id : null,
      });
    } catch (logError) {
      console.warn('Failed to log email:', logError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully',
      recipient: recipientEmail,
      subject: subject,
      template_used: template_name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Email function error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
};

serve(serve_handler);
