-- Create partner_invoices table for billing partners
CREATE TABLE public.partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_organization_id UUID NOT NULL REFERENCES public.organizations(id),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  markup_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (markup_percentage >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  quickbooks_export_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "admins_can_manage_partner_invoices" 
ON public.partner_invoices 
FOR ALL 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());

CREATE POLICY "partners_can_read_own_invoices" 
ON public.partner_invoices 
FOR SELECT 
USING (
  partner_organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id()
    AND o.organization_type = 'partner'
  )
);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_partner_invoices_updated_at
  BEFORE UPDATE ON public.partner_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_partner_invoices_organization_id ON public.partner_invoices(partner_organization_id);
CREATE INDEX idx_partner_invoices_status ON public.partner_invoices(status);
CREATE INDEX idx_partner_invoices_created_by ON public.partner_invoices(created_by);