
-- Create the missing password_reset email template
INSERT INTO email_templates (template_name, subject, html_content, is_active) VALUES
('password_reset', 'Reset your WorkOrderPro password', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset your password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: #2563eb; margin-bottom: 30px;">Reset Your Password</h1>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Hello {{first_name}},</p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
            We received a request to reset your password for your WorkOrderPro account.
        </p>
        
        <div style="margin: 30px 0;">
            <a href="{{reset_link}}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Password
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you did not request a password reset, please ignore this email. This link will expire in 1 hour.
        </p>
        
        <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #9ca3af;">
            WorkOrderPro - Professional Work Order Management<br>
            This is an automated message, please do not reply.
        </p>
    </div>
</body>
</html>', 
true)
ON CONFLICT (template_name) DO UPDATE SET
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Update any remaining test domain references to use workorderportal.com
UPDATE organizations 
SET contact_email = REPLACE(contact_email, '@workorderpro.test', '@workorderportal.com')
WHERE contact_email LIKE '%@workorderpro.test';

UPDATE partner_locations 
SET contact_email = REPLACE(contact_email, '@workorderpro.test', '@workorderportal.com')
WHERE contact_email LIKE '%@workorderpro.test';

UPDATE profiles 
SET email = REPLACE(email, '@workorderpro.test', '@workorderportal.com')
WHERE email LIKE '%@workorderpro.test';
