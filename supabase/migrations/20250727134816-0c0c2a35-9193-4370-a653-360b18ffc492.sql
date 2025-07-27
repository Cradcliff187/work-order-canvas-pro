-- Update auth_confirmation email template for password setup focus
UPDATE email_templates 
SET 
  subject = 'Set up your WorkOrderPortal password',
  html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set up your WorkOrderPortal password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0485EA 0%, #0369A1 100%); padding: 40px 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.02em;">
        Welcome to WorkOrderPortal
      </h1>
      <p style="color: #E0F2FE; margin: 10px 0 0; font-size: 16px; opacity: 0.9;">
        Your account is ready - let''s set up your password
      </p>
    </div>
    
    <!-- Main Content -->
    <div style="padding: 40px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 24px; font-weight: 600;">
          Hi {{first_name}},
        </h2>
        <p style="color: #64748b; margin: 0; font-size: 16px; line-height: 1.5;">
          Your WorkOrderPortal account has been created with the email address <strong>{{email}}</strong>. 
          To complete your setup and start using the platform, please set up your password by clicking the button below.
        </p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{confirmation_link}}" 
           style="display: inline-block; background: linear-gradient(135deg, #0485EA 0%, #0369A1 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.02em; box-shadow: 0 4px 6px rgba(4, 133, 234, 0.25); transition: all 0.2s ease;">
          Set Your Password
        </a>
      </div>
      
      <!-- Additional Instructions -->
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin: 32px 0; border-left: 4px solid #0485EA;">
        <h3 style="color: #1e293b; margin: 0 0 12px; font-size: 16px; font-weight: 600;">
          What happens next?
        </h3>
        <ul style="color: #64748b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
          <li style="margin-bottom: 8px;">Click the "Set Your Password" button above</li>
          <li style="margin-bottom: 8px;">Create a secure password for your account</li>
          <li style="margin-bottom: 8px;">Start managing work orders and collaborating with your team</li>
        </ul>
      </div>
      
      <!-- Security Note -->
      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.5;">
          This password setup link will expire in 24 hours for security reasons.<br>
          If you didn''t request this account, please ignore this email.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; margin: 0; font-size: 12px; line-height: 1.5;">
        © 2024 WorkOrderPortal. All rights reserved.<br>
        This is an automated message, please do not reply to this email.
      </p>
    </div>
    
  </div>
</body>
</html>',
  text_content = 'Welcome to WorkOrderPortal!

Hi {{first_name}},

Your WorkOrderPortal account has been created with the email address {{email}}.

To complete your setup and start using the platform, please set up your password by visiting the following link:

{{confirmation_link}}

What happens next?
- Click the link above to set up your password
- Create a secure password for your account  
- Start managing work orders and collaborating with your team

This password setup link will expire in 24 hours for security reasons.

If you didn''t request this account, please ignore this email.

Best regards,
The WorkOrderPortal Team

© 2024 WorkOrderPortal. All rights reserved.
This is an automated message, please do not reply to this email.'
WHERE template_name = 'auth_confirmation';