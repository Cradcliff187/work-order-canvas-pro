-- Phase 3: Add partner invoice email template and triggers

-- Insert the partner invoice ready email template
INSERT INTO email_templates (
  template_name,
  subject,
  html_content,
  text_content,
  is_active
) VALUES (
  'partner_invoice_ready',
  'Invoice {{invoice_number}} Ready - {{partner_organization_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: ''Segoe UI'', Arial, sans-serif; background-color: #f4f4f4; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f4; padding: 40px 0; }
    .container { max-width: 700px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0080FF 0%, #0066CC 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .invoice-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .total-box { background-color: #e8f5e9; border-radius: 6px; padding: 20px; margin: 20px 0; text-align: center; }
    .total-amount { font-size: 36px; color: #2e7d32; font-weight: bold; margin: 10px 0; }
    .action-button { display: inline-block; background-color: #0080FF; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; margin: 10px 5px; }
    .footer { background-color: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 14px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { background-color: #f8f9fa; padding: 15px; border-radius: 6px; }
    .info-label { font-size: 14px; color: #666; margin-bottom: 5px; }
    .info-value { font-size: 16px; font-weight: 600; color: #333; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>📄 Invoice Ready</h1>
      </div>
      <div class="content">
        <h2 style="color: #333; font-size: 20px; margin-bottom: 20px;">Your invoice is ready for review</h2>
        
        <div class="invoice-box">
          <p style="margin: 0 0 10px 0;"><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p style="margin: 0 0 10px 0;"><strong>Organization:</strong> {{partner_organization_name}}</p>
          <p style="margin: 0 0 10px 0;"><strong>Invoice Date:</strong> {{invoice_date}}</p>
          <p style="margin: 0;"><strong>Due Date:</strong> {{due_date}}</p>
        </div>
        
        <div class="total-box">
          <p style="margin: 0; color: #666;">Total Amount:</p>
          <div class="total-amount">${{total_amount}}</div>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Subtotal</div>
            <div class="info-value">${{subtotal}}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Markup</div>
            <div class="info-value">{{markup_percentage}}%</div>
          </div>
        </div>
        
        <center style="margin: 30px 0;">
          <a href="{{partner_dashboard_url}}/invoices/{{invoice_id}}" class="action-button">View Invoice</a>
          <a href="{{pdf_download_url}}" class="action-button" style="background-color: #28a745;">Download PDF</a>
        </center>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Payment Instructions:</strong><br>
            Please review your invoice and submit payment by the due date. 
            For questions about this invoice, please contact us at {{support_email}}.
          </p>
        </div>
      </div>
      <div class="footer">
        <p style="margin: 0 0 10px 0;"><strong>{{company_name}}</strong></p>
        <p style="margin: 0;">{{company_address}} | {{support_email}} | {{company_website}}</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Invoice {{invoice_number}} Ready

Your invoice is ready for review:

Invoice Number: {{invoice_number}}
Organization: {{partner_organization_name}}
Invoice Date: {{invoice_date}}
Due Date: {{due_date}}
Total Amount: ${{total_amount}}

View Invoice: {{partner_dashboard_url}}/invoices/{{invoice_id}}
Download PDF: {{pdf_download_url}}

Payment Instructions:
Please review your invoice and submit payment by the due date. 
For questions about this invoice, please contact us at {{support_email}}.

{{company_name}}
{{company_address}}
{{support_email}} | {{company_website}}',
  true
) ON CONFLICT (template_name) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Create function to automatically send partner invoice emails when status changes to 'sent'
CREATE OR REPLACE FUNCTION public.trigger_partner_invoice_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_context_data jsonb;
BEGIN
  -- Only trigger when status changes from 'draft' to 'sent'
  IF TG_OP = 'UPDATE' AND 
     OLD.status = 'draft' AND 
     NEW.status = 'sent' THEN
    
    -- Build comprehensive context data for email
    SELECT jsonb_build_object(
      'invoice_id', pi.id,
      'invoice_number', pi.invoice_number,
      'partner_organization_id', pi.partner_organization_id,
      'partner_organization_name', o.name,
      'partner_organization_contact', o.contact_email,
      'invoice_date', pi.invoice_date,
      'due_date', pi.due_date,
      'subtotal', pi.subtotal,
      'markup_percentage', pi.markup_percentage,
      'total_amount', pi.total_amount,
      'pdf_url', pi.pdf_url,
      'pdf_download_url', CASE 
        WHEN pi.pdf_url IS NOT NULL 
        THEN pi.pdf_url
        ELSE NULL 
      END
    ) INTO v_context_data
    FROM partner_invoices pi
    JOIN organizations o ON o.id = pi.partner_organization_id
    WHERE pi.id = NEW.id;

    -- Queue the email
    INSERT INTO email_queue (
      template_name,
      record_id,
      record_type,
      context_data
    ) VALUES (
      'partner_invoice_ready',
      NEW.id,
      'partner_invoice',
      v_context_data
    );
    
    -- Update the sent_at timestamp
    NEW.sent_at = now();
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Partner invoice email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Create trigger on partner_invoices table
DROP TRIGGER IF EXISTS partner_invoice_email_trigger ON partner_invoices;
CREATE TRIGGER partner_invoice_email_trigger
  BEFORE UPDATE ON partner_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_partner_invoice_email();

-- Create function to queue partner invoice emails (can be called manually)
CREATE OR REPLACE FUNCTION public.queue_partner_invoice_email(invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_context_data jsonb;
  v_partner_email text;
BEGIN
  -- Build context data and get partner contact email
  SELECT 
    jsonb_build_object(
      'invoice_id', pi.id,
      'invoice_number', pi.invoice_number,
      'partner_organization_id', pi.partner_organization_id,
      'partner_organization_name', o.name,
      'partner_organization_contact', o.contact_email,
      'invoice_date', pi.invoice_date,
      'due_date', pi.due_date,
      'subtotal', pi.subtotal,
      'markup_percentage', pi.markup_percentage,
      'total_amount', pi.total_amount,
      'pdf_url', pi.pdf_url,
      'pdf_download_url', CASE 
        WHEN pi.pdf_url IS NOT NULL 
        THEN pi.pdf_url
        ELSE NULL 
      END
    ),
    o.contact_email
  INTO v_context_data, v_partner_email
  FROM partner_invoices pi
  JOIN organizations o ON o.id = pi.partner_organization_id
  WHERE pi.id = queue_partner_invoice_email.invoice_id;
  
  IF v_context_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invoice not found'
    );
  END IF;
  
  IF v_partner_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Partner organization contact email not found'
    );
  END IF;
  
  -- Queue the email
  INSERT INTO email_queue (
    template_name,
    record_id,
    record_type,
    context_data
  ) VALUES (
    'partner_invoice_ready',
    queue_partner_invoice_email.invoice_id,
    'partner_invoice',
    v_context_data
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email queued successfully',
    'recipient', v_partner_email
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;