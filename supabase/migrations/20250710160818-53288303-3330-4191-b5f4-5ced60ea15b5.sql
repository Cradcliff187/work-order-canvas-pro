-- WorkOrderPro Complete Database Schema
-- 12-table construction work order management system

-- Drop existing enums if they exist to recreate with proper values
DROP TYPE IF EXISTS public.work_order_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.priority_level CASCADE;

-- Create comprehensive enums
CREATE TYPE public.user_type AS ENUM ('admin', 'partner', 'subcontractor');
CREATE TYPE public.work_order_status AS ENUM ('received', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.report_status AS ENUM ('submitted', 'reviewed', 'approved', 'rejected');
CREATE TYPE public.email_status AS ENUM ('sent', 'delivered', 'failed', 'bounced');
CREATE TYPE public.assignment_type AS ENUM ('internal', 'subcontractor');
CREATE TYPE public.file_type AS ENUM ('photo', 'invoice', 'document');

-- 1. Organizations table (multi-tenant support)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. Update profiles table (users) with enhanced fields
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS role,
  ADD COLUMN user_type public.user_type NOT NULL DEFAULT 'subcontractor',
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. User organizations junction table
CREATE TABLE public.user_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 4. Trades table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Update work_orders table with comprehensive fields
ALTER TABLE public.work_orders
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS priority,
  ADD COLUMN work_order_number TEXT UNIQUE,
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id),
  ADD COLUMN store_location TEXT,
  ADD COLUMN street_address TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN state TEXT,
  ADD COLUMN zip_code TEXT,
  ADD COLUMN trade_id UUID REFERENCES public.trades(id),
  ADD COLUMN status public.work_order_status NOT NULL DEFAULT 'received',
  ADD COLUMN assigned_to_type public.assignment_type,
  ADD COLUMN estimated_completion_date DATE,
  ADD COLUMN actual_completion_date DATE,
  ADD COLUMN date_submitted TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ADD COLUMN date_assigned TIMESTAMP WITH TIME ZONE,
  ADD COLUMN date_completed TIMESTAMP WITH TIME ZONE,
  ADD COLUMN subcontractor_report_submitted BOOLEAN DEFAULT false,
  ADD COLUMN subcontractor_invoice_amount DECIMAL(10,2),
  ADD COLUMN admin_completion_notes TEXT,
  ADD COLUMN final_completion_date DATE;

-- 6. Work order reports table
CREATE TABLE public.work_order_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  subcontractor_user_id UUID NOT NULL REFERENCES public.profiles(id),
  work_performed TEXT NOT NULL,
  materials_used TEXT,
  hours_worked DECIMAL(8,2),
  invoice_amount DECIMAL(10,2) NOT NULL,
  invoice_number TEXT,
  photos JSONB,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status public.report_status NOT NULL DEFAULT 'submitted',
  reviewed_by_user_id UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT
);

-- 7. Work order attachments table
CREATE TABLE public.work_order_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  work_order_report_id UUID REFERENCES public.work_order_reports(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type public.file_type NOT NULL,
  file_size INTEGER,
  uploaded_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT work_order_attachments_check CHECK (
    (work_order_id IS NOT NULL AND work_order_report_id IS NULL) OR
    (work_order_id IS NULL AND work_order_report_id IS NOT NULL)
  )
);

-- 8. Email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Email logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES public.work_orders(id),
  template_used TEXT,
  recipient_email TEXT NOT NULL,
  resend_message_id TEXT,
  status public.email_status NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- 10. Email settings table
CREATE TABLE public.email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  setting_name TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. System settings table
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, setting_key)
);

-- 12. Audit logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_work_orders_work_order_number ON public.work_orders(work_order_number);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_organization_id ON public.work_orders(organization_id);
CREATE INDEX idx_work_orders_trade_id ON public.work_orders(trade_id);
CREATE INDEX idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX idx_work_order_reports_work_order_id ON public.work_order_reports(work_order_id);
CREATE INDEX idx_work_order_reports_status ON public.work_order_reports(status);
CREATE INDEX idx_work_order_attachments_work_order_id ON public.work_order_attachments(work_order_id);
CREATE INDEX idx_work_order_attachments_report_id ON public.work_order_attachments(work_order_report_id);
CREATE INDEX idx_email_logs_work_order_id ON public.email_logs(work_order_id);
CREATE INDEX idx_audit_logs_table_created ON public.audit_logs(table_name, created_at);
CREATE INDEX idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON public.user_organizations(organization_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate work order numbers
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  work_order_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::TEXT;
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN work_order_number ~ ('^WO-' || current_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(work_order_number FROM LENGTH('WO-' || current_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM public.work_orders;
  
  work_order_num := 'WO-' || current_year || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN work_order_num;
END;
$$ LANGUAGE plpgsql;

-- Insert default trades
INSERT INTO public.trades (name, description) VALUES
  ('Plumbing', 'Plumbing installation, repair, and maintenance'),
  ('HVAC', 'Heating, ventilation, and air conditioning'),
  ('Electrical', 'Electrical installation and repair'),
  ('Carpentry', 'Carpentry and woodworking'),
  ('Flooring', 'Floor installation and repair'),
  ('Painting', 'Interior and exterior painting'),
  ('Roofing', 'Roof installation and repair'),
  ('General Maintenance', 'General building maintenance and repairs');

-- Insert default email templates
INSERT INTO public.email_templates (template_name, subject, html_content, text_content) VALUES
  ('new_work_order', 'New Work Order Created - {{work_order_number}}', 
   '<h2>New Work Order: {{work_order_number}}</h2><p>A new work order has been created at {{store_location}}.</p><p><strong>Description:</strong> {{description}}</p>',
   'New Work Order: {{work_order_number}}\nLocation: {{store_location}}\nDescription: {{description}}'),
  ('work_order_assigned', 'Work Order Assigned - {{work_order_number}}', 
   '<h2>Work Order Assigned: {{work_order_number}}</h2><p>You have been assigned work order {{work_order_number}} at {{store_location}}.</p>',
   'Work Order Assigned: {{work_order_number}}\nLocation: {{store_location}}'),
  ('report_submitted', 'Work Report Submitted - {{work_order_number}}', 
   '<h2>Work Report Submitted</h2><p>A work report has been submitted for work order {{work_order_number}}.</p>',
   'Work Report Submitted for work order {{work_order_number}}'),
  ('work_order_completed', 'Work Order Completed - {{work_order_number}}', 
   '<h2>Work Order Completed</h2><p>Work order {{work_order_number}} at {{store_location}} has been completed.</p>',
   'Work Order {{work_order_number}} at {{store_location}} has been completed.');

COMMENT ON TABLE public.organizations IS 'Multi-tenant organizations (construction companies, property managers)';
COMMENT ON TABLE public.user_organizations IS 'Junction table linking users to organizations';
COMMENT ON TABLE public.trades IS 'Different construction trades and specialties';
COMMENT ON TABLE public.work_order_reports IS 'Progress reports and completion reports from subcontractors';
COMMENT ON TABLE public.work_order_attachments IS 'File attachments for work orders and reports';
COMMENT ON TABLE public.email_templates IS 'Templates for automated email notifications';
COMMENT ON TABLE public.email_logs IS 'Log of all emails sent by the system';
COMMENT ON TABLE public.email_settings IS 'Email configuration settings per organization';
COMMENT ON TABLE public.system_settings IS 'Global system configuration settings';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for all database changes';