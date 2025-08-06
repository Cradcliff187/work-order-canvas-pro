-- Add partner billing tracking to work_order_reports
ALTER TABLE public.work_order_reports 
ADD COLUMN partner_invoice_id UUID REFERENCES public.partner_invoices(id),
ADD COLUMN partner_billed_amount DECIMAL(10,2),
ADD COLUMN partner_billed_at TIMESTAMP WITH TIME ZONE;

-- Create partner_invoice_line_items linking table
CREATE TABLE public.partner_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_invoice_id UUID NOT NULL REFERENCES public.partner_invoices(id) ON DELETE CASCADE,
  work_order_report_id UUID NOT NULL REFERENCES public.work_order_reports(id) ON DELETE CASCADE,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on partner_invoice_line_items
ALTER TABLE public.partner_invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for partner_invoice_line_items
CREATE POLICY "admins_can_manage_partner_invoice_line_items" 
ON public.partner_invoice_line_items 
FOR ALL 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());

CREATE POLICY "partners_can_read_own_invoice_line_items" 
ON public.partner_invoice_line_items 
FOR SELECT 
USING (
  partner_invoice_id IN (
    SELECT pi.id
    FROM partner_invoices pi
    JOIN organization_members om ON pi.partner_organization_id = om.organization_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id()
    AND o.organization_type = 'partner'
  )
);

-- Create indexes for performance
CREATE INDEX idx_work_order_reports_partner_invoice_id ON public.work_order_reports(partner_invoice_id);
CREATE INDEX idx_partner_invoice_line_items_invoice_id ON public.partner_invoice_line_items(partner_invoice_id);
CREATE INDEX idx_partner_invoice_line_items_report_id ON public.partner_invoice_line_items(work_order_report_id);

-- Add unique constraint to prevent duplicate line items
CREATE UNIQUE INDEX idx_partner_invoice_line_items_unique ON public.partner_invoice_line_items(partner_invoice_id, work_order_report_id);