
-- Add auth confirmation email template
INSERT INTO email_templates (
  template_name, 
  subject, 
  html_content, 
  text_content, 
  is_active
) VALUES (
  'auth_confirmation',
  'Confirm your WorkOrderPro account',
  '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background-color: #0485EA; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
                AKC WorkOrderPortal
            </h1>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #0485EA; margin-bottom: 20px; font-size: 28px;">
                Welcome to WorkOrderPro!
            </h2>
            
            <p style="margin-bottom: 20px; font-size: 16px;">
                Hello {{first_name}},
            </p>
            
            <p style="margin-bottom: 25px; font-size: 16px;">
                Thank you for creating your WorkOrderPro account. To get started, please confirm your email address by clicking the button below.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0485EA;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                    <strong>Email:</strong> {{email}}
                </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{confirmation_link}}" 
                   style="display: inline-block; background-color: #0485EA; color: #ffffff; text-decoration: none; 
                          padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Confirm Your Account
                </a>
            </div>
            
            <p style="margin-bottom: 20px; font-size: 14px; color: #666;">
                If the button above doesn''t work, you can also copy and paste the following link into your browser:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; color: #333;">
                {{confirmation_link}}
            </div>
            
            <p style="margin-top: 25px; font-size: 14px; color: #666;">
                This confirmation link will expire in 24 hours for security purposes.
            </p>
            
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
                If you didn''t create this account, you can safely ignore this email.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 12px; color: #666; text-align: center;">
                Need help? Contact our support team at 
                <a href="mailto:support@workorderpro.com" style="color: #0485EA;">support@workorderpro.com</a>
            </p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666; text-align: center;">
                © 2025 WorkOrderPro. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
  'Welcome to WorkOrderPro!

Hello {{first_name}},

Thank you for creating your WorkOrderPro account. To get started, please confirm your email address by clicking the link below.

Email: {{email}}

Confirmation Link:
{{confirmation_link}}

If you''re having trouble clicking the link, copy and paste it into your web browser.

This confirmation link will expire in 24 hours for security purposes.

If you didn''t create this account, you can safely ignore this email.

Need help? Contact our support team at support@workorderpro.com

© 2025 WorkOrderPro. All rights reserved.',
  true
);
