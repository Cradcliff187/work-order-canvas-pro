-- Fix RLS policy to allow partners to see message sender profiles
DROP POLICY IF EXISTS "partners_can_select_relevant_profiles" ON public.profiles;

CREATE POLICY "partners_can_select_relevant_profiles" ON public.profiles
FOR SELECT USING (
  (jwt_user_type() = 'partner'::user_type) AND (
    -- Can see profiles in their own organization
    (id IN (
      SELECT uo.user_id 
      FROM user_organizations uo 
      WHERE auth_user_belongs_to_organization(uo.organization_id)
    )) OR
    -- Can see profiles of users assigned to their work orders
    (id IN (
      SELECT DISTINCT woa.assigned_to 
      FROM work_order_assignments woa
      JOIN work_orders wo ON wo.id = woa.work_order_id
      WHERE auth_user_belongs_to_organization(wo.organization_id)
    )) OR
    -- Can see profiles of message senders on their work orders
    (id IN (
      SELECT DISTINCT wom.sender_id
      FROM work_order_messages wom
      JOIN work_orders wo ON wo.id = wom.work_order_id
      WHERE auth_user_belongs_to_organization(wo.organization_id)
    ))
  )
);