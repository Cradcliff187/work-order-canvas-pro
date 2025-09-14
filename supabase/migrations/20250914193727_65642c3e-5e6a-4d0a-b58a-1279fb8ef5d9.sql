-- Create partner_invoice_work_orders junction table
CREATE TABLE public.partner_invoice_work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_invoice_id UUID NOT NULL,
  work_order_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.partner_invoice_work_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for partner_invoice_work_orders
CREATE POLICY "admins_can_manage_partner_invoice_work_orders" 
ON public.partner_invoice_work_orders 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

CREATE POLICY "partners_can_read_own_invoice_work_orders" 
ON public.partner_invoice_work_orders 
FOR SELECT 
USING (partner_invoice_id IN (
  SELECT pi.id
  FROM partner_invoices pi
  JOIN organization_members om ON pi.partner_organization_id = om.organization_id
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth_profile_id() 
  AND o.organization_type = 'partner'
));

-- Add indexes for performance
CREATE INDEX idx_partner_invoice_work_orders_invoice_id ON public.partner_invoice_work_orders(partner_invoice_id);
CREATE INDEX idx_partner_invoice_work_orders_work_order_id ON public.partner_invoice_work_orders(work_order_id);

-- Add foreign key constraints
ALTER TABLE public.partner_invoice_work_orders 
ADD CONSTRAINT fk_partner_invoice_work_orders_invoice_id 
FOREIGN KEY (partner_invoice_id) REFERENCES public.partner_invoices(id) ON DELETE CASCADE;

ALTER TABLE public.partner_invoice_work_orders 
ADD CONSTRAINT fk_partner_invoice_work_orders_work_order_id 
FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;