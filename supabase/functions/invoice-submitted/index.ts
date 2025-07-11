import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoice_id } = await req.json();

    if (!invoice_id) {
      throw new Error('Invoice ID is required');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invoice details with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        subcontractor_organization:subcontractor_organization_id (name),
        submitted_by_user:submitted_by (first_name, last_name),
        invoice_work_orders (
          amount,
          description,
          work_order:work_order_id (
            work_order_number,
            title
          )
        )
      `)
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Failed to fetch invoice: ${invoiceError?.message}`);
    }

    // Get all admin users
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_type', 'admin')
      .eq('is_active', true);

    if (adminsError) {
      throw new Error(`Failed to fetch admins: ${adminsError.message}`);
    }

    if (!admins || admins.length === 0) {
      console.warn('No admin users found to notify');
      return new Response(
        JSON.stringify({ success: false, error: 'No admin users found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'invoice_submitted')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error(`Email template not found: ${templateError?.message}`);
    }

    // Prepare template variables
    const variables = {
      internal_invoice_number: invoice.internal_invoice_number,
      external_invoice_number: invoice.external_invoice_number || 'Not provided',
      subcontractor_name: invoice.subcontractor_organization?.name || 'Unknown',
      total_amount: invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      dashboard_url: `${supabaseUrl.replace('/rest/v1', '')}`,
      work_orders: invoice.invoice_work_orders.map((item: any) => ({
        work_order_number: item.work_order?.work_order_number || 'N/A',
        title: item.work_order?.title || 'Unknown',
        amount: item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })
      }))
    };

    // Simple template variable replacement
    let htmlContent = template.html_content;
    let textContent = template.text_content || '';
    let subject = template.subject;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      if (key === 'work_orders' && Array.isArray(value)) {
        // Handle work orders list
        let workOrdersHtml = '';
        let workOrdersText = '';
        value.forEach((wo: any) => {
          workOrdersHtml += `<p>• ${wo.work_order_number} - ${wo.title} ($${wo.amount})</p>`;
          workOrdersText += `- ${wo.work_order_number} - ${wo.title} ($${wo.amount})\n`;
        });
        htmlContent = htmlContent.replace(/{{#work_orders}}[\s\S]*?{{\/work_orders}}/g, workOrdersHtml);
        textContent = textContent.replace(/{{#work_orders}}[\s\S]*?{{\/work_orders}}/g, workOrdersText);
      } else {
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
        textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value));
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      }
    });

    // Send emails to all admins
    const emailResults = [];
    for (const admin of admins) {
      try {
        const emailResult = await resend.emails.send({
          from: 'WorkOrderPro <notifications@workorderpro.com>',
          to: [admin.email],
          subject: subject,
          html: htmlContent,
          text: textContent,
        });

        // Log email
        await supabase.from('email_logs').insert({
          work_order_id: null,
          template_used: 'invoice_submitted',
          recipient_email: admin.email,
          resend_message_id: emailResult.data?.id,
          status: 'sent'
        });

        emailResults.push({ 
          recipient: admin.email, 
          success: true, 
          messageId: emailResult.data?.id 
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
        
        // Log failed email
        await supabase.from('email_logs').insert({
          work_order_id: null,
          template_used: 'invoice_submitted',
          recipient_email: admin.email,
          status: 'failed',
          error_message: emailError.message
        });

        emailResults.push({ 
          recipient: admin.email, 
          success: false, 
          error: emailError.message 
        });
      }
    }

    console.log('Invoice submitted emails sent:', emailResults);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailResults,
        totalSent: emailResults.filter(r => r.success).length,
        totalFailed: emailResults.filter(r => !r.success).length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in invoice-submitted function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});