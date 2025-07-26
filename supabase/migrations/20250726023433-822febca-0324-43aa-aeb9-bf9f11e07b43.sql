-- Update email templates to replace WorkOrderPro with WorkOrderPortal branding

-- Update work_order_created template
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'WorkOrderPro - Professional Work Order Management', 'WorkOrderPortal - Professional Work Order Management'),
    subject = REPLACE(subject, 'WorkOrderPro', 'WorkOrderPortal')
WHERE template_name = 'work_order_created';

-- Update auth_confirmation template  
UPDATE email_templates 
SET html_content = REPLACE(REPLACE(html_content, 'Welcome to WorkOrderPro!', 'Welcome to WorkOrderPortal!'), 'WorkOrderPro account', 'WorkOrderPortal account'),
    subject = REPLACE(subject, 'WorkOrderPro', 'WorkOrderPortal')
WHERE template_name = 'auth_confirmation';

-- Update report_reviewed template
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'WorkOrderPro - Professional Work Order Management', 'WorkOrderPortal - Professional Work Order Management')
WHERE template_name = 'report_reviewed';

-- Update report_submitted template
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'WorkOrderPro - Professional Work Order Management', 'WorkOrderPortal - Professional Work Order Management')
WHERE template_name = 'report_submitted';

-- Update work_order_assigned template
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'WorkOrderPro - Professional Work Order Management', 'WorkOrderPortal - Professional Work Order Management')
WHERE template_name = 'work_order_assigned';

-- Update test_email template
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'WorkOrderPro Email Service', 'WorkOrderPortal Email Service')
WHERE template_name = 'test_email';

-- Update work_order_completed template
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'WorkOrderPro - Professional Work Order Management', 'WorkOrderPortal - Professional Work Order Management')
WHERE template_name = 'work_order_completed';

-- Update invoice_submitted template
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'WorkOrderPro', 'WorkOrderPortal')
WHERE template_name = 'invoice_submitted';

-- Update password_reset template
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'WorkOrderPro', 'WorkOrderPortal'),
    subject = REPLACE(subject, 'WorkOrderPro', 'WorkOrderPortal')
WHERE template_name = 'password_reset';

-- Update welcome_email template
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'WorkOrderPro', 'WorkOrderPortal')
WHERE template_name = 'welcome_email';