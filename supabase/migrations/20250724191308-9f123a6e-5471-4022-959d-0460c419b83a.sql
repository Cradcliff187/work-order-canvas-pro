-- Add missing RLS policy for subcontractors to view work orders assigned to them or their organization
CREATE POLICY "Subcontractors can view organization work orders"
  ON public.work_orders
  FOR SELECT
  TO authenticated
  USING (
    jwt_user_type() = 'subcontractor' AND (
      assigned_to = jwt_profile_id() OR
      id IN (
        SELECT work_order_id 
        FROM auth_user_organization_assignments()
      )
    )
  );

-- Fix infinite recursion issue by adding missing SELECT policy for subcontractors on invoices
CREATE POLICY "Subcontractors can view their organization invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    jwt_user_type() = 'subcontractor' AND 
    auth_user_belongs_to_organization(subcontractor_organization_id)
  );