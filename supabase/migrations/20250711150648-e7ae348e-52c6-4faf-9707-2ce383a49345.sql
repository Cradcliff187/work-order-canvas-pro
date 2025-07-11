-- Create invoice email templates
INSERT INTO email_templates (template_name, subject, html_content, text_content, is_active) VALUES
('invoice_submitted', 'New Invoice Submitted - {{internal_invoice_number}}', 
'<h1>New Invoice Submitted</h1>
<p>A new invoice has been submitted by <strong>{{subcontractor_name}}</strong>.</p>

<div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
  <h3>Invoice Details</h3>
  <p><strong>Internal Invoice #:</strong> {{internal_invoice_number}}</p>
  <p><strong>Vendor Invoice #:</strong> {{external_invoice_number}}</p>
  <p><strong>Subcontractor:</strong> {{subcontractor_name}}</p>
  <p><strong>Total Amount:</strong> ${{total_amount}}</p>
</div>

<h3>Work Orders</h3>
{{#work_orders}}
<p>• {{work_order_number}} - {{title}} (${{amount}})</p>
{{/work_orders}}

<p><a href="{{dashboard_url}}/admin/invoices" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Review Invoice</a></p>

<p>Please review and approve this invoice in the admin dashboard.</p>', 

'New Invoice Submitted

A new invoice has been submitted by {{subcontractor_name}}.

Invoice Details:
- Internal Invoice #: {{internal_invoice_number}}
- Vendor Invoice #: {{external_invoice_number}}
- Subcontractor: {{subcontractor_name}}
- Total Amount: ${{total_amount}}

Work Orders:
{{#work_orders}}
- {{work_order_number}} - {{title}} (${{amount}})
{{/work_orders}}

Please review this invoice in the admin dashboard.', true),

('invoice_approved', 'Invoice Approved - {{internal_invoice_number}}', 
'<h1>Invoice Approved</h1>
<p>Your invoice has been approved and is ready for payment processing.</p>

<div style="background: #f0f9ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #0ea5e9;">
  <h3>Invoice Details</h3>
  <p><strong>Internal Invoice #:</strong> {{internal_invoice_number}}</p>
  <p><strong>Your Invoice #:</strong> {{external_invoice_number}}</p>
  <p><strong>Total Amount:</strong> ${{total_amount}}</p>
  <p><strong>Approved Date:</strong> {{approved_date}}</p>
</div>

{{#approval_notes}}
<div style="background: #fefce8; padding: 15px; margin: 15px 0; border-radius: 6px;">
  <h4>Approval Notes:</h4>
  <p>{{approval_notes}}</p>
</div>
{{/approval_notes}}

<h3>Work Orders</h3>
{{#work_orders}}
<p>• {{work_order_number}} - {{title}} (${{amount}})</p>
{{/work_orders}}

<p>Your invoice is now in the payment queue and will be processed according to our payment schedule.</p>', 

'Invoice Approved

Your invoice has been approved and is ready for payment processing.

Invoice Details:
- Internal Invoice #: {{internal_invoice_number}}
- Your Invoice #: {{external_invoice_number}}
- Total Amount: ${{total_amount}}
- Approved Date: {{approved_date}}

{{#approval_notes}}
Approval Notes:
{{approval_notes}}
{{/approval_notes}}

Work Orders:
{{#work_orders}}
- {{work_order_number}} - {{title}} (${{amount}})
{{/work_orders}}

Your invoice is now in the payment queue.', true),

('invoice_rejected', 'Invoice Rejected - {{internal_invoice_number}}', 
'<h1>Invoice Rejected</h1>
<p>Your invoice has been rejected and requires corrections before resubmission.</p>

<div style="background: #fef2f2; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ef4444;">
  <h3>Invoice Details</h3>
  <p><strong>Internal Invoice #:</strong> {{internal_invoice_number}}</p>
  <p><strong>Your Invoice #:</strong> {{external_invoice_number}}</p>
  <p><strong>Total Amount:</strong> ${{total_amount}}</p>
</div>

<div style="background: #fefce8; padding: 15px; margin: 15px 0; border-radius: 6px;">
  <h4>Rejection Reason:</h4>
  <p>{{rejection_notes}}</p>
</div>

<h3>Work Orders</h3>
{{#work_orders}}
<p>• {{work_order_number}} - {{title}} (${{amount}})</p>
{{/work_orders}}

<p>Please make the necessary corrections and resubmit your invoice.</p>', 

'Invoice Rejected

Your invoice has been rejected and requires corrections.

Invoice Details:
- Internal Invoice #: {{internal_invoice_number}}
- Your Invoice #: {{external_invoice_number}}
- Total Amount: ${{total_amount}}

Rejection Reason:
{{rejection_notes}}

Work Orders:
{{#work_orders}}
- {{work_order_number}} - {{title}} (${{amount}})
{{/work_orders}}

Please make corrections and resubmit.', true),

('invoice_paid', 'Payment Processed - {{internal_invoice_number}}', 
'<h1>Payment Processed</h1>
<p>Your invoice has been paid. Payment details are below.</p>

<div style="background: #f0fdf4; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #22c55e;">
  <h3>Payment Details</h3>
  <p><strong>Internal Invoice #:</strong> {{internal_invoice_number}}</p>
  <p><strong>Your Invoice #:</strong> {{external_invoice_number}}</p>
  <p><strong>Amount Paid:</strong> ${{total_amount}}</p>
  <p><strong>Payment Date:</strong> {{payment_date}}</p>
  <p><strong>Payment Reference:</strong> {{payment_reference}}</p>
</div>

<h3>Work Orders</h3>
{{#work_orders}}
<p>• {{work_order_number}} - {{title}} (${{amount}})</p>
{{/work_orders}}

<p>Thank you for your work. If you have any questions about this payment, please contact our accounting department.</p>', 

'Payment Processed

Your invoice has been paid.

Payment Details:
- Internal Invoice #: {{internal_invoice_number}}
- Your Invoice #: {{external_invoice_number}}
- Amount Paid: ${{total_amount}}
- Payment Date: {{payment_date}}
- Payment Reference: {{payment_reference}}

Work Orders:
{{#work_orders}}
- {{work_order_number}} - {{title}} (${{amount}})
{{/work_orders}}

Thank you for your work.', true);