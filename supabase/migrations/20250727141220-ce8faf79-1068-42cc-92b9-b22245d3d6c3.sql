-- Phase 3: Delete unused welcome_email template
-- This template is no longer used after Phase 2 updates to create-admin-user function
DELETE FROM email_templates WHERE template_name = 'welcome_email';