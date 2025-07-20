-- Migration: Add welcome_email template to email_templates table
-- Adds the welcome email template for user account creation notifications

BEGIN;

-- Insert welcome_email template if it doesn't already exist
INSERT INTO email_templates (template_name, subject, html_content, text_content, is_active) 
SELECT 
  'welcome_email',
  'Welcome to WorkOrderPro',
  '<h1>Welcome {{first_name}}!</h1><p>Your account has been created. Your temporary password is: {{temporary_password}}</p>',
  'Welcome {{first_name}}! Your account has been created. Your temporary password is: {{temporary_password}}',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE template_name = 'welcome_email'
);

COMMIT;