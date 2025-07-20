
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

// Simple URL configuration
const getBaseUrl = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (supabaseUrl?.includes('localhost')) {
    return 'http://localhost:5173';
  }
  return 'https://workorderpro.com';
};

const serve_handler = async (req: Request): Promise<Response> => {
  console.log('=== EMAIL FUNCTION STARTED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_name, record_id, record_type, recipient_email, test_mode = false }: EmailRequest = await req.json();
    
    console.log(`Email request: ${template_name} for ${record_type} ${record_id}, test: ${test_mode}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get email template
    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', template_name)
      .eq('is_active', true)
      .single();

    if (templateError || !templateData) {
      console.error('Template error:', templateError);
      throw new Error(`Template '${template_name}' not found`);
    }

    // Basic URL generation
    const baseUrl = getBaseUrl();
    const urls = {
      admin_dashboard_url: `${baseUrl}/admin/dashboard`,
      work_order_url: `${baseUrl}/admin/work-orders/${record_id}`,
      review_url: `${baseUrl}/admin/work-order-reports/${record_id}`,
      report_url: `${baseUrl}/subcontractor/reports/${record_id}`,
      system_url: baseUrl,
      dashboard_url: baseUrl,
    };

    // Simple data object with safe defaults
    let emailData: any = {
      ...urls,
      work_order_number: 'WO-' + record_id.slice(0, 8),
      work_order_title: 'Work Order',
      title: 'Work Order',
      description: 'Work order details',
      organization_name: 'Organization',
      store_location: 'Location',
      street_address: 'Address',
      city: 'City',
      state: 'State',
      zip_code: 'ZIP',
      trade_name: 'Trade',
      estimated_completion_date: 'TBD',
      due_date: 'TBD',
      submitted_date: new Date().toLocaleDateString(),
      current_date: new Date().toLocaleDateString(),
      subcontractor_name: 'Subcontractor',
      user_name: 'User',
      first_name: 'User',
      last_name: 'Name',
      user_email: recipient_email || 'user@example.com',
      company_name: 'Company',
      user_type: 'user',
      work_performed: 'Work completed',
      hours_worked: 0,
      invoice_amount: 0,
      materials_used: 'Materials',
      status: 'submitted',
      reviewed_date: 'Not reviewed',
      review_notes: 'No notes'
    };

    // Set default recipient if not provided
    let finalRecipient = recipient_email || 'admin@workorderpro.com';

    // Template interpolation
    const interpolateContent = (content: string, data: any): string => {
      return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? String(data[key]) : match;
      });
    };

    const subject = interpolateContent(templateData.subject, emailData);
    const htmlContent = interpolateContent(templateData.html_content, emailData);
    const textContent = templateData.text_content 
      ? interpolateContent(templateData.text_content, emailData)
      : htmlContent.replace(/<[^>]*>/g, '');

    // Test mode - return preview
    if (test_mode) {
      console.log('Test mode - returning preview');
      return new Response(JSON.stringify({
        success: true,
        test_mode: true,
        recipient: finalRecipient,
        subject: subject,
        html_preview: htmlContent.substring(0, 500) + '...',
        template_name: template_name,
        message: 'Email preview generated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Send real email via IONOS SMTP
    console.log('Sending email via IONOS SMTP...');
    
    const smtpConfig = {
      hostname: 'smtp.ionos.com',
      port: 465,
      username: Deno.env.get('IONOS_EMAIL_USER'),
      password: Deno.env.get('IONOS_EMAIL_PASSWORD'),
    };

    if (!smtpConfig.username || !smtpConfig.password) {
      throw new Error('IONOS email credentials not configured');
    }

    // Create email message
    const boundary = `boundary_${Date.now()}`;
    const emailMessage = [
      `From: WorkOrderPro <${smtpConfig.username}>`,
      `To: ${finalRecipient}`,
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

    // Simple SMTP connection with timeout
    const conn = await Deno.connect({
      hostname: smtpConfig.hostname,
      port: smtpConfig.port,
    });

    const encoder = new TextEncoder();
    const tlsConn = await Deno.startTls(conn, { hostname: smtpConfig.hostname });

    try {
      // SMTP conversation with delays
      await tlsConn.write(encoder.encode(`EHLO ${smtpConfig.hostname}\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));

      await tlsConn.write(encoder.encode(`AUTH LOGIN\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));

      await tlsConn.write(encoder.encode(`${btoa(smtpConfig.username)}\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));

      await tlsConn.write(encoder.encode(`${btoa(smtpConfig.password)}\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));

      await tlsConn.write(encoder.encode(`MAIL FROM:<${smtpConfig.username}>\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));

      await tlsConn.write(encoder.encode(`RCPT TO:<${finalRecipient}>\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));

      await tlsConn.write(encoder.encode(`DATA\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));

      await tlsConn.write(encoder.encode(`${emailMessage}\r\n.\r\n`));
      await new Promise(resolve => setTimeout(resolve, 1000));

      await tlsConn.write(encoder.encode(`QUIT\r\n`));
      
    } finally {
      tlsConn.close();
    }

    console.log(`Email sent successfully to: ${finalRecipient}`);

    // Log email
    try {
      await supabase.from('email_logs').insert({
        template_used: template_name,
        recipient_email: finalRecipient,
        status: 'sent',
      });
    } catch (logError) {
      console.warn('Failed to log email:', logError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully',
      recipient: finalRecipient,
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
