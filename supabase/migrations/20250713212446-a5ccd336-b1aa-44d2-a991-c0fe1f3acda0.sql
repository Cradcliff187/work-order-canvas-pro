-- Migration: Add welcome_email template to email_templates table
-- Adds the welcome email template for user account creation notifications

BEGIN;

-- Insert welcome_email template if it doesn't already exist
INSERT INTO email_templates (template_name, subject, html_content, text_content, is_active) 
SELECT 
  'welcome_email',
  'Welcome to WorkOrderPro - {{first_name}} {{last_name}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to WorkOrderPro</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .credentials { background: #fff; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to WorkOrderPro!</h1>
        </div>
        <div class="content">
            <h2>Hello {{first_name}} {{last_name}},</h2>
            <p>Your WorkOrderPro account has been created successfully! You can now access the system with your credentials below.</p>
            
            <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> {{email}}</p>
                <p><strong>Temporary Password:</strong> {{temporary_password}}</p>
                <p><strong>Account Type:</strong> {{user_type}}</p>
            </div>
            
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            
            <a href="{{site_url}}" class="button">Login to WorkOrderPro</a>
            
            <p>If you have any questions or need assistance, please contact your administrator.</p>
        </div>
        <div class="footer">
            <p>© 2024 WorkOrderPro. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
  'Welcome to WorkOrderPro!

Hello {{first_name}} {{last_name}},

Your WorkOrderPro account has been created successfully! You can now access the system with your credentials below.

Your Login Credentials:
- Email: {{email}}
- Temporary Password: {{temporary_password}}
- Account Type: {{user_type}}

Important: Please change your password after your first login for security purposes.

Login at: {{site_url}}

If you have any questions or need assistance, please contact your administrator.

© 2024 WorkOrderPro. All rights reserved.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE template_name = 'welcome_email'
);

COMMIT;