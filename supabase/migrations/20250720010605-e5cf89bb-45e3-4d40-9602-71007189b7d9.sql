
-- Restore default email recipient settings for all templates
-- This re-enables the email notification system with sensible defaults
INSERT INTO public.email_recipient_settings (template_name, role, receives_email) VALUES
    -- work_order_created: Notify admins and partners when work orders are created
    ('work_order_created', 'admin', true),
    ('work_order_created', 'partner', true),
    ('work_order_created', 'subcontractor', false),
    ('work_order_created', 'employee', false),
    
    -- work_order_assigned: Notify the assigned users and admins
    ('work_order_assigned', 'admin', true),
    ('work_order_assigned', 'partner', false),
    ('work_order_assigned', 'subcontractor', true),
    ('work_order_assigned', 'employee', true),
    
    -- work_order_completed: Notify admins and partners of completion
    ('work_order_completed', 'admin', true),
    ('work_order_completed', 'partner', true),
    ('work_order_completed', 'subcontractor', false),
    ('work_order_completed', 'employee', false),
    
    -- report_submitted: Only notify admins when reports are submitted
    ('report_submitted', 'admin', true),
    ('report_submitted', 'partner', false),
    ('report_submitted', 'subcontractor', false),
    ('report_submitted', 'employee', false),
    
    -- report_reviewed: Notify subcontractors when their reports are reviewed
    ('report_reviewed', 'admin', false),
    ('report_reviewed', 'partner', false),
    ('report_reviewed', 'subcontractor', true),
    ('report_reviewed', 'employee', false),
    
    -- welcome_email: Send welcome emails to all new users
    ('welcome_email', 'admin', true),
    ('welcome_email', 'partner', true),
    ('welcome_email', 'subcontractor', true),
    ('welcome_email', 'employee', true),
    
    -- invoice_submitted: Only notify admins when invoices are submitted
    ('invoice_submitted', 'admin', true),
    ('invoice_submitted', 'partner', false),
    ('invoice_submitted', 'subcontractor', false),
    ('invoice_submitted', 'employee', false)
ON CONFLICT (template_name, role) DO NOTHING;
