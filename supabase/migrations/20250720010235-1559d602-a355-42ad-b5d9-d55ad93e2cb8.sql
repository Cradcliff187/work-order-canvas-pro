
-- Update welcome_email template to remove password references
-- Supabase handles authentication emails separately
UPDATE email_templates 
SET html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to WorkOrderPro</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to WorkOrderPro!</h1>
    </div>
    
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Hello {{first_name}} {{last_name}},</h2>
        
        <p>Welcome to WorkOrderPro! Your account has been successfully created as a <strong>{{user_type}}</strong>.</p>
        
        <p>You should receive a separate email from Supabase (noreply@mail.app.supabase.io) with instructions to set up your password. Please check your spam folder if you don''t see it.</p>
        
        <h3>What you can do:</h3>
        <ul>
            <li>Access your personalized dashboard</li>
            <li>Manage work orders and reports</li>
            <li>Collaborate with your team</li>
        </ul>
        
        <p>If you have any questions or need assistance, please contact your administrator.</p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        © 2024 WorkOrderPro. All rights reserved.
    </div>
</body>
</html>',
text_content = 'Welcome to WorkOrderPro!

Hello {{first_name}} {{last_name}},

Your WorkOrderPro account has been created as a {{user_type}}.

You should receive a separate email from Supabase with instructions to set up your password.

If you have questions, please contact your administrator.

© 2024 WorkOrderPro. All rights reserved.'
WHERE template_name = 'welcome_email';
