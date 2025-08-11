
-- Allow subcontractors to manage invoice_work_orders tied to invoices
-- for subcontractor organizations they belong to.
-- RLS is already enabled on public.invoice_work_orders.

-- Safety: drop pre-existing policy with the same name if present
DROP POLICY IF EXISTS subcontractors_can_manage_own_invoice_work_orders ON public.invoice_work_orders;

CREATE POLICY subcontractors_can_manage_own_invoice_work_orders
ON public.invoice_work_orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.invoices i
    JOIN public.organization_members om ON om.organization_id = i.subcontractor_organization_id
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE i.id = invoice_work_orders.invoice_id
      AND om.user_id = public.auth_profile_id_safe()
      AND o.organization_type = 'subcontractor'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.invoices i
    JOIN public.organization_members om ON om.organization_id = i.subcontractor_organization_id
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE i.id = invoice_work_orders.invoice_id
      AND om.user_id = public.auth_profile_id_safe()
      AND o.organization_type = 'subcontractor'
  )
);

-- Note:
-- Admins retain full access via the existing policy:
--   admins_can_manage_invoice_work_orders (ALL, jwt_is_admin())
