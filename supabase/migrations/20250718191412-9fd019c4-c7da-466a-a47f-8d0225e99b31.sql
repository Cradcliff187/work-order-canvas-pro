
-- Migration: Add email_recipient_settings table
-- This table manages which user roles receive which types of email notifications

-- Create the email_recipient_settings table
CREATE TABLE public.email_recipient_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL REFERENCES public.email_templates(template_name) ON DELETE CASCADE,
    role public.user_type NOT NULL,
    receives_email BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(template_name, role)
);

-- Enable Row Level Security
ALTER TABLE public.email_recipient_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - only admins can manage email recipient settings
CREATE POLICY "Admins can manage all email recipient settings" 
ON public.email_recipient_settings 
FOR ALL 
USING (public.auth_is_admin()) 
WITH CHECK (public.auth_is_admin());

-- Add update trigger for updated_at column
CREATE TRIGGER update_email_recipient_settings_updated_at
    BEFORE UPDATE ON public.email_recipient_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_email_recipient_settings_template_name 
ON public.email_recipient_settings(template_name);

CREATE INDEX idx_email_recipient_settings_template_role 
ON public.email_recipient_settings(template_name, role);

-- Insert default recipient settings for each template and role combination
-- Based on user requirements:
-- work_order_created: admin=true, partner=true, subcontractor=false, employee=false
-- work_order_assigned: admin=true, partner=false, subcontractor=true, employee=true  
-- work_order_completed: admin=true, partner=true, subcontractor=false, employee=false
-- report_submitted: admin=true, partner=false, subcontractor=false, employee=false
-- report_reviewed: admin=false, partner=false, subcontractor=true, employee=false
-- welcome_email: admin=true, partner=true, subcontractor=true, employee=true
-- invoice_submitted: admin=true, partner=false, subcontractor=false, employee=false

INSERT INTO public.email_recipient_settings (template_name, role, receives_email) VALUES
    -- work_order_created
    ('work_order_created', 'admin', true),
    ('work_order_created', 'partner', true),
    ('work_order_created', 'subcontractor', false),
    ('work_order_created', 'employee', false),
    
    -- work_order_assigned  
    ('work_order_assigned', 'admin', true),
    ('work_order_assigned', 'partner', false),
    ('work_order_assigned', 'subcontractor', true),
    ('work_order_assigned', 'employee', true),
    
    -- work_order_completed
    ('work_order_completed', 'admin', true),
    ('work_order_completed', 'partner', true),
    ('work_order_completed', 'subcontractor', false),
    ('work_order_completed', 'employee', false),
    
    -- report_submitted
    ('report_submitted', 'admin', true),
    ('report_submitted', 'partner', false),
    ('report_submitted', 'subcontractor', false),
    ('report_submitted', 'employee', false),
    
    -- report_reviewed
    ('report_reviewed', 'admin', false),
    ('report_reviewed', 'partner', false),
    ('report_reviewed', 'subcontractor', true),
    ('report_reviewed', 'employee', false),
    
    -- welcome_email
    ('welcome_email', 'admin', true),
    ('welcome_email', 'partner', true),
    ('welcome_email', 'subcontractor', true),
    ('welcome_email', 'employee', true),
    
    -- invoice_submitted
    ('invoice_submitted', 'admin', true),
    ('invoice_submitted', 'partner', false),
    ('invoice_submitted', 'subcontractor', false),
    ('invoice_submitted', 'employee', false)
ON CONFLICT (template_name, role) DO NOTHING;

-- Add helpful comment
COMMENT ON TABLE public.email_recipient_settings IS 'Manages which user roles receive specific types of email notifications';
