-- Add RLS policies for admin invoice management
-- These policies are required for admins to view and manage invoices

-- Allow admins to view all invoices
CREATE POLICY "Admins can view all invoices" 
ON public.invoices 
FOR SELECT 
USING (auth_is_admin());

-- Allow admins to update all invoices (approve, reject, mark paid)
CREATE POLICY "Admins can update all invoices" 
ON public.invoices 
FOR UPDATE 
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Allow admins to view all invoice work orders
CREATE POLICY "Admins can view all invoice work orders" 
ON public.invoice_work_orders 
FOR SELECT 
USING (auth_is_admin());