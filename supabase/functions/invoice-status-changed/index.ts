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
    const { invoice_id, status, notes, payment_reference } = await req.json();

    if (!invoice_id || !status) {
      throw new Error('Invoice ID and status are required');
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
        submitted_by_user:submitted_by (email, first_name, last_name),
        approved_by_user:approved_by (first_name, last_name),
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

    // Determine template name based on status
    let templateName: string;
    switch (status) {
      case 'approved':
        templateName = 'invoice_approved';
        break;
      case 'rejected':
        templateName = 'invoice_rejected';
        break;
      case 'paid':
        templateName = 'invoice_paid';
        break;
      default:
        throw new Error(`Unknown invoice status: ${status}`);
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', templateName)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error(`Email template ${templateName} not found: ${templateError?.message}`);
    }

    // Get recipient email
    const recipientEmail = invoice.submitted_by_user?.email;
    if (!recipientEmail) {
      throw new Error('Submitted by user email not found');
    }

    // Prepare template variables
    const variables: Record<string, any> = {
      internal_invoice_number: invoice.internal_invoice_number,
      external_invoice_number: invoice.external_invoice_number || 'Not provided',
      subcontractor_name: invoice.subcontractor_organization?.name || 'Unknown',
      total_amount: invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      work_orders: invoice.invoice_work_orders.map((item: any) => ({
        work_order_number: item.work_order?.work_order_number || 'N/A',
        title: item.work_order?.title || 'Unknown',
        amount: item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })
      }))
    };

    // Add status-specific variables
    if (status === 'approved') {
      variables.approved_date = new Date(invoice.approved_at || new Date()).toLocaleDateString();
      variables.approval_notes = notes || '';
    } else if (status === 'rejected') {
      variables.rejection_notes = notes || 'No reason provided';
    } else if (status === 'paid') {
      variables.payment_date = new Date(invoice.paid_at || new Date()).toLocaleDateString();
      variables.payment_reference = payment_reference || invoice.payment_reference || 'N/A';
    }

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
      } else if (key === 'approval_notes' && value) {
        // Handle conditional approval notes
        htmlContent = htmlContent.replace(/{{#approval_notes}}[\s\S]*?{{\/approval_notes}}/g, 
          htmlContent.match(/{{#approval_notes}}([\s\S]*?){{\/approval_notes}}/)?.[1] || '');
        textContent = textContent.replace(/{{#approval_notes}}[\s\S]*?{{\/approval_notes}}/g,
          textContent.match(/{{#approval_notes}}([\s\S]*?){{\/approval_notes}}/)?.[1] || '');
      } else if (key === 'approval_notes' && !value) {
        // Remove approval notes section if no notes
        htmlContent = htmlContent.replace(/{{#approval_notes}}[\s\S]*?{{\/approval_notes}}/g, '');
        textContent = textContent.replace(/{{#approval_notes}}[\s\S]*?{{\/approval_notes}}/g, '');
      }
      
      if (typeof value === 'string' || typeof value === 'number') {
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
        textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value));
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      }
    });

    // Send email
    try {
      const emailResult = await resend.emails.send({
        from: 'WorkOrderPro <notifications@workorderpro.com>',
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
        text: textContent,
      });

      // Log successful email
      await supabase.from('email_logs').insert({
        work_order_id: null,
        template_used: templateName,
        recipient_email: recipientEmail,
        resend_message_id: emailResult.data?.id,
        status: 'sent'
      });

      console.log(`Invoice ${status} email sent to ${recipientEmail}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: emailResult.data?.id,
          recipient: recipientEmail 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (emailError) {
      console.error(`Failed to send email to ${recipientEmail}:`, emailError);
      
      // Log failed email
      await supabase.from('email_logs').insert({
        work_order_id: null,
        template_used: templateName,
        recipient_email: recipientEmail,
        status: 'failed',
        error_message: emailError.message
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailError.message,
          recipient: recipientEmail 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in invoice-status-changed function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});