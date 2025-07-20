
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { Resend } from "npm:resend@2.0.0";

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

    // Simple data object with safe defaults
    const emailData = {
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
      review_notes: 'No notes',
      admin_dashboard_url: 'https://workorderpro.com/admin/dashboard',
      work_order_url: `https://workorderpro.com/admin/work-orders/${record_id}`,
      review_url: `https://workorderpro.com/admin/work-order-reports/${record_id}`,
      report_url: `https://workorderpro.com/subcontractor/reports/${record_id}`,
      system_url: 'https://workorderpro.com',
      dashboard_url: 'https://workorderpro.com'
    };

    // Set default recipient if not provided
    const finalRecipient = recipient_email || 'admin@workorderpro.com';

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

    // Send email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    console.log(`Sending email to: ${finalRecipient}`);
    console.log(`Subject: ${subject}`);
    console.log(`Template: ${template_name}`);

    try {
      const emailResponse = await resend.emails.send({
        from: "WorkOrderPro <noreply@workorderpro.com>", // You'll need to update this with your verified domain
        to: [finalRecipient],
        subject: subject,
        html: htmlContent,
        text: textContent,
      });

      console.log("Email sent successfully:", emailResponse);

      // Log successful email
      await supabase.from('email_logs').insert({
        template_used: template_name,
        recipient_email: finalRecipient,
        status: 'sent',
        resend_message_id: emailResponse.data?.id,
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        recipient: finalRecipient,
        subject: subject,
        template_used: template_name,
        message_id: emailResponse.data?.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (emailError: any) {
      console.error('Failed to send email via Resend:', emailError);
      
      // Log failed email attempt
      try {
        await supabase.from('email_logs').insert({
          template_used: template_name,
          recipient_email: finalRecipient,
          status: 'failed',
          error_message: emailError.message,
        });
      } catch (logError) {
        console.warn('Failed to log email error:', logError);
      }

      throw new Error(`Email delivery failed: ${emailError.message}`);
    }

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
