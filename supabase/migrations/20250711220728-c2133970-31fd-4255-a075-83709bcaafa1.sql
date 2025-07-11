-- Enable RLS on tables that have policies but RLS disabled
-- This fixes Supabase linter errors for tables with defined policies but RLS not enabled

-- Enable RLS on invoices table (has 6 existing policies)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Enable RLS on invoice_work_orders table (has 2 existing policies)  
ALTER TABLE public.invoice_work_orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on partner_locations table (needs basic policies)
ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;

-- Add table comments explaining RLS purpose
COMMENT ON TABLE public.invoices IS 'Invoice management with RLS enforcing subcontractor financial privacy and organization-based access control';
COMMENT ON TABLE public.invoice_work_orders IS 'Invoice work order line items with RLS matching parent invoice permissions for data consistency';
COMMENT ON TABLE public.partner_locations IS 'Partner location management with RLS enforcing organization-based access control for multi-site partners';

-- Add basic RLS policies for partner_locations since it had no policies
-- Admins can manage all partner locations
CREATE POLICY "Admins can manage all partner locations"
ON public.partner_locations
FOR ALL
TO authenticated
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Partners can view and manage their own organization's locations
CREATE POLICY "Partners can manage their organization locations"
ON public.partner_locations
FOR ALL
TO authenticated
USING (
  auth_user_type() = 'partner' AND 
  auth_user_belongs_to_organization(organization_id)
)
WITH CHECK (
  auth_user_type() = 'partner' AND 
  auth_user_belongs_to_organization(organization_id)
);

-- Subcontractors can view partner locations they work for
CREATE POLICY "Subcontractors can view partner locations for their work orders"
ON public.partner_locations
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND
  organization_id IN (
    SELECT DISTINCT wo.organization_id
    FROM work_orders wo
    WHERE wo.assigned_to = auth_profile_id()
  )
);