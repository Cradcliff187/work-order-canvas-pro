-- Add report_reviewed email template
INSERT INTO email_templates (template_name, subject, html_content, text_content, is_active) 
SELECT 
  'report_reviewed',
  'Work Order Report {{status}} - {{work_order_number}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report {{status}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff;">
        <h2 style="color: #007bff; margin-top: 0;">Work Order Report {{status}}</h2>
        
        <p>Hello {{first_name}},</p>
        
        <p>Your report for the following work order has been <strong>{{status}}</strong>:</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Work Order:</strong> {{work_order_number}}</p>
            <p><strong>Title:</strong> {{work_order_title}}</p>
            <p><strong>Organization:</strong> {{organization_name}}</p>
            <p><strong>Status:</strong> <span style="text-transform: capitalize; font-weight: bold;">{{status}}</span></p>
        </div>
        
        {{#if review_notes}}
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 3px solid #ffc107; margin: 20px 0;">
            <p><strong>Review Notes:</strong></p>
            <p>{{review_notes}}</p>
        </div>
        {{/if}}
        
        <p>Thank you for your work!</p>
        
        <p>Best regards,<br/>
        <strong>WorkOrderPro Team</strong></p>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
        <p>This is an automated notification from WorkOrderPro.</p>
    </div>
</body>
</html>',
  'Hello {{first_name}},

Your report for work order {{work_order_number}} - {{work_order_title}} has been {{status}}.

{{#if review_notes}}
Review Notes: {{review_notes}}
{{/if}}

Best regards,
WorkOrderPro Team',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE template_name = 'report_reviewed'
);